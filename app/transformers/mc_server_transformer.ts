import type McServer from '#models/mc_server'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class McServerTransformer extends BaseTransformer<McServer> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'name',
      'identifier',
      'serverJar',
      'dockerImage',
      'minMemoryMb',
      'maxMemoryMb',
      'serverPort',
      'javaArgs',
      'stopTimeoutSeconds',
      'createdAt',
      'updatedAt',
    ])
  }
}
