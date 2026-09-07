import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import { createRequire } from 'node:module'
import McContainerService from '#services/mc_container_service'
import ServerBackupService from '#services/server_backup_service'
import ServerWatchdogService from '#services/server_watchdog_service'
import ServerSchedule from '#models/server_schedule'

const req = createRequire(import.meta.resolve('adonisjs-scheduler'))
const cronParser = req('cron-parser')

@inject()
export default class ServerScheduleService {
  constructor(
    protected containerService: McContainerService,
    protected backupService: ServerBackupService,
    protected watchdogService: ServerWatchdogService
  ) {}

  /**
   * Check if a cron expression triggers in the minute of referenceDate
   */
  isDue(cron: string, referenceDate: Date = new Date()): boolean {
    try {
      const expr = cronParser.CronExpressionParser.parse(cron, { currentDate: referenceDate })
      const prev = expr.prev().toDate()
      return (
        prev.getFullYear() === referenceDate.getFullYear() &&
        prev.getMonth() === referenceDate.getMonth() &&
        prev.getDate() === referenceDate.getDate() &&
        prev.getHours() === referenceDate.getHours() &&
        prev.getMinutes() === referenceDate.getMinutes()
      )
    } catch {
      return false
    }
  }

  /**
   * Check if schedule already ran during the minute of referenceDate
   */
  isAlreadyRanThisMinute(schedule: ServerSchedule, referenceDate: Date = new Date()): boolean {
    if (!schedule.lastRunAt) return false
    const last = schedule.lastRunAt.toJSDate()
    return (
      last.getFullYear() === referenceDate.getFullYear() &&
      last.getMonth() === referenceDate.getMonth() &&
      last.getDate() === referenceDate.getDate() &&
      last.getHours() === referenceDate.getHours() &&
      last.getMinutes() === referenceDate.getMinutes()
    )
  }

  /**
   * Execute a single schedule immediately
   */
  async executeSchedule(schedule: ServerSchedule): Promise<{ success: boolean; message: string }> {
    await schedule.load('mcServer')
    const server = schedule.mcServer
    const payload = schedule.parsedPayload

    let success = true
    let message = ''

    try {
      switch (schedule.action) {
        case 'backup': {
          if (this.backupService.isInflight(server.id)) {
            success = false
            message = 'A backup or restore is already in progress for this server'
            break
          }
          const backup = await this.backupService.createBackup(
            server,
            payload.name,
            payload.excludes || []
          )
          message = `Backup #${backup.id} (${backup.name}) created successfully`
          break
        }

        case 'command': {
          if (!payload.command || !payload.command.trim()) {
            success = false
            message = 'Missing command in schedule payload'
            break
          }
          await this.containerService.sendCommand(server, payload.command.trim())
          message = `Command "${payload.command.trim()}" dispatched successfully`
          break
        }

        case 'restart': {
          await this.containerService.restartContainer(server)
          this.watchdogService.handleServerStarted(server, true)
          message = 'Server restart initiated successfully'
          break
        }

        case 'start': {
          await this.containerService.startContainer(server)
          this.watchdogService.handleServerStarted(server, true)
          message = 'Server started successfully'
          break
        }

        case 'stop': {
          this.watchdogService.handleServerStopped(server)
          await this.containerService.stopContainer(server)
          message = 'Server stopped successfully'
          break
        }

        default: {
          success = false
          message = `Unknown action type: ${schedule.action}`
        }
      }
    } catch (err: any) {
      success = false
      message = err?.message || 'Operation failed'
      logger.error({ err, scheduleId: schedule.id }, 'Error executing server schedule')
    }

    schedule.lastRunAt = DateTime.now()
    schedule.lastRunStatus = success ? 'success' : 'failed'
    schedule.lastRunMessage = message
    await schedule.save()

    return { success, message }
  }

  /**
   * Scan and run all pending active schedules
   */
  async runPendingSchedules(referenceDate: Date = new Date()): Promise<number> {
    const schedules = await ServerSchedule.query().where('isActive', true).preload('mcServer')

    let executedCount = 0
    for (const schedule of schedules) {
      if (
        this.isDue(schedule.cron, referenceDate) &&
        !this.isAlreadyRanThisMinute(schedule, referenceDate)
      ) {
        executedCount++
        await this.executeSchedule(schedule)
      }
    }

    return executedCount
  }
}
