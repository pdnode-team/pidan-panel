import vine from '@vinejs/vine'

export const saveServerFileValidator = vine.create(
  vine.object({
    path: vine.string().trim().minLength(1),
    content: vine.string(),
  })
)

export const uploadServerFileValidator = vine.create(
  vine.object({
    path: vine.string().trim().optional(),
    file: vine.file({
      size: '500mb',
    }),
  })
)

export const renameServerFileValidator = vine.create(
  vine.object({
    oldPath: vine.string().trim().minLength(1),
    newPath: vine.string().trim().minLength(1),
  })
)
