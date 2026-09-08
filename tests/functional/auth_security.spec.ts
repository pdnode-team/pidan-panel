import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'

test.group('Auth Security', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('failed logins are throttled per IP and email', async ({ client }) => {
    await User.create({
      fullName: 'Login Target',
      email: 'target@pidan.local',
      password: 'password123',
    })

    // 5 failed attempts exhaust the per IP+email counter
    for (let i = 0; i < 5; i++) {
      const res = await client
        .post('/api/v1/auth/login')
        .json({ email: 'target@pidan.local', password: 'wrong-password' })
      res.assertStatus(400)
    }

    // 6th attempt is blocked before credentials are checked
    const blocked = await client
      .post('/api/v1/auth/login')
      .json({ email: 'target@pidan.local', password: 'wrong-password' })
    blocked.assertStatus(429)

    // Even valid credentials stay blocked inside the block window
    const blockedValid = await client
      .post('/api/v1/auth/login')
      .json({ email: 'target@pidan.local', password: 'password123' })
    blockedValid.assertStatus(429)
  })

  test('parallel first signups produce exactly one administrator', async ({ client, assert }) => {
    const [resA, resB] = await Promise.all([
      client.post('/api/v1/auth/signup').json({
        fullName: 'Admin A',
        email: 'admin-a@pidan.local',
        password: 'password123',
        passwordConfirmation: 'password123',
      }),
      client.post('/api/v1/auth/signup').json({
        fullName: 'Admin B',
        email: 'admin-b@pidan.local',
        password: 'password123',
        passwordConfirmation: 'password123',
      }),
    ])

    const statuses = [resA.status(), resB.status()].sort()
    assert.deepEqual(statuses, [201, 403])

    const admins = await User.query().where('role', 'admin')
    assert.lengthOf(admins, 1)
  })

  test('signup endpoint is throttled after repeated attempts', async ({ client, assert }) => {
    // 1st signup succeeds, 2nd-5th are rejected as closed, 6th is rate limited
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) {
      const res = await client.post('/api/v1/auth/signup').json({
        fullName: `Admin ${i}`,
        email: `admin-throttle-${i}@pidan.local`,
        password: 'password123',
        passwordConfirmation: 'password123',
      })
      statuses.push(res.status())
    }

    assert.equal(statuses[0], 201)
    assert.deepEqual(statuses.slice(1, 5), [403, 403, 403, 403])
    assert.equal(statuses[5], 429)
  })

  test('changing a user password revokes all their access tokens', async ({ client, assert }) => {
    const admin = await User.create({
      fullName: 'Token Admin',
      email: 'token-admin@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const target = await User.create({
      fullName: 'Token Target',
      email: 'token-target@pidan.local',
      password: 'password123',
      role: 'user',
    })

    await User.accessTokens.create(target)
    assert.lengthOf(await User.accessTokens.all(target), 1)

    const updateRes = await client
      .patch(`/api/v1/users/${target.id}`)
      .loginAs(admin)
      .json({ password: 'new-password-456' })
    updateRes.assertStatus(200)

    assert.lengthOf(await User.accessTokens.all(target), 0)
  })
})
