import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import McServer from '#models/mc_server'

/**
 * Ensures the authenticated user is either an admin or the designated owner of the server
 */
export default class ServerAccessMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    const serverId = ctx.params.id

    if (!user) {
      return ctx.response.unauthorized({
        errors: [{ message: 'Unauthorized access.' }],
      })
    }

    if (serverId) {
      const server = await McServer.find(serverId)
      if (!server) {
        return ctx.response.notFound({
          errors: [{ message: 'Server instance not found.' }],
        })
      }

      if (!user.hasServerAccess(Number(serverId))) {
        return ctx.response.forbidden({
          errors: [{ message: 'Access denied to this server instance.' }],
        })
      }
    }

    return next()
  }
}
