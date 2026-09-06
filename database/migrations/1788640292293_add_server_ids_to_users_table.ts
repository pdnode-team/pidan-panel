import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.text('server_ids').notNullable().defaultTo('[]')
    })

    this.schema.alterTable('mc_servers', (table) => {
      table.dropColumn('owner_id')
    })
  }

  async down() {
    this.schema.alterTable('mc_servers', (table) => {
      table
        .integer('owner_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .nullable()
    })

    this.schema.alterTable('users', (table) => {
      table.dropColumn('server_ids')
    })
  }
}
