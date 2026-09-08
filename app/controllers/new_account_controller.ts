import User from '#models/user'
import AuditLogService from '#services/audit_log_service'
import { inject } from '@adonisjs/core'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'

/**
 * Serialize first-admin creation so two parallel signups on an empty
 * users table cannot both promote to administrator (single-node SQLite).
 */
let firstAdminQueue: Promise<void> = Promise.resolve()
function enqueueFirstAdmin<T>(fn: () => Promise<T>): Promise<T> {
  const run = firstAdminQueue.then(fn)
  firstAdminQueue = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

@inject()
export default class NewAccountController {
  constructor(protected auditLogService: AuditLogService) {}

  async store({ request, response, serialize }: HttpContext) {
    const { fullName, email, password } = await request.validateUsing(signupValidator)

    const created = await enqueueFirstAdmin(async () => {
      const userCount = await User.query().count('* as total')
      const total = Number((userCount[0] as any).$extras.total)

      if (total > 0) {
        return null
      }

      const user = await User.create({ fullName, email, password, role: 'admin' })
      return user
    })

    if (!created) {
      return response.forbidden({
        errors: [{ message: 'Registration is closed. Administrator already exists.' }],
      })
    }

    const token = await User.accessTokens.create(created, ['*'], { expiresIn: '7d' })

    await this.auditLogService.record({
      user: created,
      category: 'auth',
      action: 'auth.signup',
      details: { email: created.email },
      status: 'success',
      ipAddress: request.ip(),
    })

    return response.created(
      await serialize({
        user: UserTransformer.transform(created),
        token: token.value!.release(),
      })
    )
  }
}
