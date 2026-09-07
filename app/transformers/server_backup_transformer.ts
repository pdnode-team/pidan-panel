import { BaseTransformer } from '@adonisjs/core/transformers'
import type ServerBackup from '#models/server_backup'

export default class ServerBackupTransformer extends BaseTransformer<ServerBackup> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'name',
      'fileName',
      'sizeBytes',
      'status',
      'errorMessage',
      'createdAt',
      'updatedAt',
    ])
  }
}
