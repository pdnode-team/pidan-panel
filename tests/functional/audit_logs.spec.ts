import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { DateTime } from 'luxon'
import User from '#models/user'
import McServer from '#models/mc_server'
import AuditLog from '#models/audit_log'
import AuditLogService from '#services/audit_log_service'
import McContainerService from '#services/mc_container_service'
import FakeMcContainerService from '#tests/fakes/fake_mc_container_service'

test.group('Audit Logs System', (group) => {
  group.each.setup(async () => {
    await AuditLog.query().delete()
    await testUtils.db().truncate()

    // Clean up any test server directories created
    const servers = await McServer.all().catch(() => [])
    for (const s of servers) {
      await rm(join(process.cwd(), 'data', 'servers', s.identifier), {
        recursive: true,
        force: true,
      }).catch(() => {})
    }
  })

  test('Server command dispatch automatically logs to audit_logs without storing console output', async ({
    client,
    assert,
    swap,
  }) => {
    const fakeContainer = new FakeMcContainerService()
    swap(McContainerService, fakeContainer as any)

    const admin = await User.create({
      fullName: 'Console Admin',
      email: 'admin-cmd@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const server = await McServer.create({
      name: 'Command Test Server',
      identifier: `cmd-test-${Date.now()}`,
      serverPort: 25565,
      minMemoryMb: 1024,
      maxMemoryMb: 2048,
    })

    // Dispatch command
    const res = await client
      .post(`/api/v1/servers/${server.id}/commands`)
      .loginAs(admin)
      .json({ command: 'say Hello Minecraft World!' })

    res.assertStatus(204)

    // Verify command was sent to container
    assert.deepEqual(fakeContainer.commands, ['say Hello Minecraft World!'])

    // Verify audit log entry was written
    const logs = await AuditLog.query().where('mc_server_id', server.id)
    assert.lengthOf(logs, 1)

    const log = logs[0]
    assert.equal(log.category, 'command')
    assert.equal(log.action, 'command.dispatch')
    assert.equal(log.userId, admin.id)
    assert.equal(log.userEmail, admin.email)
    assert.equal(log.status, 'success')
    assert.deepEqual(log.parsedDetails, { command: 'say Hello Minecraft World!' })
  })

  test('Server power actions and file mutations record audit logs', async ({
    client,
    assert,
    swap,
  }) => {
    const fakeContainer = new FakeMcContainerService()
    swap(McContainerService, fakeContainer as any)

    const admin = await User.create({
      fullName: 'Power Admin',
      email: 'admin-power@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const server = await McServer.create({
      name: 'Power Audit Server',
      identifier: `power-audit-${Date.now()}`,
      serverPort: 25566,
      minMemoryMb: 1024,
      maxMemoryMb: 2048,
    })

    // 1. Trigger power action: start
    const powerRes = await client
      .post(`/api/v1/servers/${server.id}/power`)
      .loginAs(admin)
      .json({ action: 'start' })
    powerRes.assertStatus(201)

    // 2. Trigger file action: save server.properties
    const fileRes = await client
      .post(`/api/v1/servers/${server.id}/files`)
      .loginAs(admin)
      .json({ path: 'server.properties', content: 'difficulty=easy\n' })
    fileRes.assertStatus(201)

    // 3. Trigger backup creation
    const backupRes = await client
      .post(`/api/v1/servers/${server.id}/backups`)
      .loginAs(admin)
      .json({ name: 'Initial Backup' })
    backupRes.assertStatus(201)

    // Check all audit logs
    const logs = await AuditLog.query().where('mc_server_id', server.id).orderBy('id', 'asc')
    assert.isAtLeast(logs.length, 3)

    const powerLog = logs.find((l) => l.category === 'power')
    assert.isDefined(powerLog)
    assert.equal(powerLog!.action, 'power.start')

    const fileLog = logs.find((l) => l.category === 'file')
    assert.isDefined(fileLog)
    assert.equal(fileLog!.action, 'file.save')

    const backupLog = logs.find((l) => l.category === 'backup')
    assert.isDefined(backupLog)
    assert.equal(backupLog!.action, 'backup.create')
  })

  test('Global audit logs endpoint GET /api/v1/audit-logs is restricted to admins and supports filtering', async ({
    client,
    assert,
  }) => {
    const admin = await User.create({
      fullName: 'Super Admin',
      email: 'superadmin@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const user = await User.create({
      fullName: 'Regular User',
      email: 'regular@pidan.local',
      password: 'password123',
      role: 'user',
    })

    // Regular user is forbidden
    const forbiddenRes = await client.get('/api/v1/audit-logs').loginAs(user)
    forbiddenRes.assertStatus(403)

    // Seed mock audit logs
    await AuditLog.createMany([
      {
        userId: admin.id,
        userEmail: admin.email,
        userFullName: admin.fullName || 'Admin',
        category: 'command',
        action: 'command.dispatch',
        details: JSON.stringify({ command: 'gamemode creative' }),
        status: 'success',
        createdAt: DateTime.now(),
      },
      {
        userId: user.id,
        userEmail: user.email,
        userFullName: user.fullName || 'User',
        category: 'power',
        action: 'server.stop',
        details: null,
        status: 'failed',
        errorMessage: 'Container timeout',
        createdAt: DateTime.now(),
      },
      {
        userId: admin.id,
        userEmail: admin.email,
        userFullName: admin.fullName || 'Admin',
        category: 'file',
        action: 'file.delete',
        details: JSON.stringify({ path: 'world/data.old' }),
        status: 'success',
        createdAt: DateTime.now(),
      },
    ])

    // Admin lists all logs
    const listRes = await client.get('/api/v1/audit-logs').loginAs(admin)
    listRes.assertStatus(200)
    const listBody = listRes.body() as any
    assert.isDefined(listBody.data)
    assert.isDefined(listBody.metadata)
    assert.equal(listBody.metadata.total, 3)

    // Filter by category=command
    const commandFilterRes = await client.get('/api/v1/audit-logs?category=command').loginAs(admin)
    commandFilterRes.assertStatus(200)
    const commandBody = commandFilterRes.body() as any
    assert.equal(commandBody.metadata.total, 1)
    assert.equal(commandBody.data[0].category, 'command')

    // Filter by status=failed
    const failedFilterRes = await client.get('/api/v1/audit-logs?status=failed').loginAs(admin)
    failedFilterRes.assertStatus(200)
    const failedBody = failedFilterRes.body() as any
    assert.equal(failedBody.metadata.total, 1)
    assert.equal(failedBody.data[0].status, 'failed')
    assert.equal(failedBody.data[0].errorMessage, 'Container timeout')

    // Search keyword
    const searchRes = await client.get('/api/v1/audit-logs?search=creative').loginAs(admin)
    searchRes.assertStatus(200)
    const searchBody = searchRes.body() as any
    assert.equal(searchBody.metadata.total, 1)
    assert.include(JSON.stringify(searchBody.data[0].details), 'creative')
  })

  test('Server-scoped audit logs GET /api/v1/servers/:id/audit-logs restricts access to authorized users', async ({
    client,
    assert,
  }) => {
    const admin = await User.create({
      fullName: 'Server Owner Admin',
      email: 'owner@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const serverA = await McServer.create({
      name: 'Server Alpha',
      identifier: `srv-alpha-${Date.now()}`,
      serverPort: 25570,
    })

    const serverB = await McServer.create({
      name: 'Server Beta',
      identifier: `srv-beta-${Date.now()}`,
      serverPort: 25571,
    })

    // User assigned only to Server Alpha
    const assignedUser = await User.create({
      fullName: 'Alpha Moderator',
      email: 'alpha-mod@pidan.local',
      password: 'password123',
      role: 'user',
      serverIds: [serverA.id],
    })

    // Seed audit logs for both servers
    await AuditLog.createMany([
      {
        userId: assignedUser.id,
        userEmail: assignedUser.email,
        userFullName: assignedUser.fullName || 'Alpha Moderator',
        mcServerId: serverA.id,
        category: 'command',
        action: 'command.dispatch',
        details: JSON.stringify({ command: 'weather clear' }),
        status: 'success',
        createdAt: DateTime.now(),
      },
      {
        userId: admin.id,
        userEmail: admin.email,
        userFullName: admin.fullName || 'Server Owner Admin',
        mcServerId: serverB.id,
        category: 'command',
        action: 'command.dispatch',
        details: JSON.stringify({ command: 'stop' }),
        status: 'success',
        createdAt: DateTime.now(),
      },
    ])

    // Moderator can access Server Alpha logs
    const alphaRes = await client
      .get(`/api/v1/servers/${serverA.id}/audit-logs`)
      .loginAs(assignedUser)
    alphaRes.assertStatus(200)
    const alphaBody = alphaRes.body() as any
    assert.equal(alphaBody.metadata.total, 1)
    assert.equal(alphaBody.data[0].mcServerId, serverA.id)
    assert.equal(alphaBody.data[0].details.command, 'weather clear')

    // Moderator cannot access Server Beta logs -> 403
    const betaRes = await client
      .get(`/api/v1/servers/${serverB.id}/audit-logs`)
      .loginAs(assignedUser)
    betaRes.assertStatus(403)
  })

  test('Immutability guarantee: Users and admins cannot delete or mutate audit log entries via API', async ({
    client,
  }) => {
    const admin = await User.create({
      fullName: 'Admin Guy',
      email: 'admin-immutable@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const log = await AuditLog.create({
      userId: admin.id,
      userEmail: admin.email,
      userFullName: admin.fullName || 'Admin Guy',
      category: 'command',
      action: 'command.dispatch',
      status: 'success',
      createdAt: DateTime.now(),
    })

    // Attempting DELETE on audit logs route returns 404
    const deleteGlobal = await client.delete(`/api/v1/audit-logs/${log.id}`).loginAs(admin)
    deleteGlobal.assertStatus(404)

    const deleteServer = await client
      .delete(`/api/v1/servers/1/audit-logs/${log.id}`)
      .loginAs(admin)
    deleteServer.assertStatus(404)

    // Attempting PATCH / PUT returns 404
    const patchGlobal = await client
      .patch(`/api/v1/audit-logs/${log.id}`)
      .loginAs(admin)
      .json({ status: 'failed' })
    patchGlobal.assertStatus(404)
  })

  test('Pruning expired audit logs: AuditLogService.pruneOldLogs deletes logs older than retention days', async ({
    assert,
  }) => {
    const service = new AuditLogService()

    // 1. Create a log 40 days old
    await AuditLog.create({
      userEmail: 'old@pidan.local',
      userFullName: 'Old User',
      category: 'power',
      action: 'server.stop',
      status: 'success',
      createdAt: DateTime.now().minus({ days: 40 }),
    })

    // 2. Create a log 10 days old
    await AuditLog.create({
      userEmail: 'recent@pidan.local',
      userFullName: 'Recent User',
      category: 'command',
      action: 'command.dispatch',
      status: 'success',
      createdAt: DateTime.now().minus({ days: 10 }),
    })

    // 3. Prune logs older than 30 days
    const prunedCount = await service.pruneOldLogs(30)
    assert.equal(prunedCount, 1)

    // 4. Verify only the recent log remains
    const remaining = await AuditLog.all()
    assert.lengthOf(remaining, 1)
    assert.equal(remaining[0].userEmail, 'recent@pidan.local')
  })
})
