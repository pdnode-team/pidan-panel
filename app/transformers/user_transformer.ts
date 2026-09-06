import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    const data = this.pick(this.resource, [
      'id',
      'fullName',
      'email',
      'role',
      'createdAt',
      'updatedAt',
      'initials',
    ])
    return {
      ...data,
      serverIds: Array.isArray(this.resource.serverIds) ? this.resource.serverIds : [],
    }
  }
}
