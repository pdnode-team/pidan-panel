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
    // truncate() runs migration:run now and returns the cleanup that wipes
    // every table after the test. Returning it lets Japa pair the cleanup
    // with this setup, so each test starts from an empty database.
    const truncate = await testUtils.db().truncate()

    // Clean up any test server directories created
    const servers = await McServer.all().catch(() => [])
    for (const s of servers) {
      await rm(join(process.cwd(), 'data', 'servers', s.identifier), {
        recursive: true,
        force: true,
      }).catch(() => {})
    }

    return async () => {
      await truncate()
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

    // 3. Security category logs: 60 days old (kept), 100 days old (pruned)
    await AuditLog.create({
      userEmail: 'security-recent@pidan.local',
      userFullName: 'Security Recent',
      category: 'auth',
      action: 'auth.login',
      status: 'success',
      createdAt: DateTime.now().minus({ days: 60 }),
    })
    await AuditLog.create({
      userEmail: 'security-ancient@pidan.local',
      userFullName: 'Security Ancient',
      category: 'user',
      action: 'user.delete',
      status: 'success',
      createdAt: DateTime.now().minus({ days: 100 }),
    })

    // 4. Prune logs older than 30 days (security categories use a 90 day window)
    const prunedCount = await service.pruneOldLogs(30)
    assert.equal(prunedCount, 2)

    // 5. Verify the general-recent log and the 60-day-old security log remain
    const remaining = await AuditLog.query().orderBy('id', 'asc')
    assert.lengthOf(remaining, 2)
    assert.deepEqual(
      remaining.map((log) => log.userEmail),
      ['recent@pidan.local', 'security-recent@pidan.local']
    )
  })

  test('Deleting a server preserves its audit logs and records the deletion', async ({
    client,
    assert,
    swap,
  }) => {
    const fakeContainer = new FakeMcContainerService()
    swap(McContainerService, fakeContainer as any)

    const admin = await User.create({
      fullName: 'Delete Audit Admin',
      email: 'admin-delete-audit@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const server = await McServer.create({
      name: 'Doomed Server',
      identifier: `doomed-audit-${Date.now()}`,
      serverPort: 25572,
      minMemoryMb: 1024,
      maxMemoryMb: 2048,
    })

    const service = new AuditLogService()
    await service.record({
      user: admin,
      mcServerId: server.id,
      category: 'command',
      action: 'command.dispatch',
      details: { command: 'say before delete' },
      status: 'success',
    })

    const deleteRes = await client.delete(`/api/v1/servers/${server.id}`).loginAs(admin)
    deleteRes.assertStatus(204)

    const surviving = await AuditLog.query().where('action', 'command.dispatch').first()
    assert.isNotNull(surviving)
    assert.isNull(surviving!.mcServerId)
    assert.equal(surviving!.serverName, 'Doomed Server')
    assert.equal(surviving!.serverIdentifier, server.identifier)
    assert.deepEqual(surviving!.parsedDetails, { command: 'say before delete' })

    const deletionLog = await AuditLog.query().where('action', 'server.delete').first()
    assert.isNotNull(deletionLog)
    assert.isNull(deletionLog!.mcServerId)
    assert.equal(deletionLog!.category, 'server')
    assert.equal(deletionLog!.userId, admin.id)
    assert.equal(deletionLog!.serverName, 'Doomed Server')
    assert.equal(deletionLog!.serverIdentifier, server.identifier)
    assert.deepEqual(deletionLog!.parsedDetails, {
      name: 'Doomed Server',
      identifier: server.identifier,
      deleteFiles: false,
    })

    const listRes = await client.get('/api/v1/audit-logs').loginAs(admin)
    listRes.assertStatus(200)
    const listBody = listRes.body() as any
    assert.equal(listBody.metadata.total, 2)
    const actions = listBody.data.map((row: any) => row.action)
    assert.include(actions, 'command.dispatch')
    assert.include(actions, 'server.delete')
    for (const row of listBody.data) {
      assert.isNull(row.mcServerId)
      assert.equal(row.serverName, 'Doomed Server')
      assert.equal(row.serverIdentifier, server.identifier)
    }
  })

  test('auth lifecycle and user management actions are audited', async ({ client, assert }) => {
    // 1. First signup is audited
    const signupRes = await client.post('/api/v1/auth/signup').json({
      fullName: 'Audit Root Admin',
      email: 'root-audit@pidan.local',
      password: 'password123',
      passwordConfirmation: 'password123',
    })
    signupRes.assertStatus(201)

    // 2. Failed login is audited
    const failedLogin = await client
      .post('/api/v1/auth/login')
      .json({ email: 'root-audit@pidan.local', password: 'wrong-password' })
    failedLogin.assertStatus(400)

    // 3. Successful login is audited
    const loginRes = await client
      .post('/api/v1/auth/login')
      .json({ email: 'root-audit@pidan.local', password: 'password123' })
    loginRes.assertStatus(200)

    const admin = await User.findByOrFail('email', 'root-audit@pidan.local')

    // 4. User CRUD is audited
    const createdUser = await client.post('/api/v1/users').loginAs(admin).json({
      fullName: 'Managed User',
      email: 'managed@pidan.local',
      password: 'password123',
      role: 'user',
    })
    createdUser.assertStatus(201)
    const targetId = (createdUser.body() as any).data.id

    const updatedUser = await client
      .patch(`/api/v1/users/${targetId}`)
      .loginAs(admin)
      .json({ password: 'new-password-456' })
    updatedUser.assertStatus(200)

    const deletedUser = await client.delete(`/api/v1/users/${targetId}`).loginAs(admin)
    deletedUser.assertStatus(204)

    const logs = await AuditLog.query().orderBy('id', 'asc')
    const actions = logs.map((log) => log.action)
    assert.include(actions, 'auth.signup')
    assert.include(actions, 'auth.login')
    assert.include(actions, 'user.create')
    assert.include(actions, 'user.update')
    assert.include(actions, 'user.delete')

    const loginLogs = await AuditLog.query().where('action', 'auth.login').orderBy('id', 'asc')
    assert.lengthOf(loginLogs, 2)
    assert.equal(loginLogs[0].status, 'failed')
    assert.equal(loginLogs[1].status, 'success')
    assert.equal(loginLogs[0].parsedDetails?.email, 'root-audit@pidan.local')
  })

  test('server create/update and schedule actions are audited', async ({
    client,
    assert,
    swap,
  }) => {
    const fakeContainer = new FakeMcContainerService()
    swap(McContainerService, fakeContainer as any)

    const admin = await User.create({
      fullName: 'Schedule Audit Admin',
      email: 'schedule-audit@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    // 1. Server create is audited
    const createRes = await client
      .post('/api/v1/servers')
      .loginAs(admin)
      .json({
        name: 'Schedule Audit Server',
        identifier: `schedule-audit-${Date.now()}`,
        serverPort: 25573,
      })
    createRes.assertStatus(201)
    const server = (createRes.body() as any).data

    // 2. Server update is audited
    const updateRes = await client
      .patch(`/api/v1/servers/${server.id}`)
      .loginAs(admin)
      .json({ name: 'Schedule Audit Server Renamed' })
    updateRes.assertStatus(200)

    // 3. Schedule create / run / delete are audited
    const scheduleRes = await client
      .post(`/api/v1/servers/${server.id}/schedules`)
      .loginAs(admin)
      .json({
        name: 'Audit Greeting',
        cron: '0 3 * * *',
        action: 'command',
        payload: { command: 'say audit' },
      })
    scheduleRes.assertStatus(201)
    const schedule = (scheduleRes.body() as any).data

    const runRes = await client
      .post(`/api/v1/servers/${server.id}/schedules/${schedule.id}/runs`)
      .loginAs(admin)
    runRes.assertStatus(200)
    assert.equal((runRes.body() as any).data.lastRunStatus, 'success')
    assert.deepEqual(fakeContainer.commands, ['say audit'])

    const deleteRes = await client
      .delete(`/api/v1/servers/${server.id}/schedules/${schedule.id}`)
      .loginAs(admin)
    deleteRes.assertStatus(204)

    const logs = await AuditLog.query().orderBy('id', 'asc')
    const actions = logs.map((log) => log.action)
    assert.include(actions, 'server.create')
    assert.include(actions, 'server.update')
    assert.include(actions, 'schedule.create')
    assert.include(actions, 'schedule.execute')
    assert.include(actions, 'schedule.run')
    assert.include(actions, 'schedule.delete')

    const updateLog = logs.find((log) => log.action === 'server.update')
    assert.isDefined(updateLog)
    assert.deepEqual(updateLog!.parsedDetails?.changedFields, ['name'])
  })
})
