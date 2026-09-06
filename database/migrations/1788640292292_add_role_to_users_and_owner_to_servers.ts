import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.string('role', 20).notNullable().defaultTo('user')
    })

    this.schema.alterTable('mc_servers', (table) => {
      table
        .integer('owner_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .nullable()
    })

    this.defer(async (db) => {
      // Set existing users to admin
      await db.from('users').update({ role: 'admin' })
    })
  }

  async down() {
    this.schema.alterTable('mc_servers', (table) => {
      table.dropColumn('owner_id')
    })

    this.schema.alterTable('users', (table) => {
      table.dropColumn('role')
    })
  }
}
