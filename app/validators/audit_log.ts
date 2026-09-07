import vine from '@vinejs/vine'

export const auditLogFilterValidator = vine.create(
  vine.object({
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
    serverId: vine.number().optional(),
    userId: vine.number().optional(),
    category: vine
      .enum(['command', 'power', 'file', 'auth', 'server', 'backup', 'schedule', 'user'] as const)
      .optional(),
    status: vine.enum(['success', 'failed'] as const).optional(),
    search: vine.string().trim().maxLength(200).optional(),
    dateFrom: vine.string().trim().optional(),
    dateTo: vine.string().trim().optional(),
  })
)

export const logArchiveFilterValidator = vine.create(
  vine.object({
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(1000).optional(),
    search: vine.string().trim().maxLength(200).optional(),
    tail: vine.boolean().optional(),
  })
)
