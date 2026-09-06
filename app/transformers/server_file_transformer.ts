import { BaseTransformer } from '@adonisjs/core/transformers'
import type { ServerFileItem } from '#services/server_file_manager_service'

export default class ServerFileTransformer extends BaseTransformer<ServerFileItem> {
  toObject() {
    return {
      name: this.resource.name,
      path: this.resource.path,
      isDirectory: this.resource.isDirectory,
      size: this.resource.size,
      modifiedAt: this.resource.modifiedAt,
    }
  }
}
