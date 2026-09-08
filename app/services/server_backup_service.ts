import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import { createWriteStream } from 'node:fs'
import { access, cp, mkdir, readFile, rename, rm, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { basename, dirname, join, normalize, relative, resolve, sep } from 'node:path'
import { pipeline } from 'node:stream/promises'
import AdmZip from 'adm-zip'
import picomatch from 'picomatch'
import McContainerService from '#services/mc_container_service'
import McServer from '#models/mc_server'
import ServerBackup from '#models/server_backup'
import BackupOperationException from '#exceptions/backup_operation_exception'

const require = createRequire(import.meta.url)
const archiver = require('archiver') as typeof import('archiver')

const inflight = new Map<number, 'backup' | 'restore'>()

@inject()
export default class ServerBackupService {
  constructor(protected containerService: McContainerService) {}

  archivePath(server: McServer, backup: ServerBackup): string {
    return join(server.backupDirectory, backup.fileName)
  }

  isInflight(serverId: number): boolean {
    return inflight.has(serverId)
  }

  async purgeInstanceBackups(server: McServer): Promise<void> {
    inflight.delete(server.id)
    await rm(server.backupDirectory, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    }).catch(() => {})
    await ServerBackup.query().where('mcServerId', server.id).delete()
  }

  async createBackup(
    server: McServer,
    name?: string,
    excludes: string[] = []
  ): Promise<ServerBackup> {
    this.acquire(server.id, 'backup')

    const displayName = name?.trim() || DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')
    const backup = await ServerBackup.create({
      mcServerId: server.id,
      name: displayName,
      fileName: 'pending.zip',
      sizeBytes: 0,
      status: 'pending',
      errorMessage: null,
    })
    backup.fileName = `backup-${DateTime.now().toFormat('yyyyMMdd-HHmmss')}-${backup.id}.zip`
    await backup.save()

    const docker = await this.containers()
    const runtime = await docker.getContainerStatus(server)
    if (runtime.status === 'restarting') {
      throw new BackupOperationException(
        'Cannot create backup while the server is restarting. Please wait for it to finish starting or stop it.',
        409
      )
    }
    const wasRunning = runtime.status === 'running'
    let writesPaused = false

    try {
      if (wasRunning) {
        try {
          await docker.sendCommand(server, 'save-all flush')
          await this.sleep(process.env.NODE_ENV === 'test' ? 0 : 2000)
          await docker.sendCommand(server, 'save-off')
          writesPaused = true
        } catch {
          await docker.sendCommand(server, 'save-on').catch(() => {})
          throw new BackupOperationException(
            'Failed to flush world saves. Backup aborted to avoid a corrupt snapshot.',
            400
          )
        }
      }

      const { isExcluded, normalizedExcludes } = this.buildExcludeMatcher(excludes)

      const staging = app.makePath('tmp', 'backup-staging', `${server.identifier}-${backup.id}`)
      await rm(staging, { recursive: true, force: true }).catch(() => {})
      await mkdir(server.dataDirectory, { recursive: true })
      await mkdir(staging, { recursive: true })
      await cp(server.dataDirectory, staging, {
        recursive: true,
        filter: (src) => {
          const rel = relative(server.dataDirectory, src)
          return !isExcluded(rel)
        },
      })

      if (wasRunning) {
        await docker.sendCommand(server, 'save-on').catch(() => {})
        writesPaused = false
      }

      await mkdir(server.backupDirectory, { recursive: true })
      const zipPath = this.archivePath(server, backup)
      await this.zipDirectory(staging, zipPath, normalizedExcludes)
      await rm(staging, { recursive: true, force: true }).catch(() => {})

      const zipStat = await stat(zipPath)
      backup.sizeBytes = zipStat.size
      backup.status = 'ready'
      backup.errorMessage = null
      await backup.save()
      return backup
    } catch (error) {
      if (writesPaused) {
        await docker.sendCommand(server, 'save-on').catch(() => {})
      }
      backup.status = 'failed'
      backup.errorMessage = error instanceof Error ? error.message : String(error)
      await backup.save()
      await rm(this.archivePath(server, backup), { force: true }).catch(() => {})
      if (error instanceof BackupOperationException) {
        throw error
      }
      throw new BackupOperationException(backup.errorMessage, 400)
    } finally {
      this.release(server.id)
    }
  }

  async restoreBackup(server: McServer, backup: ServerBackup): Promise<void> {
    if (backup.mcServerId !== server.id) {
      throw new BackupOperationException('Backup not found.', 404)
    }
    if (backup.status !== 'ready') {
      throw new BackupOperationException('Backup is not ready to restore.', 409)
    }

    this.acquire(server.id, 'restore')

    const docker = await this.containers()
    try {
      const runtime = await docker.getContainerStatus(server)
      if (runtime.status === 'running' || runtime.status === 'restarting') {
        throw new BackupOperationException(
          'Cannot restore while the server is running. Please stop the server first.',
          409
        )
      }

      const zipPath = this.archivePath(server, backup)
      try {
        await access(zipPath)
      } catch {
        throw new BackupOperationException('Backup is not ready to restore.', 409)
      }

      // Staging must live on the SAME filesystem as the instance data:
      // rename() cannot move across devices (EXDEV), which breaks when the
      // panel runs inside a container with the data root on a bind mount.
      const staging = join(
        server.tmpDirectory,
        'restore-staging',
        `${server.identifier}-${backup.id}`
      )
      await rm(staging, { recursive: true, force: true }).catch(() => {})
      await mkdir(staging, { recursive: true })
      await this.extractZipJailed(zipPath, staging)

      const dataDir = server.dataDirectory
      const aside = `${dataDir}.pre-restore`
      await rm(aside, { recursive: true, force: true }).catch(() => {})

      let hadData = false
      try {
        await access(dataDir)
        hadData = true
      } catch {
        hadData = false
      }

      if (hadData) {
        let moved = false
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            await rename(dataDir, aside)
            moved = true
            break
          } catch (e: any) {
            if (e?.code === 'EPERM' || e?.code === 'EBUSY') {
              await this.sleep(100)
            } else {
              throw e
            }
          }
        }
        if (!moved) {
          await cp(dataDir, aside, { recursive: true, force: true })
          await rm(dataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(
            () => {}
          )
        }
      }

      try {
        await mkdir(dirname(dataDir), { recursive: true })
        await rename(staging, dataDir)
        if (hadData) {
          await rm(aside, { recursive: true, force: true }).catch(() => {})
        }
      } catch (error) {
        await rm(dataDir, { recursive: true, force: true }).catch(() => {})
        if (hadData) {
          await rename(aside, dataDir).catch(() => {})
        }
        throw error
      }
    } finally {
      this.release(server.id)
    }
  }

  async deleteBackup(server: McServer, backup: ServerBackup): Promise<void> {
    if (backup.status === 'pending') {
      throw new BackupOperationException('Cannot delete a backup that is still being created.', 409)
    }
    await rm(this.archivePath(server, backup), { force: true }).catch(() => {})
    await backup.delete()
  }

  protected acquire(serverId: number, kind: 'backup' | 'restore') {
    if (inflight.has(serverId)) {
      throw new BackupOperationException(
        'A backup or restore is already in progress for this server.',
        409
      )
    }
    inflight.set(serverId, kind)
  }

  protected release(serverId: number) {
    inflight.delete(serverId)
  }

  protected async containers(): Promise<McContainerService> {
    return app.container.make(McContainerService)
  }

  protected sleep(ms: number) {
    if (ms <= 0) {
      return Promise.resolve()
    }
    return new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
  }

  protected buildExcludeMatcher(excludes: string[] = []): {
    isExcluded: (relPath: string) => boolean
    normalizedExcludes: string[]
  } {
    const defaultExcludes = ['**/session.lock', 'session.lock']
    const combined = [...defaultExcludes, ...excludes]
    const normalized: string[] = []

    for (const raw of combined) {
      const clean = raw.trim().replace(/\\/g, '/').replace(/\/+$/, '')
      if (!clean) continue
      normalized.push(clean)
      if (!clean.includes('/')) {
        normalized.push(`**/${clean}`)
      }
      if (!clean.includes('*') && !clean.endsWith('/**')) {
        normalized.push(`${clean}/**`)
        normalized.push(`**/${clean}/**`)
      }
    }

    const matcher = picomatch(normalized, { dot: true })

    const isExcluded = (relPath: string): boolean => {
      const normalizedPath = relPath.replace(/\\/g, '/').replace(/^\/+/, '')
      if (!normalizedPath || normalizedPath === '.') {
        return false
      }
      return matcher(normalizedPath)
    }

    return { isExcluded, normalizedExcludes: normalized }
  }

  protected async zipDirectory(sourceDir: string, outPath: string, ignorePatterns: string[] = []) {
    await mkdir(dirname(outPath), { recursive: true })
    const output = createWriteStream(outPath)
    const archive = archiver('zip', { zlib: { level: 9 } })
    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') {
        throw err
      }
    })

    const done = pipeline(archive, output)
    archive.glob('**/*', {
      cwd: sourceDir,
      dot: true,
      ignore: ['**/session.lock', 'session.lock', ...ignorePatterns],
    })
    await archive.finalize()
    await done
  }

  protected async extractZipJailed(zipPath: string, destRoot: string) {
    const zipBytes = await readFile(zipPath)
    const root = resolve(destRoot)
    for (const entryName of this.listZipEntryNames(zipBytes)) {
      this.assertEntryInsideRoot(entryName, root)
    }

    const zip = new AdmZip(zipPath)
    for (const entry of zip.getEntries()) {
      const normalized = entry.entryName.replace(/\\/g, '/')
      if (basename(normalized) === 'session.lock') {
        continue
      }
      zip.extractEntryTo(entry, destRoot, true, true)
    }
  }

  /**
   * Read central-directory names from the zip bytes. AdmZip sanitizes `..`
   * on add/extract, so the jail check must look at the raw archive.
   */
  protected listZipEntryNames(buf: Buffer): string[] {
    let eocd = -1
    for (let i = buf.length - 22; i >= 0; i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) {
        eocd = i
        break
      }
    }
    if (eocd < 0) {
      throw new BackupOperationException(
        'Backup archive contains files outside the server directory.',
        400
      )
    }

    const count = buf.readUInt16LE(eocd + 10)
    let offset = buf.readUInt32LE(eocd + 16)
    const names: string[] = []
    for (let n = 0; n < count; n++) {
      if (buf.readUInt32LE(offset) !== 0x02014b50) {
        throw new BackupOperationException(
          'Backup archive contains files outside the server directory.',
          400
        )
      }
      const nameLen = buf.readUInt16LE(offset + 28)
      const extraLen = buf.readUInt16LE(offset + 30)
      const commentLen = buf.readUInt16LE(offset + 32)
      names.push(buf.subarray(offset + 46, offset + 46 + nameLen).toString('utf8'))
      offset += 46 + nameLen + extraLen + commentLen
    }
    return names
  }

  protected assertEntryInsideRoot(entryName: string, root: string) {
    const normalized = entryName.replace(/\\/g, '/')
    if (
      normalized.startsWith('/') ||
      /^[a-zA-Z]:/.test(normalized) ||
      normalized.split('/').includes('..')
    ) {
      throw new BackupOperationException(
        'Backup archive contains files outside the server directory.',
        400
      )
    }

    const dest = resolve(root, normalized)
    const normalizedRoot = normalize(root).toLowerCase()
    const normalizedDest = normalize(dest).toLowerCase()
    const prefix = normalizedRoot.endsWith(sep) ? normalizedRoot : normalizedRoot + sep
    if (normalizedDest !== normalizedRoot && !normalizedDest.startsWith(prefix)) {
      throw new BackupOperationException(
        'Backup archive contains files outside the server directory.',
        400
      )
    }
  }
}
