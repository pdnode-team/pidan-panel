import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .nullable()
      table.string('user_email', 255).notNullable()
      table.string('user_full_name', 255).notNullable()
      table
        .integer('mc_server_id')
        .unsigned()
        .references('id')
        .inTable('mc_servers')
        .onDelete('CASCADE')
        .nullable()
      table.string('category', 50).notNullable()
      table.string('action', 100).notNullable()
      table.text('details').nullable()
      table.string('status', 20).notNullable().defaultTo('success')
      table.text('error_message').nullable()
      table.string('ip_address', 45).nullable()
      table.timestamp('created_at').notNullable()

      table.index(['mc_server_id', 'created_at'])
      table.index(['category', 'created_at'])
      table.index(['user_id', 'created_at'])
      table.index(['created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
