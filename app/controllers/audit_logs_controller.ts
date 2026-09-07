// import type { HttpContext } from '@adonisjs/core/http'

import AuditLogService from '#services/audit_log_service'
import { auditLogFilterValidator } from '#validators/audit_log'
import AuditLogTransformer from '#transformers/audit_log_transformer'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class AuditLogsController {
  constructor(protected auditLogService: AuditLogService) {}

  /**
   * List global audit logs across all users and servers (Admin only)
   */
  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(auditLogFilterValidator)
    const paginated = await this.auditLogService.queryLogs(filters, 'all')

    return serialize(AuditLogTransformer.paginate(paginated.all(), paginated.getMeta()))
  }
}
