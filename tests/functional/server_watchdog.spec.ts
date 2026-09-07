import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import User from '#models/user'
import McServer from '#models/mc_server'
import McContainerService from '#services/mc_container_service'
import ServerWatchdogService from '#services/server_watchdog_service'
import FakeMcContainerService from '#tests/fakes/fake_mc_container_service'

test.group('Server Watchdog: Auto-start & Crash Exponential Backoff', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.each.teardown(async () => {
    const watchdog = await app.container.make(ServerWatchdogService)
    watchdog.stopWatchdog()
  })

  test('creates server with auto-start and crash backoff settings and returns them in response', async ({
    client,
    assert,
  }) => {
    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin-wd@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const res = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Watchdog Server',
      identifier: 'watchdog-srv-1',
      serverPort: 25580,
      minMemoryMb: 1024,
      maxMemoryMb: 2048,
      autoStartOnBoot: true,
      autoRestartOnCrash: true,
      crashBackoffInitialSeconds: 10,
      crashBackoffMaxSeconds: 120,
      crashMaxRetries: 3,
    })

    res.assertStatus(201)
    const body = (res.body() as any).data
    assert.equal(body.name, 'Watchdog Server')
    assert.isTrue(body.autoStartOnBoot)
    assert.isTrue(body.autoRestartOnCrash)
    assert.equal(body.crashBackoffInitialSeconds, 10)
    assert.equal(body.crashBackoffMaxSeconds, 120)
    assert.equal(body.crashMaxRetries, 3)
  })

  test('defaults auto-start and crash restart to false, with 5s initial and 300s max ceiling', async ({
    client,
    assert,
  }) => {
    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin-wd-def@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const res = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Default Server',
      identifier: 'default-srv-1',
      serverPort: 25581,
    })

    res.assertStatus(201)
    const body = (res.body() as any).data
    assert.isFalse(body.autoStartOnBoot)
    assert.isFalse(body.autoRestartOnCrash)
    assert.equal(body.crashBackoffInitialSeconds, 5)
    assert.equal(body.crashBackoffMaxSeconds, 300)
    assert.equal(body.crashMaxRetries, 5)
  })

  test('rejects creation when crashBackoffMaxSeconds is less than crashBackoffInitialSeconds', async ({
    client,
    assert,
  }) => {
    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin-wd-val@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const res = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Invalid Backoff Server',
      identifier: 'invalid-wd-1',
      serverPort: 25582,
      crashBackoffInitialSeconds: 30,
      crashBackoffMaxSeconds: 10,
    })

    res.assertStatus(400)
    const body = res.body() as any
    assert.include(
      body.errors[0].message,
      'crashBackoffMaxSeconds must be greater than or equal to crashBackoffInitialSeconds'
    )
  })

  test('updates crash restart configuration via PATCH /api/v1/servers/:id', async ({
    client,
    assert,
  }) => {
    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin-wd-upd@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const server = await McServer.create({
      name: 'Updatable Server',
      identifier: 'upd-wd-1',
      serverPort: 25583,
      minMemoryMb: 1024,
      maxMemoryMb: 2048,
    })

    const res = await client.patch(`/api/v1/servers/${server.id}`).loginAs(admin).json({
      autoStartOnBoot: true,
      autoRestartOnCrash: true,
      crashBackoffInitialSeconds: 8,
      crashBackoffMaxSeconds: 60,
      crashMaxRetries: 4,
    })

    res.assertStatus(200)
    const body = (res.body() as any).data
    assert.isTrue(body.autoStartOnBoot)
    assert.isTrue(body.autoRestartOnCrash)
    assert.equal(body.crashBackoffInitialSeconds, 8)
    assert.equal(body.crashBackoffMaxSeconds, 60)
    assert.equal(body.crashMaxRetries, 4)

    // Verify persisted in database
    await server.refresh()
    assert.isTrue(server.autoStartOnBoot)
    assert.isTrue(server.autoRestartOnCrash)
    assert.equal(server.crashBackoffInitialSeconds, 8)
    assert.equal(server.crashBackoffMaxSeconds, 60)
    assert.equal(server.crashMaxRetries, 4)
  })

  test('exponential backoff calculation adheres to formula and enforces ceiling', async ({
    assert,
  }) => {
    const watchdog = await app.container.make(ServerWatchdogService)

    const server = new McServer()
    server.crashBackoffInitialSeconds = 5
    server.crashBackoffMaxSeconds = 300

    // Standard formula: min(5 * 2^(N-1), 300)
    assert.equal(watchdog.calculateBackoffDelay(server, 1), 5) // 5 * 2^0 = 5
    assert.equal(watchdog.calculateBackoffDelay(server, 2), 10) // 5 * 2^1 = 10
    assert.equal(watchdog.calculateBackoffDelay(server, 3), 20) // 5 * 2^2 = 20
    assert.equal(watchdog.calculateBackoffDelay(server, 4), 40) // 5 * 2^3 = 40
    assert.equal(watchdog.calculateBackoffDelay(server, 5), 80) // 5 * 2^4 = 80
    assert.equal(watchdog.calculateBackoffDelay(server, 6), 160) // 5 * 2^5 = 160
    assert.equal(watchdog.calculateBackoffDelay(server, 7), 300) // min(320, 300) = 300
    assert.equal(watchdog.calculateBackoffDelay(server, 8), 300) // min(640, 300) = 300

    // Custom ceiling: initial 10s, max 25s
    server.crashBackoffInitialSeconds = 10
    server.crashBackoffMaxSeconds = 25
    assert.equal(watchdog.calculateBackoffDelay(server, 1), 10)
    assert.equal(watchdog.calculateBackoffDelay(server, 2), 20)
    assert.equal(watchdog.calculateBackoffDelay(server, 3), 25) // min(40, 25) = 25
    assert.equal(watchdog.calculateBackoffDelay(server, 4), 25)
  })

  test('bootstrapAutoStart launches instances configured with autoStartOnBoot and skips others', async ({
    assert,
    swap,
  }) => {
    const fake = new FakeMcContainerService()
    swap(McContainerService, fake as any)

    const serverAuto = await McServer.create({
      name: 'Auto Boot Server',
      identifier: 'auto-boot-srv',
      serverPort: 25584,
      minMemoryMb: 1024,
      maxMemoryMb: 2048,
      autoStartOnBoot: true,
    })

    const serverManual = await McServer.create({
      name: 'Manual Boot Server',
      identifier: 'manual-boot-srv',
      serverPort: 25585,
      minMemoryMb: 1024,
      maxMemoryMb: 2048,
      autoStartOnBoot: false,
    })

    const watchdog = await app.container.make(ServerWatchdogService)
    await watchdog.bootstrapAutoStart()

    const startedIds = fake.startCalls.map((s) => s.id)
    assert.include(startedIds, serverAuto.id)
    assert.notInclude(startedIds, serverManual.id)
  })

  test('GET /api/v1/servers/:id/power returns autoRestart details and updates on crash', async ({
    client,
    assert,
    swap,
  }) => {
    const fake = new FakeMcContainerService()
    swap(McContainerService, fake as any)

    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin-wd-pow@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const server = await McServer.create({
      name: 'Power Status Server',
      identifier: 'power-wd-srv',
      serverPort: 25586,
      minMemoryMb: 1024,
      maxMemoryMb: 2048,
      autoRestartOnCrash: true,
      crashBackoffInitialSeconds: 15,
      crashBackoffMaxSeconds: 300,
      crashMaxRetries: 5,
    })

    const resBefore = await client.get(`/api/v1/servers/${server.id}/power`).loginAs(admin)
    resBefore.assertStatus(200)
    const bodyBefore = (resBefore.body() as any).data
    assert.isDefined(bodyBefore.autoRestart)
    assert.isFalse(bodyBefore.autoRestart.isWaitingRestart)
    assert.equal(bodyBefore.autoRestart.crashAttempts, 0)
    assert.equal(bodyBefore.autoRestart.maxRetries, 5)

    // Simulate server was running, then container crashed
    const watchdog = await app.container.make(ServerWatchdogService)
    watchdog.handleServerStarted(server, true)
    await watchdog.handleContainerCrash(server, 1)

    const resAfter = await client.get(`/api/v1/servers/${server.id}/power`).loginAs(admin)
    resAfter.assertStatus(200)
    const bodyAfter = (resAfter.body() as any).data
    assert.isTrue(bodyAfter.autoRestart.isWaitingRestart)
    assert.equal(bodyAfter.autoRestart.crashAttempts, 1)
    assert.isNotNull(bodyAfter.autoRestart.nextRetryInSeconds)
    assert.isAtLeast(bodyAfter.autoRestart.nextRetryInSeconds!, 1)

    // User manually stopping server cancels the pending backoff restart
    const stopRes = await client.delete(`/api/v1/servers/${server.id}/power`).loginAs(admin)
    stopRes.assertStatus(204)

    const resAfterStop = await client.get(`/api/v1/servers/${server.id}/power`).loginAs(admin)
    const bodyAfterStop = (resAfterStop.body() as any).data
    assert.isFalse(bodyAfterStop.autoRestart.isWaitingRestart)
    assert.isNull(bodyAfterStop.autoRestart.nextRetryInSeconds)
  })

  test('halts auto-restart when consecutive crash attempts exceed crashMaxRetries', async ({
    assert,
  }) => {
    const server = await McServer.create({
      name: 'Max Retries Server',
      identifier: 'max-retries-srv',
      serverPort: 25587,
      minMemoryMb: 1024,
      maxMemoryMb: 2048,
      autoRestartOnCrash: true,
      crashBackoffInitialSeconds: 5,
      crashBackoffMaxSeconds: 30,
      crashMaxRetries: 2,
    })

    const watchdog = await app.container.make(ServerWatchdogService)
    watchdog.handleServerStarted(server, true)

    // Crash 1: Scheduled (attempt 1 <= 2)
    await watchdog.handleContainerCrash(server, 1)
    let status = watchdog.getRestartStatus(server.id, server)
    assert.isTrue(status.isWaitingRestart)
    assert.equal(status.crashAttempts, 1)
    assert.isNull(status.haltedReason)

    // Crash 2: Scheduled (attempt 2 <= 2)
    watchdog.clearPendingTimer(server.id)
    watchdog.handleServerStarted(server, false)
    await watchdog.handleContainerCrash(server, 1)
    status = watchdog.getRestartStatus(server.id, server)
    assert.isTrue(status.isWaitingRestart)
    assert.equal(status.crashAttempts, 2)
    assert.isNull(status.haltedReason)

    // Crash 3: Exceeds max retries (3 > 2), should halt
    watchdog.clearPendingTimer(server.id)
    watchdog.handleServerStarted(server, false)
    await watchdog.handleContainerCrash(server, 1)
    status = watchdog.getRestartStatus(server.id, server)
    assert.isFalse(status.isWaitingRestart)
    assert.equal(status.crashAttempts, 3)
    assert.include(status.haltedReason!, 'Exceeded maximum consecutive crash restarts (2)')
  })

  test('resets crash counter when server runs stably for the duration of the stability window', async ({
    assert,
  }) => {
    const server = await McServer.create({
      name: 'Stability Server',
      identifier: 'stability-srv',
      serverPort: 25588,
      minMemoryMb: 1024,
      maxMemoryMb: 2048,
      autoRestartOnCrash: true,
    })

    const watchdog = await app.container.make(ServerWatchdogService)
    // Configure a very short stability window for test (50ms)
    watchdog.setStabilityWindowMs(50)

    // Start with 2 previous crash attempts
    watchdog.handleServerStarted(server, false)
    const state = (watchdog as any).getOrCreateState(server.id)
    state.crashAttempts = 2

    assert.equal(watchdog.getRestartStatus(server.id, server).crashAttempts, 2)

    // Wait 70ms to allow stability timer to fire
    await new Promise((resolve) => setTimeout(resolve, 70))

    assert.equal(watchdog.getRestartStatus(server.id, server).crashAttempts, 0)
  })
})
