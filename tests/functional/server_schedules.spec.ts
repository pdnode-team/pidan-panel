import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import User from '#models/user'
import McServer from '#models/mc_server'
import ServerSchedule from '#models/server_schedule'
import ServerScheduleService from '#services/server_schedule_service'
import McContainerService from '#services/mc_container_service'
import FakeMcContainerService from '#tests/fakes/fake_mc_container_service'

test.group('Server Schedules & Cron Management', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('unauthenticated schedule access is unauthorized', async ({ client }) => {
    const res = await client.get('/api/v1/servers/1/schedules')
    res.assertStatus(401)
  })

  test('non-admin user is forbidden from accessing schedules even if assigned to server', async ({
    client,
    assert,
  }) => {
    const server = await McServer.create({
      name: 'Private Server',
      identifier: `sched-srv-${Date.now()}`,
      serverPort: 25601,
      minMemoryMb: 1024,
      maxMemoryMb: 2048,
      dockerImage: 'itzg/minecraft-server:latest',
      serverJar: 'paper',
    })

    const assignedUser = await User.create({
      fullName: 'Assigned User',
      email: 'assigned-sched@pidan.local',
      password: 'password123',
      role: 'user',
      serverIds: [server.id],
    })

    const res = await client.get(`/api/v1/servers/${server.id}/schedules`).loginAs(assignedUser)
    res.assertStatus(403)
    const body = res.body() as any
    assert.include(body.errors[0].message, 'Administrator privileges required')
  })

  test('rejects invalid cron expression on creation', async ({ client }) => {
    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin-cron@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const server = await McServer.create({
      name: 'Schedule Server',
      identifier: `sched-srv-val-${Date.now()}`,
      serverPort: 25602,
      minMemoryMb: 1024,
      maxMemoryMb: 2048,
      dockerImage: 'itzg/minecraft-server:latest',
      serverJar: 'paper',
    })

    const res = await client.post(`/api/v1/servers/${server.id}/schedules`).loginAs(admin).json({
      name: 'Invalid Cron Task',
      cron: 'not a valid cron',
      action: 'backup',
    })

    res.assertStatus(422)
  })

  test('creates, lists, shows, updates and deletes a schedule', async ({ client, assert }) => {
    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin-crud@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const server = await McServer.create({
      name: 'CRUD Server',
      identifier: `sched-crud-${Date.now()}`,
      serverPort: 25603,
      minMemoryMb: 1024,
      maxMemoryMb: 2048,
      dockerImage: 'itzg/minecraft-server:latest',
      serverJar: 'paper',
    })

    // 1. Create schedule
    const createRes = await client
      .post(`/api/v1/servers/${server.id}/schedules`)
      .loginAs(admin)
      .json({
        name: 'Daily Backup at 4 AM',
        cron: '0 4 * * *',
        action: 'backup',
        payload: {
          name: 'Auto-4AM',
          excludes: ['logs/**'],
        },
        isActive: true,
      })
    createRes.assertStatus(201)
    const schedule = (createRes.body() as any).data
    assert.equal(schedule.name, 'Daily Backup at 4 AM')
    assert.equal(schedule.cron, '0 4 * * *')
    assert.equal(schedule.action, 'backup')
    assert.equal(schedule.isActive, true)
    assert.deepEqual(schedule.payload.excludes, ['logs/**'])

    // 2. List schedules
    const listRes = await client.get(`/api/v1/servers/${server.id}/schedules`).loginAs(admin)
    listRes.assertStatus(200)
    const listBody = (listRes.body() as any).data
    assert.equal(listBody.length, 1)
    assert.equal(listBody[0].id, schedule.id)

    // 3. Show schedule
    const showRes = await client
      .get(`/api/v1/servers/${server.id}/schedules/${schedule.id}`)
      .loginAs(admin)
    showRes.assertStatus(200)
    assert.equal((showRes.body() as any).data.id, schedule.id)

    // 4. Update schedule (toggle inactive and change cron)
    const updateRes = await client
      .patch(`/api/v1/servers/${server.id}/schedules/${schedule.id}`)
      .loginAs(admin)
      .json({
        cron: '30 3 * * *',
        isActive: false,
      })
    updateRes.assertStatus(200)
    const updated = (updateRes.body() as any).data
    assert.equal(updated.cron, '30 3 * * *')
    assert.equal(updated.isActive, false)

    // 5. Delete schedule
    const deleteRes = await client
      .delete(`/api/v1/servers/${server.id}/schedules/${schedule.id}`)
      .loginAs(admin)
    deleteRes.assertStatus(204)

    // Verify deleted
    const notFoundRes = await client
      .get(`/api/v1/servers/${server.id}/schedules/${schedule.id}`)
      .loginAs(admin)
    notFoundRes.assertStatus(404)
  })

  test('manual run immediately executes a schedule and updates run record', async ({
    client,
    assert,
    swap,
  }) => {
    const fakeContainer = new FakeMcContainerService()
    fakeContainer.status = 'running'
    swap(McContainerService, fakeContainer as any)

    const admin = await User.create({
      fullName: 'Admin Runner',
      email: 'admin-run@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const server = await McServer.create({
      name: 'Run Server',
      identifier: `sched-run-${Date.now()}`,
      serverPort: 25604,
      minMemoryMb: 1024,
      maxMemoryMb: 2048,
      dockerImage: 'itzg/minecraft-server:latest',
      serverJar: 'paper',
    })

    // Create a command schedule
    const schedule = await ServerSchedule.create({
      mcServerId: server.id,
      name: 'Broadcast Announcement',
      cron: '*/10 * * * *',
      action: 'command',
      payload: JSON.stringify({ command: 'say Welcome to the server!' }),
      isActive: true,
      lastRunAt: null,
      lastRunStatus: null,
      lastRunMessage: null,
    })

    // Execute via run endpoint
    const runRes = await client
      .post(`/api/v1/servers/${server.id}/schedules/${schedule.id}/runs`)
      .loginAs(admin)
    runRes.assertStatus(200)
    const runData = (runRes.body() as any).data
    assert.equal(runData.lastRunStatus, 'success')
    assert.isNotNull(runData.lastRunAt)
    assert.include(runData.lastRunMessage, 'dispatched successfully')

    // Verify command was received by fake container
    assert.include(fakeContainer.commands, 'say Welcome to the server!')
  })

  test('ServerScheduleService scans and executes due schedules without duplicate execution in the same minute', async ({
    assert,
    swap,
  }) => {
    const fakeContainer = new FakeMcContainerService()
    fakeContainer.status = 'running'
    swap(McContainerService, fakeContainer as any)

    const server = await McServer.create({
      name: 'Scan Server',
      identifier: `sched-scan-${Date.now()}`,
      serverPort: 25605,
      minMemoryMb: 1024,
      maxMemoryMb: 2048,
      dockerImage: 'itzg/minecraft-server:latest',
      serverJar: 'paper',
    })

    // Schedule 1: Every minute (* * * * *) -> Should trigger
    const sched1 = await ServerSchedule.create({
      mcServerId: server.id,
      name: 'Every Minute Ping',
      cron: '* * * * *',
      action: 'command',
      payload: JSON.stringify({ command: 'ping' }),
      isActive: true,
    })

    // Schedule 2: Inactive every minute -> Should not trigger
    const sched2 = await ServerSchedule.create({
      mcServerId: server.id,
      name: 'Inactive Ping',
      cron: '* * * * *',
      action: 'command',
      payload: JSON.stringify({ command: 'inactive' }),
      isActive: false,
    })

    // Schedule 3: Future year/month (0 0 1 1 *) -> Should not trigger
    const sched3 = await ServerSchedule.create({
      mcServerId: server.id,
      name: 'Yearly Task',
      cron: '0 0 1 1 *',
      action: 'command',
      payload: JSON.stringify({ command: 'yearly' }),
      isActive: true,
    })

    const scheduleService = await app.container.make(ServerScheduleService)
    const executedCount1 = await scheduleService.runPendingSchedules()
    assert.equal(executedCount1, 1)

    await sched1.refresh()
    assert.equal(sched1.lastRunStatus, 'success')
    assert.isNotNull(sched1.lastRunAt)

    await sched2.refresh()
    assert.isNull(sched2.lastRunAt)

    await sched3.refresh()
    assert.isNull(sched3.lastRunAt)

    // Immediate second scan in the same minute: should skip already executed schedule
    const executedCount2 = await scheduleService.runPendingSchedules()
    assert.equal(executedCount2, 0)
  })
})
