import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Admin middleware ensures that the authenticated user possesses the 'admin' role.
 */
export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    if (!user || user.role !== 'admin') {
      return ctx.response.forbidden({
        errors: [{ message: 'Administrator privileges required to access this resource.' }],
      })
    }

    return next()
  }
}
