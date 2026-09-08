import type AuditLog from '#models/audit_log'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class AuditLogTransformer extends BaseTransformer<AuditLog> {
  toObject() {
    const data = this.resource
    return {
      id: data.id,
      userId: data.userId,
      userEmail: data.userEmail,
      userFullName: data.userFullName,
      mcServerId: data.mcServerId,
      serverName: data.serverName,
      serverIdentifier: data.serverIdentifier,
      category: data.category,
      action: data.action,
      details: data.parsedDetails,
      status: data.status,
      errorMessage: data.errorMessage,
      ipAddress: data.ipAddress,
      createdAt: data.createdAt ? data.createdAt.toISO() : null,
    }
  }
}
