import { ServerScheduleSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import McServer from '#models/mc_server'

export type ScheduleAction = 'backup' | 'command' | 'restart' | 'start' | 'stop'

export interface SchedulePayload {
  command?: string
  name?: string
  excludes?: string[]
}

export default class ServerSchedule extends ServerScheduleSchema {
  @belongsTo(() => McServer)
  declare mcServer: BelongsTo<typeof McServer>

  get parsedPayload(): SchedulePayload {
    if (!this.payload) return {}
    try {
      return JSON.parse(this.payload)
    } catch {
      return {}
    }
  }

  set parsedPayload(val: SchedulePayload) {
    this.payload = JSON.stringify(val)
  }
}
