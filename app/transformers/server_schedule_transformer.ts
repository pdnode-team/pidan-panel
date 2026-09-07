import { BaseTransformer } from '@adonisjs/core/transformers'
import type ServerSchedule from '#models/server_schedule'

export default class ServerScheduleTransformer extends BaseTransformer<ServerSchedule> {
  toObject() {
    return {
      id: this.resource.id,
      mcServerId: this.resource.mcServerId,
      name: this.resource.name,
      cron: this.resource.cron,
      action: this.resource.action,
      payload: this.resource.parsedPayload,
      isActive: this.resource.isActive,
      lastRunAt: this.resource.lastRunAt,
      lastRunStatus: this.resource.lastRunStatus,
      lastRunMessage: this.resource.lastRunMessage,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
    }
  }
}
