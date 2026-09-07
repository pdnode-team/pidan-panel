import vine from '@vinejs/vine'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.resolve('adonisjs-scheduler'))
const cronParser = req('cron-parser')

/**
 * Validates that string is a valid Cron expression
 */
const isValidCron = vine.createRule((value, _options, field) => {
  if (typeof value !== 'string') {
    return
  }

  try {
    cronParser.CronExpressionParser.parse(value.trim())
  } catch {
    field.report('The {{ field }} must be a valid cron expression', 'isValidCron', field)
  }
})

const payloadSchema = vine
  .object({
    command: vine.string().trim().minLength(1).maxLength(1000).optional(),
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
    excludes: vine.array(vine.string().trim().minLength(1).maxLength(120)).maxLength(50).optional(),
  })
  .allowUnknownProperties()
  .optional()

export const createServerScheduleValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100),
    cron: vine.string().trim().minLength(1).maxLength(100).use(isValidCron()),
    action: vine.enum(['backup', 'command', 'restart', 'start', 'stop'] as const),
    payload: payloadSchema,
    isActive: vine.boolean().optional(),
  })
)

export const updateServerScheduleValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
    cron: vine.string().trim().minLength(1).maxLength(100).use(isValidCron()).optional(),
    action: vine.enum(['backup', 'command', 'restart', 'start', 'stop'] as const).optional(),
    payload: payloadSchema,
    isActive: vine.boolean().optional(),
  })
)
