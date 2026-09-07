import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import McServer from '#models/mc_server'
import ServerBackup from '#models/server_backup'
import ServerBackupService from '#services/server_backup_service'
import ServerBackupTransformer from '#transformers/server_backup_transformer'
import { createServerBackupValidator } from '#validators/server_backup'
import BackupOperationException from '#exceptions/backup_operation_exception'

import AuditLogService from '#services/audit_log_service'

@inject()
export default class ServerBackupsController {
  constructor(
    protected backups: ServerBackupService,
    protected auditLogService: AuditLogService
  ) {}

  async index({ params, request, serialize }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    const page = request.input('page', 1)
    const perPage = Math.min(Number(request.input('perPage', 20)), 100)
    const paginator = await ServerBackup.query()
      .where('mcServerId', server.id)
      .orderBy('id', 'desc')
      .paginate(page, perPage)
    paginator.baseUrl(request.url())

    return serialize(ServerBackupTransformer.paginate(paginator.all(), paginator.getMeta()))
  }

  async show({ params, serialize }: HttpContext) {
    const backup = await this.findOwnedBackup(params.id, params.backupId)
    return serialize(ServerBackupTransformer.transform(backup))
  }

  async store({ params, request, response, serialize, auth }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    const payload = await request.validateUsing(createServerBackupValidator)
    const backup = await this.backups.createBackup(server, payload.name, payload.excludes)

    await this.auditLogService.record({
      user: auth?.user,
      mcServerId: server.id,
      category: 'backup',
      action: 'backup.create',
      details: { backupId: backup.id, name: backup.name },
      status: 'success',
      ipAddress: request.ip(),
    })

    return response.created(await serialize(ServerBackupTransformer.transform(backup)))
  }

  async destroy({ params, request, response, auth }: HttpContext) {
    const server = await McServer.findOrFail(params.id)
    const backup = await this.findOwnedBackup(params.id, params.backupId)
    await this.backups.deleteBackup(server, backup)

    await this.auditLogService.record({
      user: auth?.user,
      mcServerId: server.id,
      category: 'backup',
      action: 'backup.delete',
      details: { backupId: backup.id, name: backup.name },
      status: 'success',
      ipAddress: request.ip(),
    })

    return response.noContent()
  }

  protected async findOwnedBackup(serverId: string | number, backupId: string | number) {
    const backup = await ServerBackup.query()
      .where('mcServerId', serverId)
      .where('id', backupId)
      .first()
    if (!backup) {
      throw new BackupOperationException('Backup not found.', 404)
    }
    return backup
  }
}
