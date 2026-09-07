import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mc_servers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('auto_start_on_boot').notNullable().defaultTo(false)
      table.boolean('auto_restart_on_crash').notNullable().defaultTo(false)
      table.integer('crash_backoff_initial_seconds').notNullable().defaultTo(5)
      table.integer('crash_backoff_max_seconds').notNullable().defaultTo(300)
      table.integer('crash_max_retries').notNullable().defaultTo(5)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('auto_start_on_boot')
      table.dropColumn('auto_restart_on_crash')
      table.dropColumn('crash_backoff_initial_seconds')
      table.dropColumn('crash_backoff_max_seconds')
      table.dropColumn('crash_max_retries')
    })
  }
}
