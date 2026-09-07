import vine from '@vinejs/vine'

/**
 * Validates that an exclude pattern does not escape the jail or contain dangerous characters
 */
const safeExcludePattern = vine.createRule((value, _options, field) => {
  if (typeof value !== 'string') {
    return
  }

  // 1. Prohibit null bytes
  if (value.includes('\0')) {
    field.report('Exclude pattern must not contain null bytes', 'safeExcludePattern', field)
    return
  }

  // 2. Prohibit absolute paths (leading /, \, or Windows drive letter)
  if (value.startsWith('/') || value.startsWith('\\') || /^[a-zA-Z]:/.test(value)) {
    field.report('Exclude pattern must not be an absolute path', 'safeExcludePattern', field)
    return
  }

  // 3. Prohibit directory traversal ('..')
  const normalized = value.replace(/\\/g, '/')
  const segments = normalized.split('/')
  if (segments.includes('..') || normalized.includes('..')) {
    field.report(
      'Exclude pattern must not contain directory traversal ("..")',
      'safeExcludePattern',
      field
    )
    return
  }
})

export const createServerBackupValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
    excludes: vine
      .array(vine.string().trim().minLength(1).maxLength(120).use(safeExcludePattern()))
      .maxLength(50)
      .optional(),
  })
)
