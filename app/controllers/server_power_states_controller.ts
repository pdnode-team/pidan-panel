import McServer from '#models/mc_server'
import McContainerService from '#services/mc_container_service'
import ServerBackupService from '#services/server_backup_service'
import ServerWatchdogService from '#services/server_watchdog_service'
import AuditLogService from '#services/audit_log_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ServerPowerStatesController {
  constructor(
    protected containerService: McContainerService,
    protected backupService: ServerBackupService,
    protected watchdogService: ServerWatchdogService,
    protected auditLogService: AuditLogService
  ) {}

  /**
   * View live container power state and metrics
   */
  async show({ params, serialize }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    const status = await this.containerService.getContainerStatus(server)
    const autoRestart = this.watchdogService.getRestartStatus(server.id, server)
    return serialize({
      ...status,
      autoRestart,
    })
  }

  /**
   * Start server container
   */
  async store({ params, request, response, auth, serialize }: HttpContext) {
    const server = await McServer.findOrFail(params.id)

    if (this.backupService.isInflight(server.id)) {
      return response.conflict({
        errors: [
          {
            message:
              'Cannot start server container while a backup or restore operation is in progress.',
          },
        ],
      })
    }

    try {
      await this.containerService.startContainer(server)
      this.watchdogService.handleServerStarted(server, true)

      await this.auditLogService.record({
        user: auth.user,
        mcServerId: server.id,
        category: 'power',
        action: 'power.start',
        details: { port: server.serverPort },
        status: 'success',
        ipAddress: request.ip(),
      })

      return response.created(
        await serialize({
          status: 'starting',
          message: 'Server container launch initiated',
        })
      )
    } catch (error: any) {
      await this.auditLogService.record({
        user: auth.user,
        mcServerId: server.id,
        category: 'power',
        action: 'power.start',
        status: 'failed',
        errorMessage: error.message || 'Failed to start server container',
        ipAddress: request.ip(),
      })

      return response.badRequest({
        errors: [{ message: error.message || 'Failed to start server container' }],
      })
    }
  }

  /**
   * Stop or forcefully kill server container
   */
  async destroy({ params, request, response, auth }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    const forceParam = request.input('force')
    const isForce = forceParam === true || forceParam === 'true' || forceParam === '1'

    this.watchdogService.handleServerStopped(server)

    if (isForce) {
      await this.containerService.killContainer(server)
    } else {
      await this.containerService.stopContainer(server)
    }

    await this.auditLogService.record({
      user: auth.user,
      mcServerId: server.id,
      category: 'power',
      action: isForce ? 'power.kill' : 'power.stop',
      details: { force: isForce },
      status: 'success',
      ipAddress: request.ip(),
    })

    return response.noContent()
  }

  /**
   * Restart server container
   */
  async update({ params, request, response, auth, serialize }: HttpContext) {
    const server = await McServer.findOrFail(params.id)

    if (this.backupService.isInflight(server.id)) {
      return response.conflict({
        errors: [
          {
            message:
              'Cannot restart server container while a backup or restore operation is in progress.',
          },
        ],
      })
    }

    try {
      await this.containerService.restartContainer(server)
      this.watchdogService.handleServerStarted(server, true)

      await this.auditLogService.record({
        user: auth.user,
        mcServerId: server.id,
        category: 'power',
        action: 'power.restart',
        status: 'success',
        ipAddress: request.ip(),
      })

      return serialize({
        status: 'restarting',
        message: 'Server container restart initiated',
      })
    } catch (error: any) {
      await this.auditLogService.record({
        user: auth.user,
        mcServerId: server.id,
        category: 'power',
        action: 'power.restart',
        status: 'failed',
        errorMessage: error.message || 'Failed to restart server container',
        ipAddress: request.ip(),
      })

      return response.badRequest({
        errors: [{ message: error.message || 'Failed to restart server container' }],
      })
    }
  }
}
