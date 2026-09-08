import User from '#models/user'
import UserTransformer from '#transformers/user_transformer'
import AuditLogService from '#services/audit_log_service'
import { createUserValidator, updateUserValidator } from '#validators/user'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class UsersController {
  constructor(protected auditLogService: AuditLogService) {}

  /**
   * List users with pagination and optional search
   */
  async index({ request, serialize }: HttpContext) {
    const page = request.input('page', 1)
    const perPage = Math.min(Number(request.input('perPage', 20)), 100)
    const search = request.input('search', '')?.trim()

    const query = User.query().orderBy('id', 'desc')
    if (search) {
      query.where((q) => {
        q.whereILike('email', `%${search}%`).orWhereILike('full_name', `%${search}%`)
      })
    }

    const users = await query.paginate(page, perPage)
    return serialize(UserTransformer.paginate(users.all(), users.getMeta()))
  }

  /**
   * Create a new user (Admin only)
   */
  async store({ request, response, serialize, auth }: HttpContext) {
    const payload = await request.validateUsing(createUserValidator)
    const user = await User.create({
      fullName: payload.fullName || null,
      email: payload.email,
      password: payload.password,
      role: payload.role || 'user',
      serverIds: payload.serverIds || [],
    })

    await this.auditLogService.record({
      user: auth.user!,
      category: 'user',
      action: 'user.create',
      details: { email: user.email, role: user.role, targetUserId: user.id },
      status: 'success',
      ipAddress: request.ip(),
    })

    return response.created(await serialize(UserTransformer.transform(user)))
  }

  /**
   * Show a single user
   */
  async show({ params, serialize }: HttpContext) {
    const user = await User.findOrFail(params.id)
    return serialize(UserTransformer.transform(user))
  }

  /**
   * Update a user (Admin only)
   */
  async update({ params, request, response, serialize, auth }: HttpContext) {
    const user = await User.findOrFail(params.id)
    const payload = await request.validateUsing(updateUserValidator)

    const changes: Record<string, unknown> = {}

    if (payload.email && payload.email !== user.email) {
      const existing = await User.query()
        .where('email', payload.email)
        .whereNot('id', user.id)
        .first()
      if (existing) {
        return response.badRequest({
          errors: [{ message: 'Email is already in use by another user.' }],
        })
      }
      user.email = payload.email
      changes.email = payload.email
    }

    if (payload.fullName !== undefined) {
      user.fullName = payload.fullName || null
      changes.fullName = payload.fullName || null
    }

    if (payload.password) {
      user.password = payload.password
      changes.passwordChanged = true
    }

    if (payload.serverIds !== undefined) {
      user.serverIds = payload.serverIds
      changes.serverIds = payload.serverIds
    }

    if (payload.role && payload.role !== user.role) {
      if (user.role === 'admin' && payload.role === 'user') {
        const adminCountResult = await User.query().where('role', 'admin').count('* as total')
        const adminCount = Number((adminCountResult[0] as any).$extras.total)
        if (adminCount <= 1) {
          return response.badRequest({
            errors: [{ message: 'Cannot demote the last remaining administrator.' }],
          })
        }
      }
      changes.previousRole = user.role
      changes.role = payload.role
      user.role = payload.role
    }

    await user.save()

    // Revoke all access tokens when the password changed so stolen
    // credentials/tokens cannot keep working after a reset.
    if (changes.passwordChanged) {
      await User.accessTokens.deleteAll(user)
    }

    await this.auditLogService.record({
      user: auth.user!,
      category: 'user',
      action: 'user.update',
      details: { targetUserId: user.id, email: user.email, changes },
      status: 'success',
      ipAddress: request.ip(),
    })

    return serialize(UserTransformer.transform(user))
  }

  /**
   * Delete a user (Admin only, with self-deletion and last-admin protections)
   */
  async destroy({ params, response, auth, request }: HttpContext) {
    const currentUser = auth.user!
    const targetUser = await User.findOrFail(params.id)

    // 1. Prevent self-deletion
    if (targetUser.id === currentUser.id) {
      return response.badRequest({
        errors: [{ message: 'You cannot delete your own account.' }],
      })
    }

    // 2. Prevent deleting the last remaining admin
    if (targetUser.role === 'admin') {
      const adminCountResult = await User.query().where('role', 'admin').count('* as total')
      const adminCount = Number((adminCountResult[0] as any).$extras.total)
      if (adminCount <= 1) {
        return response.badRequest({
          errors: [{ message: 'Cannot delete the last remaining administrator.' }],
        })
      }
    }

    const targetEmail = targetUser.email
    const targetRole = targetUser.role
    await targetUser.delete()
    await User.accessTokens.deleteAll(targetUser)

    await this.auditLogService.record({
      user: currentUser,
      category: 'user',
      action: 'user.delete',
      details: { targetUserId: targetUser.id, email: targetEmail, role: targetRole },
      status: 'success',
      ipAddress: request.ip(),
    })

    return response.noContent()
  }
}
