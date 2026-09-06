import McServer from '#models/mc_server'
import McJarsService from '#services/mc_jars_service'
import { installServerJarValidator } from '#validators/server_jar'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ServerJarsController {
  constructor(protected mcJarsService: McJarsService) {}

  /**
   * On-demand download and install of server jar from McJars API or direct URL
   */
  async store({ params, request, response, serialize }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
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
        errors: [{ message: error.message || 'Failed to download and install server jar' }],
      })
    }
  }
}
