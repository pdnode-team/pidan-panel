import McServer from '#models/mc_server'
import McContainerService from '#services/mc_container_service'
import AuditLogService from '#services/audit_log_service'
import app from '@adonisjs/core/services/app'
import { dispatchServerCommandValidator } from '#validators/server_command'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ServerCommandsController {
  constructor(
    protected containerService: McContainerService,
    protected auditLogService: AuditLogService
  ) {}

  /**
   * Dispatch console command to running container STDIN
   */
  async store({ params, request, response, auth }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    const { command } = await request.validateUsing(dispatchServerCommandValidator)

    try {
      await this.containerService.sendCommand(server, command)

      await this.auditLogService.record({
        user: auth?.user,
        mcServerId: server.id,
        category: 'command',
        action: 'command.dispatch',
        details: { command },
        status: 'success',
        ipAddress: request.ip(),
      })

      return response.noContent()
    } catch (error: any) {
      const message = app.inProduction
        ? 'Failed to dispatch command'
        : error.message || 'Failed to dispatch command'
      await this.auditLogService.record({
        user: auth?.user,
        mcServerId: server.id,
        category: 'command',
        action: 'command.dispatch',
        details: { command },
        status: 'failed',
        errorMessage: message,
        ipAddress: request.ip(),
      })

      return response.badRequest({
        errors: [{ message }],
      })
    }
  }
}
