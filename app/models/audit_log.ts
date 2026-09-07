import { AuditLogSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import McServer from '#models/mc_server'

export type AuditCategory =
  'command' | 'power' | 'file' | 'auth' | 'server' | 'backup' | 'schedule' | 'user'

export default class AuditLog extends AuditLogSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => McServer)
  declare mcServer: BelongsTo<typeof McServer>

  get parsedDetails(): Record<string, any> | null {
    if (!this.details) return null
    try {
      return JSON.parse(this.details)
    } catch {
      return null
    }
  }

  set parsedDetails(val: Record<string, any> | null) {
    this.details = val ? JSON.stringify(val) : null
  }
}
