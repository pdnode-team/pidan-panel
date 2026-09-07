import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'
import McServer from '#models/mc_server'
import ServerSchedule from '#models/server_schedule'
import ServerScheduleService from '#services/server_schedule_service'
import ServerScheduleTransformer from '#transformers/server_schedule_transformer'
import {
  createServerScheduleValidator,
  updateServerScheduleValidator,
} from '#validators/server_schedule'

@inject()
export default class ServerSchedulesController {
  constructor(protected scheduleService: ServerScheduleService) {}

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
    return serialize(ServerScheduleTransformer.transform(schedule))
  }

  async destroy({ params, response }: HttpContext) {
    const schedule = await this.findOwnedSchedule(params.id, params.scheduleId)
    await schedule.delete()
    return response.noContent()
  }

  async run({ params, response, serialize }: HttpContext) {
    const schedule = await this.findOwnedSchedule(params.id, params.scheduleId)
    await this.scheduleService.executeSchedule(schedule)
    await schedule.refresh()
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
