import type McServer from '#models/mc_server'
import AdmZip from 'adm-zip'
import app from '@adonisjs/core/services/app'
import dns from 'node:dns/promises'
import { isIP } from 'node:net'
import { join, resolve, normalize, sep, basename } from 'node:path'
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
   * Reduce a requested jar file name to a bare file name so the download target
   * can never escape the server's data directory.
   */
  static sanitizeJarFileName(raw: string): string {
    const name = basename(String(raw).replace(/\\/g, '/'))
    if (!name || name === '.' || name === '..') {
      return 'server.jar'
    }
    return name
  }

  /**
   * Classify an IP address as belonging to a private, loopback, link-local,
   * or otherwise non-routable range. Used to reject SSRF-style download URLs.
   */
  static isPrivateAddress(address: string): boolean {
    const family = isIP(address)
    if (family === 4) {
      const [a, b] = address.split('.').map(Number)
      if (a === 0 || a === 10 || a === 127) return true
      if (a === 100 && b >= 64 && b <= 127) return true
      if (a === 169 && b === 254) return true
      if (a === 172 && b >= 16 && b <= 31) return true
      if (a === 192 && b === 168) return true
      return false
    }
    if (family === 6) {
      const lower = address.toLowerCase()
      if (lower === '::' || lower === '::1') return true
      if (lower.startsWith('fc') || lower.startsWith('fd')) return true
      if (
        lower.startsWith('fe8') ||
        lower.startsWith('fe9') ||
        lower.startsWith('fea') ||
        lower.startsWith('feb')
      ) {
        return true
      }
      // IPv4-mapped IPv6 (::ffff:10.0.0.1)
      const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
      if (mapped) {
        return McJarsService.isPrivateAddress(mapped[1])
      }
      return false
    }
    return true
  }

  /**
   * Validate a download URL in production: only http(s) is allowed and the
   * resolved host must not point at private, loopback, or link-local networks
   * (SSRF protection). In development/test environments the check is skipped
   * so local mock servers keep working.
   */
  private async assertDownloadableUrl(rawUrl: string): Promise<URL> {
    const url = new URL(rawUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Invalid download URL scheme: only HTTP and HTTPS are permitted.')
    }

    if (!app.inProduction) {
      return url
    }

    const host = url.hostname
    if (isIP(host.replace(/^\[|\]$/g, ''))) {
      if (McJarsService.isPrivateAddress(host.replace(/^\[|\]$/g, ''))) {
        throw new Error('Download URL points to a private network address and is not allowed.')
      }
      return url
    }

    const addresses = await dns.lookup(host, { all: true })
    if (
      addresses.length === 0 ||
      addresses.some((a) => McJarsService.isPrivateAddress(a.address))
    ) {
      throw new Error('Download URL points to a private network address and is not allowed.')
    }
    return url
  }

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
    let fileName = McJarsService.sanitizeJarFileName(
      options.targetFileName || server.serverJar || 'server.jar'
    )
    if (isZip && fileName.toLowerCase().endsWith('.zip')) {
      fileName = 'server.jar'
    }

    // Fetch the file stream, validating every hop so redirects cannot be used
    // to bypass the private-address SSRF check.
    let currentUrl = downloadUrl
    let res!: Response
    for (let hops = 0; hops <= 5; hops++) {
      await this.assertDownloadableUrl(currentUrl)
      const response = await fetch(currentUrl, {
        headers: { 'User-Agent': 'Pidan-Panel/1.0' },
        redirect: 'manual',
      })

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location')
        if (!location) {
          res = response
          break
        }
        await response.body?.cancel()
        currentUrl = new URL(location, currentUrl).toString()
        continue
      }

      res = response
      break
    }

    if (!res || !res.ok || !res.body) {
      throw new Error(`Failed to download from ${downloadUrl}: HTTP ${res?.status ?? 'unknown'}`)
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
