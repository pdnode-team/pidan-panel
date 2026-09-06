import vine from '@vinejs/vine'

/**
 * Shared rules for email and password.
 */
const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

/**
 * Validator to use when performing self-signup
 */
export const signupValidator = vine.create({
  fullName: vine.string().nullable(),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

/**
 * Validator to use before validating user credentials
 * during login
 */
export const loginValidator = vine.create({
  email: email(),
  password: vine.string(),
})

/**
 * Validator to use when an administrator creates a new user
 */
export const createUserValidator = vine.create({
  fullName: vine.string().trim().nullable().optional(),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password(),
  role: vine.enum(['admin', 'user']).optional(),
  serverIds: vine.array(vine.number().positive()).optional(),
})

/**
 * Validator to use when an administrator updates a user
 */
export const updateUserValidator = vine.create({
  fullName: vine.string().trim().nullable().optional(),
  email: email().optional(),
  password: password().optional(),
  role: vine.enum(['admin', 'user']).optional(),
  serverIds: vine.array(vine.number().positive()).optional(),
})


