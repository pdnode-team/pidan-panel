import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('server_name', 255).nullable()
      table.string('server_identifier', 255).nullable()
    })

    this.defer(async (db) => {
      const rows = await db
        .from(this.tableName)
        .innerJoin('mc_servers', 'mc_servers.id', 'audit_logs.mc_server_id')
        .select(
          'audit_logs.id',
          'mc_servers.name as server_name',
          'mc_servers.identifier as server_identifier'
        )

      for (const row of rows) {
        await db.from(this.tableName).where('id', row.id).update({
          server_name: row.server_name,
          server_identifier: row.server_identifier,
        })
      }
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('server_name')
      table.dropColumn('server_identifier')
    })
  }
}
