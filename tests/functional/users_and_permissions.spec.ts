import { test } from '@japa/runner'
import User from '#models/user'
import McServer from '#models/mc_server'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'

test.group('Users & Instance Assignment Permissions', (group) => {
  group.each.setup(async () => {
    // Clean up created test servers
    const servers = await McServer.all()
    for (const s of servers) {
      await rm(join(process.cwd(), 'data', 'servers', s.identifier), {
        recursive: true,
        force: true,
      }).catch(() => {})
      await s.delete().catch(() => {})
    }
  })

  test('User Management: RBAC controls, CRUD and safety protections', async ({
    client,
    assert,
  }) => {
    // 1. Create one admin and one regular user
    const admin = await User.create({
      fullName: 'Super Admin',
      email: 'admin@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const regularUser = await User.create({
      fullName: 'Regular Player',
      email: 'player@pidan.local',
      password: 'password123',
      role: 'user',
    })

    // 2. Regular user is forbidden from user management
    const forbiddenRes = await client.get('/api/v1/users').loginAs(regularUser)
    forbiddenRes.assertStatus(403)

    // 3. Admin can list users
    const listRes = await client.get('/api/v1/users').loginAs(admin)
    listRes.assertStatus(200)
    const listData = listRes.body() as any
    assert.isDefined(listData.data)
    assert.isAtLeast(listData.data.length, 2)

    // 4. Admin can create a new user with serverIds
    const createRes = await client
      .post('/api/v1/users')
      .loginAs(admin)
      .json({
        fullName: 'New User',
        email: 'newuser@pidan.local',
        password: 'password123',
        role: 'user',
        serverIds: [100, 200],
      })
    createRes.assertStatus(201)
    const newUser = (createRes.body() as any).data
    assert.equal(newUser.email, 'newuser@pidan.local')
    assert.equal(newUser.role, 'user')
    assert.deepEqual(newUser.serverIds, [100, 200])

    // 5. Admin can update user's name and serverIds
    const updateRes = await client
      .patch(`/api/v1/users/${newUser.id}`)
      .loginAs(admin)
      .json({
        fullName: 'Updated Name',
        serverIds: [300],
      })
    updateRes.assertStatus(200)
    assert.equal((updateRes.body() as any).data.fullName, 'Updated Name')
    assert.deepEqual((updateRes.body() as any).data.serverIds, [300])

    // 6. Admin cannot delete self (Self-deletion protection)
    const selfDeleteRes = await client.delete(`/api/v1/users/${admin.id}`).loginAs(admin)
    selfDeleteRes.assertStatus(400)

    // 7. Admin cannot delete last admin
    const lastAdminDeleteRes = await client.delete(`/api/v1/users/${admin.id}`).loginAs(admin)
    lastAdminDeleteRes.assertStatus(400)

    // 8. Admin can delete a regular user
    const deleteUserRes = await client.delete(`/api/v1/users/${newUser.id}`).loginAs(admin)
    deleteUserRes.assertStatus(204)
  })

  test('Instance Assignment (Many-to-Many): Authorized via user.serverIds', async ({
    client,
    assert,
  }) => {
    // 1. Setup Admin
    const admin = await User.create({
      fullName: 'Admin',
      email: 'owner-admin@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    // 2. Admin creates 3 servers: Server A, Server B, Server C
    const idA = `server-a-${Date.now()}`
    const serverARes = await client
      .post('/api/v1/servers')
      .loginAs(admin)
      .json({
        name: 'Server A',
        identifier: idA,
        serverPort: 25572,
      })
    serverARes.assertStatus(201)
    const serverA = (serverARes.body() as any).data

    const idB = `server-b-${Date.now()}`
    const serverBRes = await client
      .post('/api/v1/servers')
      .loginAs(admin)
      .json({
        name: 'Server B',
        identifier: idB,
        serverPort: 25573,
      })
    serverBRes.assertStatus(201)
    const serverB = (serverBRes.body() as any).data

    const idC = `server-c-${Date.now()}`
    const serverCRes = await client
      .post('/api/v1/servers')
      .loginAs(admin)
      .json({
        name: 'Server C',
        identifier: idC,
        serverPort: 25574,
      })
    serverCRes.assertStatus(201)
    const serverC = (serverCRes.body() as any).data

    // 3. Create User 1 authorized to Server A & Server B
    //    Create User 2 authorized to Server A & Server C
    //    --> Notice Server A is authorized to BOTH User 1 and User 2 (Many-to-Many)!
    const user1 = await User.create({
      fullName: 'User 1',
      email: 'user1@pidan.local',
      password: 'password123',
      role: 'user',
      serverIds: [serverA.id, serverB.id],
    })

    const user2 = await User.create({
      fullName: 'User 2',
      email: 'user2@pidan.local',
      password: 'password123',
      role: 'user',
      serverIds: [serverA.id, serverC.id],
    })

    // 4. Regular user CANNOT create server
    const userCreateRes = await client
      .post('/api/v1/servers')
      .loginAs(user1)
      .json({
        name: 'Illegal Server',
        identifier: 'illegal-srv',
        serverPort: 25575,
      })
    userCreateRes.assertStatus(403)

    // 5. User 1 calls GET /servers -> sees Server A & Server B, NOT Server C
    const user1ListRes = await client.get('/api/v1/servers').loginAs(user1)
    user1ListRes.assertStatus(200)
    const user1Servers = (user1ListRes.body() as any).data as any[]
    assert.isTrue(user1Servers.some((s: any) => s.id === serverA.id))
    assert.isTrue(user1Servers.some((s: any) => s.id === serverB.id))
    assert.isFalse(user1Servers.some((s: any) => s.id === serverC.id))

    // 6. User 2 calls GET /servers -> sees Server A & Server C, NOT Server B
    const user2ListRes = await client.get('/api/v1/servers').loginAs(user2)
    user2ListRes.assertStatus(200)
    const user2Servers = (user2ListRes.body() as any).data as any[]
    assert.isTrue(user2Servers.some((s: any) => s.id === serverA.id))
    assert.isTrue(user2Servers.some((s: any) => s.id === serverC.id))
    assert.isFalse(user2Servers.some((s: any) => s.id === serverB.id))

    // 7. Both User 1 and User 2 can access Server A details (Many-to-Many verification)
    const u1GetA = await client.get(`/api/v1/servers/${serverA.id}`).loginAs(user1)
    u1GetA.assertStatus(200)

    const u2GetA = await client.get(`/api/v1/servers/${serverA.id}`).loginAs(user2)
    u2GetA.assertStatus(200)

    // 8. User 1 tries to access Server C -> 403 Forbidden
    const u1GetC = await client.get(`/api/v1/servers/${serverC.id}`).loginAs(user1)
    u1GetC.assertStatus(403)

    // 9. User 2 tries to send command to Server B -> 403 Forbidden
    const u2CmdB = await client
      .post(`/api/v1/servers/${serverB.id}/commands`)
      .loginAs(user2)
      .json({ command: 'help' })
    u2CmdB.assertStatus(403)

    // 10. Admin revokes Server A from User 1 by updating User 1's serverIds to [serverB.id]
    const revokeRes = await client
      .patch(`/api/v1/users/${user1.id}`)
      .loginAs(admin)
      .json({
        serverIds: [serverB.id],
      })
    revokeRes.assertStatus(200)

    // User 1 now loses access to Server A
    const u1GetAAfter = await client.get(`/api/v1/servers/${serverA.id}`).loginAs(user1)
    u1GetAAfter.assertStatus(403)

    // User 2 still has access to Server A
    const u2GetAAfter = await client.get(`/api/v1/servers/${serverA.id}`).loginAs(user2)
    u2GetAAfter.assertStatus(200)

    // Cleanup server directories
    await rm(join(process.cwd(), 'data', 'servers', idA), { recursive: true, force: true }).catch(
      () => {}
    )
    await rm(join(process.cwd(), 'data', 'servers', idB), { recursive: true, force: true }).catch(
      () => {}
    )
    await rm(join(process.cwd(), 'data', 'servers', idC), { recursive: true, force: true }).catch(
      () => {}
    )
  })
})
