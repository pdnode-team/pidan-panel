import vine from '@vinejs/vine'

export const createMcServerValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100),
    identifier: vine
      .string()
      .trim()
      .minLength(2)
      .maxLength(50)
      .regex(/^[a-z0-9-]+$/)
      .unique({ table: 'mc_servers', column: 'identifier' }),
    serverJar: vine
      .string()
      .trim()
      .minLength(1)
      .maxLength(100)
      .regex(/^[^/\\]+$/)
      .optional(),
    dockerImage: vine.string().trim().maxLength(255).optional(),
    minMemoryMb: vine.number().min(256).max(65536).optional(),
    maxMemoryMb: vine.number().min(256).max(65536).optional(),
    serverPort: vine
      .number()
      .range([1024, 65535])
      .unique({ table: 'mc_servers', column: 'server_port' }),
    javaArgs: vine.string().trim().optional(),
    stopTimeoutSeconds: vine.number().min(5).max(300).optional(),
    autoStartOnBoot: vine.boolean().optional(),
    autoRestartOnCrash: vine.boolean().optional(),
    crashBackoffInitialSeconds: vine.number().min(1).max(60).optional(),
    crashBackoffMaxSeconds: vine.number().min(5).max(3600).optional(),
    crashMaxRetries: vine.number().min(0).max(50).optional(),
  })
)

export const updateMcServerValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
    serverJar: vine
      .string()
      .trim()
      .minLength(1)
      .maxLength(100)
      .regex(/^[^/\\]+$/)
      .optional(),
    dockerImage: vine.string().trim().maxLength(255).optional(),
    minMemoryMb: vine.number().min(256).max(65536).optional(),
    maxMemoryMb: vine.number().min(256).max(65536).optional(),
    serverPort: vine
      .number()
      .range([1024, 65535])
      .unique({
        table: 'mc_servers',
        column: 'server_port',
        filter: (db, _value, field) => {
          const meta = field.meta as { serverId?: number }
          if (meta?.serverId) {
            db.whereNot('id', meta.serverId)
          }
        },
      })
      .optional(),
    javaArgs: vine.string().trim().nullable().optional(),
    stopTimeoutSeconds: vine.number().min(5).max(300).optional(),
    autoStartOnBoot: vine.boolean().optional(),
    autoRestartOnCrash: vine.boolean().optional(),
    crashBackoffInitialSeconds: vine.number().min(1).max(60).optional(),
    crashBackoffMaxSeconds: vine.number().min(5).max(3600).optional(),
    crashMaxRetries: vine.number().min(0).max(50).optional(),
  })
)

export const deleteMcServerValidator = vine.create(
  vine.object({
    deleteFiles: vine.boolean().optional(),
  })
)
