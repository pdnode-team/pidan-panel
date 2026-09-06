import User from '#models/user'
import UserTransformer from '#transformers/user_transformer'
import { createUserValidator, updateUserValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class UsersController {
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
    return serialize(users)
  }

  /**
   * Create a new user (Admin only)
   */
  async store({ request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(createUserValidator)
    const user = await User.create({
      fullName: payload.fullName || null,
      email: payload.email,
      password: payload.password,
      role: payload.role || 'user',
      serverIds: payload.serverIds || [],
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
  async update({ params, request, response, serialize }: HttpContext) {
    const user = await User.findOrFail(params.id)
    const payload = await request.validateUsing(updateUserValidator)

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
    }

    if (payload.fullName !== undefined) {
      user.fullName = payload.fullName || null
    }

    if (payload.password) {
      user.password = payload.password
    }

    if (payload.serverIds !== undefined) {
      user.serverIds = payload.serverIds
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
      user.role = payload.role
    }

    await user.save()
    return serialize(UserTransformer.transform(user))
  }

  /**
   * Delete a user (Admin only, with self-deletion and last-admin protections)
   */
  async destroy({ params, response, auth }: HttpContext) {
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

    await targetUser.delete()
    return response.noContent()
  }
}
