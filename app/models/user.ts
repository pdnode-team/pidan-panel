import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { type AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { column } from '@adonisjs/lucid/orm'

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  static accessTokens = DbAccessTokensProvider.forModel(User)
  declare currentAccessToken?: AccessToken

  declare role: 'admin' | 'user'

  @column({
    prepare: (val: number[] | null) => (val ? JSON.stringify(val) : '[]'),
    consume: (val: string | number[] | null) => {
      if (Array.isArray(val)) return val
      try {
        return val ? JSON.parse(val) : []
      } catch {
        return []
      }
    },
  })
  declare serverIds: number[]

  /**
   * Check whether this user is authorized to access a given server ID
   */
  hasServerAccess(serverId: number): boolean {
    if (this.role === 'admin') {
      return true
    }
    return Array.isArray(this.serverIds) && this.serverIds.includes(Number(serverId))
  }

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return `${first.slice(0, 2)}`.toUpperCase()
  }
}
