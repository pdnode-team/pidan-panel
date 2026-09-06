import User from '#models/user'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'

export default class NewAccountController {
  async store({ request, response, serialize }: HttpContext) {
    const userCount = await User.query().count('* as total')
    const total = Number((userCount[0] as any).$extras.total)

    if (total > 0) {
      return response.forbidden({
        errors: [{ message: 'Registration is closed. Administrator already exists.' }],
      })
    }

    const { fullName, email, password } = await request.validateUsing(signupValidator)

    const user = await User.create({ fullName, email, password, role: 'admin' })
    const token = await User.accessTokens.create(user)

    return response.created(
      await serialize({
        user: UserTransformer.transform(user),
        token: token.value!.release(),
      })
    )
  }
}
