import vine from '@vinejs/vine'

export const createServerBackupValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
  })
)
