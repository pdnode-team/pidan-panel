import AuditLog, { type AuditCategory } from '#models/audit_log'
import McServer from '#models/mc_server'
import type User from '#models/user'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

export interface RecordAuditParams {
  user?: User | null
  mcServer?: McServer | null
  mcServerId?: number | null
  category: AuditCategory
  action: string
  details?: Record<string, any> | null
  status?: 'success' | 'failed'
  errorMessage?: string | null
  ipAddress?: string | null
}

export interface AuditLogFilters {
  page?: number
  perPage?: number
  serverId?: number
  userId?: number
  category?: AuditCategory
  status?: 'success' | 'failed'
  search?: string
  dateFrom?: string
  dateTo?: string
}

export default class AuditLogService {
  /**
   * Record an audit log entry.
   * Safe execution: Catches any database error to ensure main transaction never fails due to auditing.
   */
  async record(params: RecordAuditParams): Promise<AuditLog | null> {
    try {
      const user = params.user
      const userEmail = user?.email || 'system@pidan.local'
      const userFullName = user?.fullName || 'System'
      const userId = user?.id ?? null

      const server = params.mcServer ?? null
      let mcServerId = server?.id ?? params.mcServerId ?? null
      let serverName = server?.name ?? null
      let serverIdentifier = server?.identifier ?? null

      if (mcServerId !== null && server === null) {
        const found = await McServer.find(mcServerId)
        serverName = found?.name ?? null
        serverIdentifier = found?.identifier ?? null
      }

      const log = await AuditLog.create({
        userId,
        userEmail,
        userFullName,
        mcServerId,
        serverName,
        serverIdentifier,
        category: params.category,
        action: params.action,
        details: params.details ? JSON.stringify(params.details) : null,
        status: params.status || 'success',
        errorMessage: params.errorMessage ?? null,
        ipAddress: params.ipAddress ?? null,
        createdAt: DateTime.now(),
      })

      return log
    } catch (err: any) {
      logger.error(`[AuditLogService] Failed to record audit log: ${err.message}`)
      return null
    }
  }

  /**
   * Query audit logs with pagination, filtering, and access scoping
   */
  async queryLogs(filters: AuditLogFilters, allowedServerIds: number[] | 'all' = 'all') {
    const page = filters.page || 1
    const perPage = filters.perPage || 20

    const query = AuditLog.query().orderBy('created_at', 'desc')

    // Scope to allowed servers if not super admin
    if (allowedServerIds !== 'all') {
      query.whereIn('mc_server_id', allowedServerIds)
    }

    if (filters.serverId) {
      query.where('mc_server_id', filters.serverId)
    }

    if (filters.userId) {
      query.where('user_id', filters.userId)
    }

    if (filters.category) {
      query.where('category', filters.category)
    }

    if (filters.status) {
      query.where('status', filters.status)
    }

    if (filters.search) {
      const term = `%${filters.search.toLowerCase()}%`
      query.where((sub) => {
        sub
          .whereILike('action', term)
          .orWhereILike('details', term)
          .orWhereILike('user_email', term)
          .orWhereILike('user_full_name', term)
          .orWhereILike('server_name', term)
          .orWhereILike('server_identifier', term)
          .orWhereILike('error_message', term)
      })
    }

    if (filters.dateFrom) {
      const from = DateTime.fromISO(filters.dateFrom)
      if (from.isValid) {
        query.where('created_at', '>=', from.toSQL()!)
      }
    }

    if (filters.dateTo) {
      const to = DateTime.fromISO(filters.dateTo)
      if (to.isValid) {
        query.where('created_at', '<=', to.toSQL()!)
      }
    }

    return query.paginate(page, perPage)
  }

  /**
   * Prune audit logs older than retentionDays (default: 30 days).
   * Security-sensitive categories (auth, user) are retained for 90 days.
   * Returns count of pruned records.
   */
  async pruneOldLogs(retentionDays = 30): Promise<number> {
    try {
      const generalCutoff = DateTime.now().minus({ days: retentionDays }).toSQL()!
      const securityCutoff = DateTime.now()
        .minus({ days: retentionDays + 60 })
        .toSQL()!

      const generalDeleted = await AuditLog.query()
        .where('created_at', '<', generalCutoff)
        .whereNotIn('category', ['auth', 'user'])
        .delete()

      const securityDeleted = await AuditLog.query()
        .where('created_at', '<', securityCutoff)
        .whereIn('category', ['auth', 'user'])
        .delete()

      const toCount = (deleted: unknown) =>
        Array.isArray(deleted) ? deleted.length : Number(deleted)
      const total = toCount(generalDeleted) + toCount(securityDeleted)
      logger.info(
        `[AuditLogService] Pruned ${total} expired audit logs (general < ${retentionDays}d, security < ${retentionDays + 60}d).`
      )
      return total
    } catch (err: any) {
      logger.error(`[AuditLogService] Failed to prune audit logs: ${err.message}`)
      return 0
    }
  }
}
