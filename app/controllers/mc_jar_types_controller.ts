import McJarsService from '#services/mc_jars_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class McJarTypesController {
  constructor(protected mcJarsService: McJarsService) {}

  /**
   * List all supported server software types from McJars API
   */
  async index({ serialize }: HttpContext) {
    const types = await this.mcJarsService.getTypes()
    return serialize(types)
  }

  /**
   * List all versions and builds for a specific software type (e.g. paper, purpur, vanilla)
   */
  async show({ params, serialize }: HttpContext) {
    const versions = await this.mcJarsService.getVersions(params.type)
    return serialize(versions)
  }
}
