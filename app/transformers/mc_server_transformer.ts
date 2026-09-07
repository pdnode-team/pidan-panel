import type McServer from '#models/mc_server'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class McServerTransformer extends BaseTransformer<McServer> {
  toObject() {
    const data = this.resource
    return {
      ...this.pick(data, [
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
        'crashBackoffInitialSeconds',
        'crashBackoffMaxSeconds',
        'crashMaxRetries',
        'createdAt',
        'updatedAt',
      ]),
      autoStartOnBoot: Boolean(data.autoStartOnBoot),
      autoRestartOnCrash: Boolean(data.autoRestartOnCrash),
    }
  }
}
