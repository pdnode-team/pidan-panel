import McServer from '#models/mc_server'
import McContainerService from '#services/mc_container_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ServerLogsController {
  constructor(protected containerService: McContainerService) {}

  /**
   * Stream live container logs via Server-Sent Events (SSE)
   */
  async show({ params, request, response }: HttpContext) {
    const server = await McServer.findOrFail(params.id)

    // Setup SSE response headers
    response.response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    response.response.flushHeaders?.()

    // Send initial greeting
    response.response.write(`data: [Panel] Connected to log stream for "${server.name}"...\n\n`)

    const unsubscribe = await this.containerService.streamLogs(server, (line) => {
      response.response.write(`data: ${line}\n\n`)
    })

    // Handle client disconnect
    request.request.on('close', () => {
      unsubscribe()
    })
  }
}
