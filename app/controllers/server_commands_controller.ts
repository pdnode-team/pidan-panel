import McServer from '#models/mc_server'
import McContainerService from '#services/mc_container_service'
import { dispatchServerCommandValidator } from '#validators/server_command'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ServerCommandsController {
  constructor(protected containerService: McContainerService) {}

  /**
   * Dispatch console command to running container STDIN
   */
  async store({ params, request, response }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    const { command } = await request.validateUsing(dispatchServerCommandValidator)

    try {
      await this.containerService.sendCommand(server, command)
      return response.noContent()
    } catch (error: any) {
      return response.badRequest({
        errors: [{ message: error.message || 'Failed to dispatch command' }],
      })
    }
  }
}
