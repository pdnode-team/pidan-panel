import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

export default {
  types: {},
  columns: {
    server_ids: {
      tsType: 'number[]',
    },
    role: {
      tsType: "'admin' | 'user'",
    },
  },
  tables: {},
  primaryKey() {},
} satisfies SchemaRules
