import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'server_schedules'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('mc_server_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('mc_servers')
        .onDelete('CASCADE')
      table.string('name', 100).notNullable()
      table.string('cron', 100).notNullable()
      table.string('action', 50).notNullable()
      table.text('payload').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('last_run_at').nullable()
      table.string('last_run_status', 20).nullable()
      table.text('last_run_message').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
