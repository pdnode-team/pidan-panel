import User from '#models/user'
import AuditLogService from '#services/audit_log_service'
import limiter from '@adonisjs/limiter/services/main'
import { inject } from '@adonisjs/core'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'

@inject()
export default class AccessTokensController {
  constructor(protected auditLogService: AuditLogService) {}

  async store({ request, serialize }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    const normalizedEmail = email.trim().toLowerCase()
    const ip = request.ip()

    const loginLimiter = limiter.multi([
      {
        key: `login_ip_${ip}`,
        requests: 10,
        duration: '1 minute',
      },
      {
        key: `login_ip_email_${ip}_${normalizedEmail}`,
        requests: 5,
        duration: '1 minute',
        blockDuration: '20 minutes',
      },
    ])

    const [limitError, user] = await loginLimiter.penalize(async () => {
      try {
        return await User.verifyCredentials(email, password)
      } catch (error) {
        await this.auditLogService.record({
          category: 'auth',
          action: 'auth.login',
          details: { email: normalizedEmail },
          status: 'failed',
          errorMessage: 'Invalid credentials',
          ipAddress: ip,
        })
        throw error
      }
    })

    if (limitError) {
      throw limitError
    }

    const token = await User.accessTokens.create(user!, ['*'], { expiresIn: '7d' })

    await this.auditLogService.record({
      user: user!,
      category: 'auth',
      action: 'auth.login',
      details: { email: normalizedEmail },
      status: 'success',
      ipAddress: ip,
    })

    return serialize({
      user: UserTransformer.transform(user!),
      token: token.value!.release(),
    })
  }

  async destroy({ auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }

    await this.auditLogService.record({
      user,
      category: 'auth',
      action: 'auth.logout',
      status: 'success',
      ipAddress: request.ip(),
    })

    return {
      message: 'Logged out successfully',
    }
  }
}
