import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import McServer from '#models/mc_server'
import ServerBackup from '#models/server_backup'
import ServerBackupService from '#services/server_backup_service'
import BackupOperationException from '#exceptions/backup_operation_exception'

@inject()
export default class ServerBackupRestorationsController {
  constructor(protected backups: ServerBackupService) {}

  async store({ params, response, serialize }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    const backup = await ServerBackup.query()
      .where('mcServerId', server.id)
      .where('id', params.backupId)
      .first()
    if (!backup) {
      throw new BackupOperationException('Backup not found.', 404)
    }

    await this.backups.restoreBackup(server, backup)
    return response.created(
      await serialize({
        status: 'restored' as const,
        backupId: backup.id,
        message: 'Backup restored successfully.',
      })
    )
  }
}
