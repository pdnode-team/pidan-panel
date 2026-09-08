import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['mc_server_id'])

      // Re-add with SET NULL so audit logs survive server deletion
      table.foreign('mc_server_id').references('id').inTable('mc_servers').onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['mc_server_id'])

      table.foreign('mc_server_id').references('id').inTable('mc_servers').onDelete('CASCADE')
    })
  }
}
