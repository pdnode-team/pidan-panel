import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

export default class BackupOperationException extends Exception {
  static code = 'E_BACKUP_OPERATION'

  constructor(message: string, status: number) {
    super(message, { status })
  }

  async handle(error: this, ctx: HttpContext) {
    const body = { errors: [{ message: error.message }] }
    if (error.status === 409) {
      return ctx.response.conflict(body)
    }
    if (error.status === 404) {
      return ctx.response.notFound(body)
    }
    return ctx.response.badRequest(body)
  }
}
