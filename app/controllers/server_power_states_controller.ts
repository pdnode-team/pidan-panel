import McServer from '#models/mc_server'
import McContainerService from '#services/mc_container_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ServerPowerStatesController {
  constructor(protected containerService: McContainerService) {}

  /**
   * View live container power state and metrics
   */
  async show({ params, serialize }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    const status = await this.containerService.getContainerStatus(server)
    return serialize(status)
  }

  /**
   * Start server container
   */
  async store({ params, response, serialize }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    try {
      await this.containerService.startContainer(server)
      return response.created(
        await serialize({
          status: 'starting',
          message: 'Server container launch initiated',
        })
      )
    } catch (error: any) {
      return response.badRequest({
        errors: [{ message: error.message || 'Failed to start server container' }],
      })
    }
  }

  /**
   * Stop or forcefully kill server container
   */
  async destroy({ params, request, response }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    const forceParam = request.input('force')
    const isForce = forceParam === true || forceParam === 'true' || forceParam === '1'

    if (isForce) {
      await this.containerService.killContainer(server)
    } else {
      await this.containerService.stopContainer(server)
    }

    return response.noContent()
  }

  /**
   * Restart server container
   */
  async update({ params, response, serialize }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    try {
      await this.containerService.restartContainer(server)
      return serialize({
        status: 'restarting',
        message: 'Server container restart initiated',
      })
    } catch (error: any) {
      return response.badRequest({
        errors: [{ message: error.message || 'Failed to restart server container' }],
      })
    }
  }
}
