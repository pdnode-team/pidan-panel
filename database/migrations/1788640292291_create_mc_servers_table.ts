import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mc_servers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name', 100).notNullable()
      table.string('identifier', 50).notNullable().unique()
      table.string('server_jar', 100).notNullable().defaultTo('server.jar')
      table.string('docker_image', 255).notNullable().defaultTo('eclipse-temurin:21-jre')
      table.integer('min_memory_mb').notNullable().defaultTo(1024)
      table.integer('max_memory_mb').notNullable().defaultTo(2048)
      table.integer('server_port').notNullable().unique()
      table.text('java_args').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
