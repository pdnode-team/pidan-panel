import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import McServer from '#models/mc_server'
import ServerBackup from '#models/server_backup'
import ServerBackupService from '#services/server_backup_service'
import BackupOperationException from '#exceptions/backup_operation_exception'

@inject()
export default class ServerBackupDownloadsController {
  constructor(protected backups: ServerBackupService) {}

  async show({ params, response }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    const backup = await ServerBackup.query()
      .where('mcServerId', server.id)
      .where('id', params.backupId)
      .first()
    if (!backup) {
      throw new BackupOperationException('Backup not found.', 404)
    }
    if (backup.status !== 'ready') {
      throw new BackupOperationException('Backup is not ready to download.', 409)
    }

    const zipPath = this.backups.archivePath(server, backup)
    response.attachment(zipPath, backup.fileName)
  }
}
