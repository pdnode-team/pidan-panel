import McServer from '#models/mc_server'
import McJarsService from '#services/mc_jars_service'
import McContainerService from '#services/mc_container_service'
import ServerBackupService from '#services/server_backup_service'
import app from '@adonisjs/core/services/app'
import { installServerJarValidator } from '#validators/server_jar'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ServerJarsController {
  constructor(
    protected mcJarsService: McJarsService,
    protected containerService: McContainerService,
    protected backupService: ServerBackupService
  ) {}

  /**
   * On-demand download and install of server jar from McJars API or direct URL
   */
  async store({ params, request, response, serialize }: HttpContext) {
    const server = await McServer.findOrFail(params.id)

    const runtime = await this.containerService.getContainerStatus(server)
    if (runtime.status === 'running' || runtime.status === 'restarting') {
      return response.conflict({
        errors: [
          {
            message: `Cannot install server jar while server is ${runtime.status}. Please stop the server first.`,
          },
        ],
      })
    }

    if (this.backupService.isInflight(server.id)) {
      return response.conflict({
        errors: [
          {
            message:
              'Cannot install server jar while a backup or restore operation is in progress.',
          },
        ],
      })
    }

    const payload = await request.validateUsing(installServerJarValidator)

    try {
      const result = await this.mcJarsService.downloadAndInstall(server, payload)

      if (payload.updateServerJar !== false && server.serverJar !== result.fileName) {
        server.serverJar = result.fileName
        await server.save()
      }

      return response.created(
        await serialize({
          message: `Server jar "${result.fileName}" downloaded and installed successfully.`,
          fileName: result.fileName,
          size: result.size,
          downloadUrl: result.downloadUrl,
          serverJar: server.serverJar,
        })
      )
    } catch (error: any) {
      return response.badRequest({
        errors: [
          {
            message: app.inProduction
              ? 'Failed to download and install server jar'
              : error.message || 'Failed to download and install server jar',
          },
        ],
      })
    }
  }
}
