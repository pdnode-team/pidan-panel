import type McServer from '#models/mc_server'
import { createReadStream } from 'node:fs'
import { readdir, stat, access, mkdir } from 'node:fs/promises'
import { join, resolve, basename } from 'node:path'
import { createGunzip } from 'node:zlib'
import readline from 'node:readline'
import type { Readable } from 'node:stream'

export interface LogArchiveItem {
  fileName: string
  sizeBytes: number
  modifiedAt: string
  isCompressed: boolean
}

export interface ReadLogArchiveOptions {
  page?: number
  perPage?: number
  search?: string
  tail?: boolean
}

export interface ReadLogArchiveResult {
  fileName: string
  totalMatchedLines: number
  lines: string[]
  page: number
  perPage: number
  hasMore: boolean
}

export default class ServerLogArchiveService {
  /**
   * Resolve safe path within server logs/ directory
   */
  resolveLogFilePath(server: McServer, fileName: string): string {
    const logsDir = resolve(server.dataDirectory, 'logs')

    // Basic sanitization against path traversal
    const cleanFileName = basename(fileName)
    if (
      cleanFileName !== fileName ||
      fileName.includes('..') ||
      fileName.includes('/') ||
      fileName.includes('\\')
    ) {
      throw new Error('Access Denied: Invalid log file name.')
    }

    if (!fileName.endsWith('.log') && !fileName.endsWith('.log.gz')) {
      throw new Error('Access Denied: Only .log and .log.gz files are accessible.')
    }

    const targetPath = resolve(logsDir, fileName)
    if (!targetPath.startsWith(logsDir)) {
      throw new Error('Access Denied: Path traversal is forbidden.')
    }

    return targetPath
  }

  /**
   * List all log archive files in server logs/ directory
   */
  async listArchives(server: McServer): Promise<LogArchiveItem[]> {
    const logsDir = resolve(server.dataDirectory, 'logs')
    await mkdir(logsDir, { recursive: true })

    const entries = await readdir(logsDir, { withFileTypes: true }).catch(() => [])
    const items: LogArchiveItem[] = []

    for (const entry of entries) {
      if (!entry.isFile()) continue
      const name = entry.name
      if (!name.endsWith('.log') && !name.endsWith('.log.gz')) continue

      const filePath = join(logsDir, name)
      const fileStat = await stat(filePath).catch(() => null)
      if (!fileStat) continue

      items.push({
        fileName: name,
        sizeBytes: fileStat.size,
        modifiedAt: fileStat.mtime.toISOString(),
        isCompressed: name.endsWith('.gz'),
      })
    }

    // Sort: latest.log first, then newest timestamp first
    return items.sort((a, b) => {
      if (a.fileName === 'latest.log') return -1
      if (b.fileName === 'latest.log') return 1
      return b.modifiedAt.localeCompare(a.modifiedAt)
    })
  }

  /**
   * Stream and paginate through plain or gzipped log archive
   */
  async readArchive(
    server: McServer,
    fileName: string,
    options: ReadLogArchiveOptions = {}
  ): Promise<ReadLogArchiveResult> {
    const filePath = this.resolveLogFilePath(server, fileName)
    await access(filePath)

    const page = Math.max(1, options.page || 1)
    const perPage = Math.min(1000, Math.max(1, options.perPage || 200))
    const search = options.search?.trim().toLowerCase()
    const isTail = Boolean(options.tail)

    // Build uncompressed readable stream
    const fileStream = createReadStream(filePath)
    const lineStream: Readable = fileName.endsWith('.gz')
      ? fileStream.pipe(createGunzip())
      : fileStream

    const rl = readline.createInterface({
      input: lineStream,
      crlfDelay: Infinity,
    })

    const matchedLines: string[] = []
    let totalScanned = 0
    const maxScanLines = 50000 // Guard ceiling against excessively large files

    try {
      for await (const line of rl) {
        totalScanned++
        if (totalScanned > maxScanLines) {
          break
        }

        if (search) {
          if (!line.toLowerCase().includes(search)) {
            continue
          }
        }

        matchedLines.push(line)
      }
    } finally {
      rl.close()
      lineStream.destroy?.()
      fileStream.destroy?.()
    }

    let pagedLines: string[] = []
    let hasMore = false

    if (isTail) {
      // Return the most recent lines
      pagedLines = matchedLines.slice(-perPage)
      hasMore = matchedLines.length > perPage
    } else {
      const startIndex = (page - 1) * perPage
      pagedLines = matchedLines.slice(startIndex, startIndex + perPage)
      hasMore = matchedLines.length > startIndex + perPage
    }

    return {
      fileName,
      totalMatchedLines: matchedLines.length,
      lines: pagedLines,
      page,
      perPage,
      hasMore,
    }
  }

  /**
   * Get direct readable stream for file download
   */
  async getDownloadStream(
    server: McServer,
    fileName: string
  ): Promise<{ stream: Readable; size: number; isGzip: boolean }> {
    const filePath = this.resolveLogFilePath(server, fileName)
    const fileStat = await stat(filePath)

    return {
      stream: createReadStream(filePath),
      size: fileStat.size,
      isGzip: fileName.endsWith('.gz'),
    }
  }
}
