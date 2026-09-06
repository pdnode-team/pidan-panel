import SystemStatusService from '#services/system_status_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class SystemStatusController {
  constructor(protected systemStatusService: SystemStatusService) {}

  /**
   * Return real-time host and panel status metrics
   */
  async show({ serialize }: HttpContext) {
    const status = await this.systemStatusService.getStatus()
    return serialize(status)
  }
}
