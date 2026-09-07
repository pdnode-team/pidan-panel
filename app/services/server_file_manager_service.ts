import type McServer from '#models/mc_server'
import { resolve, dirname, normalize, sep, basename } from 'node:path'
import { readdir, stat, readFile, writeFile, rm, rename, mkdir } from 'node:fs/promises'
import type { MultipartFile } from '@adonisjs/core/bodyparser'

export interface ServerFileItem {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modifiedAt: string
}

export default class ServerFileManagerService {
  /**
   * Resolves and verifies that target path is strictly contained within the server's data directory.
   */
  resolveJailedPath(server: McServer, relativePath: string = ''): string {
    const base = resolve(server.dataDirectory)
    const target = resolve(base, relativePath || '')

    const normalizedBase = normalize(base).toLowerCase()
    const normalizedTarget = normalize(target).toLowerCase()
    const prefix = normalizedBase.endsWith(sep) ? normalizedBase : normalizedBase + sep

    if (normalizedTarget !== normalizedBase && !normalizedTarget.startsWith(prefix)) {
      throw new Error('Access Denied: Path traversal outside server directory is forbidden.')
    }

    return target
  }

  /**
   * List files and directories in relative path
   */
  async listDirectory(server: McServer, relativePath: string = ''): Promise<ServerFileItem[]> {
    const base = resolve(server.dataDirectory)
    await mkdir(base, { recursive: true })

    const targetDir = this.resolveJailedPath(server, relativePath)
    await mkdir(targetDir, { recursive: true })

    const entries = await readdir(targetDir, { withFileTypes: true })
    const items: ServerFileItem[] = []

    for (const entry of entries) {
      const entryPath = resolve(targetDir, entry.name)
      const entryStat = await stat(entryPath).catch(() => null)
      if (!entryStat) continue

      const relPath = normalize(entryPath.slice(base.length))
        .replace(/^[\\/]+/, '')
        .replace(/\\/g, '/')

      items.push({
        name: entry.name,
        path: relPath,
        isDirectory: entry.isDirectory(),
        size: entry.isDirectory() ? 0 : entryStat.size,
        modifiedAt: entryStat.mtime.toISOString(),
      })
    }

    // Sort directories first, then alphabetical
    return items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })
  }

  /**
   * Read text file contents
   */
  async readFile(
    server: McServer,
    relativePath: string
  ): Promise<{ content: string; size: number }> {
    const target = this.resolveJailedPath(server, relativePath)
    const fileStat = await stat(target).catch(() => {
      throw new Error('File not found.')
    })

    if (fileStat.isDirectory()) {
      throw new Error('Target path is a directory, not a file.')
    }

    // Protect against reading massive files into memory
    if (fileStat.size > 10 * 1024 * 1024) {
      throw new Error('File is too large to open in text editor (limit 10MB).')
    }

    const content = await readFile(target, 'utf8')
    return {
      content,
      size: fileStat.size,
    }
  }

  /**
   * Write text content to file
   */
  async writeFile(server: McServer, relativePath: string, content: string): Promise<void> {
    const target = this.resolveJailedPath(server, relativePath)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, content, 'utf8')
  }

  /**
   * Upload file into target directory
   */
  async uploadFile(
    server: McServer,
    targetRelativeDir: string = '',
    file: MultipartFile
  ): Promise<void> {
    const targetDir = this.resolveJailedPath(server, targetRelativeDir)
    await mkdir(targetDir, { recursive: true })
    const safeName = basename(file.clientName)
    await file.move(targetDir, {
      name: safeName,
      overwrite: true,
    })
  }

  /**
   * Rename or move a file/directory within the sandbox
   */
  async renameFile(server: McServer, oldPath: string, newPath: string): Promise<void> {
    const oldTarget = this.resolveJailedPath(server, oldPath)
    const newTarget = this.resolveJailedPath(server, newPath)

    await mkdir(dirname(newTarget), { recursive: true })
    await rename(oldTarget, newTarget)
  }

  /**
   * Delete file or directory
   */
  async deleteFile(server: McServer, relativePath: string): Promise<void> {
    const base = resolve(server.dataDirectory)
    const target = this.resolveJailedPath(server, relativePath)

    if (normalize(base).toLowerCase() === normalize(target).toLowerCase()) {
      throw new Error('Cannot delete the root server directory.')
    }

    await rm(target, { recursive: true, force: true })
  }
}
