import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mc_servers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('stop_timeout_seconds').notNullable().defaultTo(60)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('stop_timeout_seconds')
    })
  }
}
