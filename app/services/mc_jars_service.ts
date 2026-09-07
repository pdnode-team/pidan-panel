import type McServer from '#models/mc_server'
import AdmZip from 'adm-zip'
import { join, resolve, normalize, sep } from 'node:path'
import { createWriteStream } from 'node:fs'
import { mkdir, rename, unlink } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

export interface McJarTypeInfo {
  name: string
  icon?: string
  description?: string
  builds: number
  deprecated: boolean
  experimental: boolean
}

export interface McJarVersionInfo {
  version: string
  type: string
  java: number
  supported: boolean
  jarUrl: string
  jarSize: number
  buildNumber: number
  zipUrl?: string
  isZip: boolean
}

export default class McJarsService {
  protected baseUrl = 'https://versions.mcjars.app/api/v1'

  /**
   * Fetch all supported server types/platforms (Paper, Vanilla, Purpur, Fabric, etc.)
   */
  async getTypes(): Promise<Record<string, McJarTypeInfo>> {
    const res = await fetch(`${this.baseUrl}/types`, {
      headers: { 'User-Agent': 'Pidan-Panel/1.0' },
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch MCJars types: HTTP ${res.status}`)
    }

    const data = (await res.json()) as any
    if (!data.success || !data.types) {
      throw new Error('MCJars API returned unsuccessful response for types')
    }

    const result: Record<string, McJarTypeInfo> = {}
    for (const [key, val] of Object.entries(data.types as Record<string, any>)) {
      result[key.toLowerCase()] = {
        name: val.name,
        icon: val.icon,
        description: val.description,
        builds: val.builds,
        deprecated: val.deprecated,
        experimental: val.experimental,
      }
    }

    return result
  }

  /**
   * Fetch all versions and latest builds for a specific type (e.g. paper, vanilla, purpur, forge, neoforge)
   */
  async getVersions(type: string): Promise<Record<string, McJarVersionInfo>> {
    const cleanType = type.toLowerCase().trim()
    const res = await fetch(`${this.baseUrl}/builds/${cleanType}`, {
      headers: { 'User-Agent': 'Pidan-Panel/1.0' },
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch builds for type "${cleanType}": HTTP ${res.status}`)
    }

    const data = (await res.json()) as any
    if (!data.success || !data.versions) {
      throw new Error(`MCJars API returned unsuccessful response for type "${cleanType}"`)
    }

    const versions: Record<string, McJarVersionInfo> = {}
    for (const [ver, val] of Object.entries(data.versions as Record<string, any>)) {
      const downloadUrl = val?.latest?.jarUrl || val?.latest?.zipUrl
      if (downloadUrl) {
        const isZip =
          downloadUrl.toLowerCase().split('?')[0].endsWith('.zip') || !val?.latest?.jarUrl
        versions[ver] = {
          version: ver,
          type: val.type,
          java: val.java,
          supported: val.supported,
          jarUrl: downloadUrl,
          jarSize: (val.latest.jarSize ?? val.latest.zipSize) || 0,
          buildNumber: val.latest.buildNumber,
          zipUrl: val.latest.zipUrl || undefined,
          isZip,
        }
      }
    }

    return versions
  }

  /**
   * Download a jar or zip bundle from MCJars or direct URL and save to server data directory
   */
  async downloadAndInstall(
    server: McServer,
    options: {
      type?: string
      version?: string
      url?: string
      targetFileName?: string
    }
  ): Promise<{ fileName: string; size: number; downloadUrl: string }> {
    let downloadUrl = options.url

    if (!downloadUrl) {
      if (!options.type || !options.version) {
        throw new Error('Either "url" or both "type" and "version" must be provided.')
      }

      const versions = await this.getVersions(options.type)
      const targetVersion = versions[options.version]

      if (!targetVersion) {
        throw new Error(
          `Version "${options.version}" not found for type "${options.type}". Please query /api/v1/mcjars/types/${options.type} for available versions.`
        )
      }

      downloadUrl = targetVersion.jarUrl
    }

    if (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
      throw new Error('Invalid download URL scheme: only HTTP and HTTPS are permitted.')
    }

    // Ensure server data directory exists
    await mkdir(server.dataDirectory, { recursive: true })

    const isZip = downloadUrl.toLowerCase().split('?')[0].endsWith('.zip')
    let fileName = options.targetFileName || server.serverJar || 'server.jar'
    if (isZip && fileName.toLowerCase().endsWith('.zip')) {
      fileName = 'server.jar'
    }

    // Fetch the file stream
    const res = await fetch(downloadUrl, {
      headers: { 'User-Agent': 'Pidan-Panel/1.0' },
    })

    if (!res.ok || !res.body) {
      throw new Error(`Failed to download from ${downloadUrl}: HTTP ${res.status}`)
    }

    const totalSize = Number(res.headers.get('content-length') || 0)

    if (isZip) {
      const tempZipPath = join(server.dataDirectory, `server_package_${Date.now()}.zip`)
      const nodeStream = Readable.fromWeb(res.body as any)
      const writeStream = createWriteStream(tempZipPath)

      try {
        await pipeline(nodeStream, writeStream)

        // Decompress zip archive directly into server data directory with overwrite: true
        const zip = new AdmZip(tempZipPath)

        // Zip slip protection: verify all entries stay inside dataDirectory
        const destRoot = resolve(server.dataDirectory)
        const normalizedRoot = normalize(destRoot).toLowerCase()
        const prefix = normalizedRoot.endsWith(sep) ? normalizedRoot : normalizedRoot + sep

        for (const entry of zip.getEntries()) {
          const normalizedEntry = entry.entryName.replace(/\\/g, '/')
          if (
            normalizedEntry.startsWith('/') ||
            /^[a-zA-Z]:/.test(normalizedEntry) ||
            normalizedEntry.split('/').includes('..')
          ) {
            throw new Error(
              'Corrupted or malicious zip archive: entries cannot escape server directory.'
            )
          }

          const dest = resolve(destRoot, normalizedEntry)
          const normalizedDest = normalize(dest).toLowerCase()
          if (normalizedDest !== normalizedRoot && !normalizedDest.startsWith(prefix)) {
            throw new Error(
              'Corrupted or malicious zip archive: entries cannot escape server directory.'
            )
          }
        }

        await new Promise<void>((resolveExtract, rejectExtract) => {
          zip.extractAllToAsync(server.dataDirectory, true, false, (err) => {
            if (err) {
              rejectExtract(err)
            } else {
              resolveExtract()
            }
          })
        })
      } finally {
        await unlink(tempZipPath).catch(() => {})
      }

      return {
        fileName,
        size: totalSize,
        downloadUrl,
      }
    } else {
      const finalPath = join(server.dataDirectory, fileName)
      const tempPath = join(server.dataDirectory, `${fileName}.downloading`)

      const nodeStream = Readable.fromWeb(res.body as any)
      const writeStream = createWriteStream(tempPath)

      try {
        await pipeline(nodeStream, writeStream)
        await rename(tempPath, finalPath)
      } catch (err) {
        await unlink(tempPath).catch(() => {})
        throw err
      }

      return {
        fileName,
        size: totalSize,
        downloadUrl,
      }
    }
  }
}
