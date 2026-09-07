import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'server_backups'

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
      table.string('file_name', 255).notNullable()
      table.integer('size_bytes').notNullable().defaultTo(0)
      table.string('status', 20).notNullable()
      table.text('error_message').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
