import { ServerBackupSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import McServer from '#models/mc_server'

export default class ServerBackup extends ServerBackupSchema {
  @belongsTo(() => McServer)
  declare mcServer: BelongsTo<typeof McServer>
}
