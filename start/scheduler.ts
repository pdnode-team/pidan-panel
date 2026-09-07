import scheduler from 'adonisjs-scheduler/services/main'
import ServerScheduleService from '#services/server_schedule_service'
import AuditLogService from '#services/audit_log_service'
import app from '@adonisjs/core/services/app'

scheduler
  .call(async () => {
    const service = await app.container.make(ServerScheduleService)
    await service.runPendingSchedules()
  })
  .everyMinute()

scheduler
  .call(async () => {
    const service = await app.container.make(AuditLogService)
    await service.pruneOldLogs(30)
  })
  .daily()
