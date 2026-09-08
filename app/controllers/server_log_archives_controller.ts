// import type { HttpContext } from '@adonisjs/core/http'

import McServer from '#models/mc_server'
import ServerLogArchiveService from '#services/server_log_archive_service'
import { logArchiveFilterValidator } from '#validators/audit_log'
import ServerLogArchiveTransformer from '#transformers/server_log_archive_transformer'
import app from '@adonisjs/core/services/app'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ServerLogArchivesController {
  constructor(protected archiveService: ServerLogArchiveService) {}

  /**
   * List all log archive files in server logs/ directory
   */
  async index({ params, auth, response, serialize }: HttpContext) {
    const user = auth.user!
    const server = await McServer.findOrFail(params.id)

    if (!user.hasServerAccess(server.id)) {
      return response.forbidden({
        errors: [{ message: 'Access denied to this server instance.' }],
      })
    }

    const archives = await this.archiveService.listArchives(server)
    return serialize(ServerLogArchiveTransformer.transform(archives))
  }

  /**
   * Stream and paginate through plain or gzipped log archive lines
   */
  async show({ params, request, auth, response, serialize }: HttpContext) {
    const user = auth.user!
    const server = await McServer.findOrFail(params.id)

    if (!user.hasServerAccess(server.id)) {
      return response.forbidden({
        errors: [{ message: 'Access denied to this server instance.' }],
      })
    }

    const options = await request.validateUsing(logArchiveFilterValidator)

    try {
      const result = await this.archiveService.readArchive(server, params.filename, options)
      return serialize(result)
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return response.notFound({
          errors: [{ message: `Log file "${params.filename}" not found.` }],
        })
      }
      return response.badRequest({
        errors: [
          {
            message: app.inProduction
              ? 'Failed to read log archive'
              : error.message || 'Failed to read log archive',
          },
        ],
      })
    }
  }

  /**
   * Download raw archive file (.log.gz or .log)
   */
  async download({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const server = await McServer.findOrFail(params.id)

    if (!user.hasServerAccess(server.id)) {
      return response.forbidden({
        errors: [{ message: 'Access denied to this server instance.' }],
      })
    }

    try {
      const { stream, size, isGzip } = await this.archiveService.getDownloadStream(
        server,
        params.filename
      )

      // Strip header-breaking characters from the user-controlled filename
      const safeFilename = params.filename.replace(/[\r\n"\\]/g, '_')

      response.header('Content-Length', size)
      response.header('Content-Type', isGzip ? 'application/gzip' : 'text/plain')
      response.header('Content-Disposition', `attachment; filename="${safeFilename}"`)

      return response.stream(stream)
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return response.notFound({
          errors: [{ message: `Log file "${params.filename}" not found.` }],
        })
      }
      return response.badRequest({
        errors: [
          {
            message: app.inProduction
              ? 'Failed to download log archive'
              : error.message || 'Failed to download log archive',
          },
        ],
      })
    }
  }
}
