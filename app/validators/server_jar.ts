import vine from '@vinejs/vine'

export const installServerJarValidator = vine.create(
  vine.object({
    type: vine.string().trim().toLowerCase().optional(),
    version: vine.string().trim().optional(),
    url: vine.string().trim().url().optional(),
    targetFileName: vine.string().trim().optional(),
    updateServerJar: vine.boolean().optional(),
  })
)
