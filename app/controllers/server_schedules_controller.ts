import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'
import McServer from '#models/mc_server'
import ServerSchedule from '#models/server_schedule'
import ServerScheduleService from '#services/server_schedule_service'
import ServerScheduleTransformer from '#transformers/server_schedule_transformer'
import AuditLogService from '#services/audit_log_service'
import {
  createServerScheduleValidator,
  updateServerScheduleValidator,
} from '#validators/server_schedule'

@inject()
export default class ServerSchedulesController {
  constructor(
    protected scheduleService: ServerScheduleService,
    protected auditLogService: AuditLogService
  ) {}

  async index({ params, request, serialize }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    const page = request.input('page', 1)
    const perPage = Math.min(Number(request.input('perPage', 50)), 100)
    const paginator = await ServerSchedule.query()
      .where('mcServerId', server.id)
      .orderBy('id', 'desc')
      .paginate(page, perPage)
    paginator.baseUrl(request.url())

    return serialize(ServerScheduleTransformer.paginate(paginator.all(), paginator.getMeta()))
  }

  async show({ params, serialize }: HttpContext) {
    const schedule = await this.findOwnedSchedule(params.id, params.scheduleId)
    return serialize(ServerScheduleTransformer.transform(schedule))
  }

  async store({ params, request, response, serialize }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    const data = await request.validateUsing(createServerScheduleValidator)

    const schedule = await ServerSchedule.create({
      mcServerId: server.id,
      name: data.name,
      cron: data.cron,
      action: data.action,
      payload: data.payload ? JSON.stringify(data.payload) : null,
      isActive: data.isActive ?? true,
      lastRunAt: null,
      lastRunStatus: null,
      lastRunMessage: null,
    })

    await this.auditLogService.record({
      mcServer: server,
      category: 'schedule',
      action: 'schedule.create',
      details: {
        scheduleId: schedule.id,
        name: schedule.name,
        cron: schedule.cron,
        action: schedule.action,
      },
      status: 'success',
      ipAddress: request.ip(),
    })

    return response.created(await serialize(ServerScheduleTransformer.transform(schedule)))
  }

  async update({ params, request, serialize }: HttpContext) {
    const schedule = await this.findOwnedSchedule(params.id, params.scheduleId)
    const data = await request.validateUsing(updateServerScheduleValidator)

    if (data.name !== undefined) schedule.name = data.name
    if (data.cron !== undefined) schedule.cron = data.cron
    if (data.action !== undefined) schedule.action = data.action
    if (data.payload !== undefined) schedule.payload = JSON.stringify(data.payload)
    if (data.isActive !== undefined) schedule.isActive = data.isActive

    await schedule.save()

    await this.auditLogService.record({
      mcServerId: schedule.mcServerId,
      category: 'schedule',
      action: 'schedule.update',
      details: {
        scheduleId: schedule.id,
        name: schedule.name,
        cron: schedule.cron,
        action: schedule.action,
        isActive: schedule.isActive,
      },
      status: 'success',
      ipAddress: request.ip(),
    })

    return serialize(ServerScheduleTransformer.transform(schedule))
  }

  async destroy({ params, response, request }: HttpContext) {
    const schedule = await this.findOwnedSchedule(params.id, params.scheduleId)
    const scheduleInfo = {
      scheduleId: schedule.id,
      name: schedule.name,
      cron: schedule.cron,
      action: schedule.action,
    }
    const mcServerId = schedule.mcServerId
    await schedule.delete()

    await this.auditLogService.record({
      mcServerId,
      category: 'schedule',
      action: 'schedule.delete',
      details: scheduleInfo,
      status: 'success',
      ipAddress: request.ip(),
    })

    return response.noContent()
  }

  async run({ params, response, serialize, request }: HttpContext) {
    const schedule = await this.findOwnedSchedule(params.id, params.scheduleId)
    await this.scheduleService.executeSchedule(schedule)
    await schedule.refresh()

    await this.auditLogService.record({
      mcServerId: schedule.mcServerId,
      category: 'schedule',
      action: 'schedule.run',
      details: {
        scheduleId: schedule.id,
        name: schedule.name,
        cron: schedule.cron,
        action: schedule.action,
        message: schedule.lastRunMessage,
      },
      status: schedule.lastRunStatus === 'success' ? 'success' : 'failed',
      errorMessage: schedule.lastRunStatus === 'success' ? null : schedule.lastRunMessage,
      ipAddress: request.ip(),
    })

    return response.ok(await serialize(ServerScheduleTransformer.transform(schedule)))
  }

  protected async findOwnedSchedule(serverId: string | number, scheduleId: string | number) {
    const schedule = await ServerSchedule.query()
      .where('mcServerId', serverId)
      .where('id', scheduleId)
      .first()
    if (!schedule) {
      throw new Exception('Schedule not found', { status: 404 })
    }
    return schedule
  }
}
