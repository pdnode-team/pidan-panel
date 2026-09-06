import vine from '@vinejs/vine'

export const dispatchServerCommandValidator = vine.create(
  vine.object({
    command: vine.string().trim().minLength(1).maxLength(1000),
  })
)
