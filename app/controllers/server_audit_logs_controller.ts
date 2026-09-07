// import type { HttpContext } from '@adonisjs/core/http'

import McServer from '#models/mc_server'
import AuditLogService from '#services/audit_log_service'
import { auditLogFilterValidator } from '#validators/audit_log'
import AuditLogTransformer from '#transformers/audit_log_transformer'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ServerAuditLogsController {
  constructor(protected auditLogService: AuditLogService) {}

  /**
   * List audit logs for a single server instance (Admin or authorized user)
   */
  async index({ params, request, auth, response, serialize }: HttpContext) {
    const user = auth.user!
    const server = await McServer.findOrFail(params.id)

    if (!user.hasServerAccess(server.id)) {
      return response.forbidden({
        errors: [{ message: 'Access denied to this server instance.' }],
      })
    }

    const filters = await request.validateUsing(auditLogFilterValidator)
    const paginated = await this.auditLogService.queryLogs({ ...filters, serverId: server.id }, [
      server.id,
    ])

    return serialize(AuditLogTransformer.paginate(paginated.all(), paginated.getMeta()))
  }
}
