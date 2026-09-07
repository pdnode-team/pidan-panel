import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gzipSync, gunzipSync } from 'node:zlib'
import User from '#models/user'
import McServer from '#models/mc_server'

test.group('Minecraft Server Log Archives', (group) => {
  group.each.setup(async () => {
    await testUtils.db().truncate()

    const servers = await McServer.all().catch(() => [])
    for (const s of servers) {
      await rm(join(process.cwd(), 'data', 'servers', s.identifier), {
        recursive: true,
        force: true,
      }).catch(() => {})
    }
  })

  test('Lists log archives, stream decompresses .log.gz, supports search/pagination, and secure downloads', async ({
    client,
    assert,
  }) => {
    const admin = await User.create({
      fullName: 'Archive Admin',
      email: 'archive-admin@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const unauthorizedUser = await User.create({
      fullName: 'Other User',
      email: 'other@pidan.local',
      password: 'password123',
      role: 'user',
      serverIds: [],
    })

    const identifier = `log-archive-srv-${Date.now()}`
    const server = await McServer.create({
      name: 'Log Archive Server',
      identifier,
      serverPort: 25575,
    })

    const logsDir = join(server.dataDirectory, 'logs')
    await mkdir(logsDir, { recursive: true })

    // Create latest.log
    const latestLogContent = [
      '[12:00:00] [Server thread/INFO]: Starting minecraft server version 1.21',
      '[12:00:01] [Server thread/INFO]: Loading properties',
      "[12:00:02] [Server thread/WARN]: Can't keep up! Is the server overloaded?",
      '[12:00:03] [Server thread/INFO]: Done (2.5s)! For help, type "help"',
    ].join('\n')
    await writeFile(join(logsDir, 'latest.log'), latestLogContent, 'utf8')

    // Create gzipped log: 2026-09-01-1.log.gz
    const archivedLogContent = [
      '[08:00:00] [Server thread/INFO]: Booting server backup world',
      '[08:00:01] [Server thread/ERROR]: Failed to load custom world structure',
      '[08:00:02] [Server thread/INFO]: Player Steve connected from 127.0.0.1',
      '[08:00:03] [Server thread/INFO]: Server shutdown initiated',
    ].join('\n')
    const gzBuffer = gzipSync(Buffer.from(archivedLogContent, 'utf8'))
    await writeFile(join(logsDir, '2026-09-01-1.log.gz'), gzBuffer)

    // Also write a non-log file to ensure it gets ignored
    await writeFile(join(logsDir, 'ignore_me.txt'), 'random text', 'utf8')

    // 1. Unauthorized user cannot access archives
    const forbiddenList = await client
      .get(`/api/v1/servers/${server.id}/logs/archives`)
      .loginAs(unauthorizedUser)
    forbiddenList.assertStatus(403)

    // 2. Admin lists log archives
    const listRes = await client.get(`/api/v1/servers/${server.id}/logs/archives`).loginAs(admin)
    listRes.assertStatus(200)
    const listData = (listRes.body() as any).data as any[]

    assert.isAtLeast(listData.length, 2)
    // Non-log files must be excluded
    assert.isFalse(listData.some((f) => f.fileName === 'ignore_me.txt'))

    const latestItem = listData.find((f) => f.fileName === 'latest.log')
    assert.isDefined(latestItem)
    assert.isFalse(latestItem.isCompressed)
    assert.isAbove(latestItem.sizeBytes, 0)

    const gzItem = listData.find((f) => f.fileName === '2026-09-01-1.log.gz')
    assert.isDefined(gzItem)
    assert.isTrue(gzItem.isCompressed)
    assert.isAbove(gzItem.sizeBytes, 0)

    // 3. Read latest.log with pagination and search
    const readLatestRes = await client
      .get(`/api/v1/servers/${server.id}/logs/archives/latest.log?page=1&perPage=2`)
      .loginAs(admin)
    readLatestRes.assertStatus(200)
    const latestData = (readLatestRes.body() as any).data
    assert.equal(latestData.fileName, 'latest.log')
    assert.equal(latestData.totalMatchedLines, 4)
    assert.lengthOf(latestData.lines, 2)
    assert.isTrue(latestData.hasMore)

    // 4. Search in latest.log
    const searchLatestRes = await client
      .get(`/api/v1/servers/${server.id}/logs/archives/latest.log?search=WARN`)
      .loginAs(admin)
    searchLatestRes.assertStatus(200)
    const searchLatestData = (searchLatestRes.body() as any).data
    assert.equal(searchLatestData.totalMatchedLines, 1)
    assert.include(searchLatestData.lines[0], "Can't keep up!")

    // 5. Tail option for latest.log
    const tailRes = await client
      .get(`/api/v1/servers/${server.id}/logs/archives/latest.log?tail=true&perPage=2`)
      .loginAs(admin)
    tailRes.assertStatus(200)
    const tailData = (tailRes.body() as any).data
    assert.lengthOf(tailData.lines, 2)
    assert.include(tailData.lines[1], 'Done (2.5s)!')

    // 6. Read gzipped archive 2026-09-01-1.log.gz without creating temporary files on disk
    const readGzRes = await client
      .get(`/api/v1/servers/${server.id}/logs/archives/2026-09-01-1.log.gz`)
      .loginAs(admin)
    readGzRes.assertStatus(200)
    const gzData = (readGzRes.body() as any).data
    assert.equal(gzData.fileName, '2026-09-01-1.log.gz')
    assert.equal(gzData.totalMatchedLines, 4)
    assert.lengthOf(gzData.lines, 4)

    // Search inside gzipped log
    const searchGzRes = await client
      .get(`/api/v1/servers/${server.id}/logs/archives/2026-09-01-1.log.gz?search=ERROR`)
      .loginAs(admin)
    searchGzRes.assertStatus(200)
    const searchGzData = (searchGzRes.body() as any).data
    assert.equal(searchGzData.totalMatchedLines, 1)
    assert.include(searchGzData.lines[0], 'Failed to load custom world structure')

    // 7. Download original raw archive (.log.gz)
    const downloadRes = await client
      .get(`/api/v1/servers/${server.id}/logs/archives/2026-09-01-1.log.gz/download`)
      .loginAs(admin)
    downloadRes.assertStatus(200)
    assert.equal(downloadRes.header('content-type'), 'application/gzip')
    assert.include(
      downloadRes.header('content-disposition') || '',
      'filename="2026-09-01-1.log.gz"'
    )

    // Verify downloaded buffer is valid gzip and decompress matches
    const decompressed = gunzipSync(downloadRes.response.body).toString('utf8')
    assert.equal(decompressed, archivedLogContent)

    // 8. Non-existent log file returns 404
    const notFoundRes = await client
      .get(`/api/v1/servers/${server.id}/logs/archives/nonexistent.log`)
      .loginAs(admin)
    notFoundRes.assertStatus(404)

    // 9. Path traversal attempts are blocked (400 Bad Request)
    const traversalRes = await client
      .get(`/api/v1/servers/${server.id}/logs/archives/..%2Fserver.properties`)
      .loginAs(admin)
    traversalRes.assertStatus(400)

    // 10. Attempting to access non-log files is blocked (400 Bad Request)
    const invalidExtRes = await client
      .get(`/api/v1/servers/${server.id}/logs/archives/eula.txt`)
      .loginAs(admin)
    invalidExtRes.assertStatus(400)
  })
})
