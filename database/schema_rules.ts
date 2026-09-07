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
  tables: {
    server_backups: {
      columns: {
        status: {
          tsType: "'pending' | 'ready' | 'failed'",
        },
      },
    },
  },
  primaryKey() {},
} satisfies SchemaRules
