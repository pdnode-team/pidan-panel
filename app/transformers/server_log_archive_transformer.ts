import { BaseTransformer } from '@adonisjs/core/transformers'
import type { LogArchiveItem } from '#services/server_log_archive_service'

export default class ServerLogArchiveTransformer extends BaseTransformer<LogArchiveItem> {
  toObject() {
    return {
      fileName: this.resource.fileName,
      sizeBytes: this.resource.sizeBytes,
      modifiedAt: this.resource.modifiedAt,
      isCompressed: this.resource.isCompressed,
    }
  }
}
