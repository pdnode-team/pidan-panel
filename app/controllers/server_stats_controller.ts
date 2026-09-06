import McServer from '#models/mc_server'
import McContainerService from '#services/mc_container_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ServerStatsController {
  constructor(protected containerService: McContainerService) {}

  /**
   * View live container hardware metrics snapshot or SSE stream
   */
  async show({ params, request, response, serialize }: HttpContext) {
    const server = await McServer.findOrFail(params.id)

    const isStream =
      request.input('stream') === 'true' ||
      request.input('stream') === true ||
      request.header('accept')?.includes('text/event-stream')

    if (isStream) {
      response.response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      })
      response.response.flushHeaders?.()

      const unsubscribe = await this.containerService.streamContainerStats(server, (stats) => {
        response.response.write(`data: ${JSON.stringify(stats)}\n\n`)
      })

      request.request.on('close', () => {
        unsubscribe()
      })
      return
    }

    const stats = await this.containerService.getContainerStats(server)
    return serialize(stats)
  }
}
