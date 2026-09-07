import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { mkdir, readFile, rm, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { crc32 } from 'node:zlib'
import AdmZip from 'adm-zip'
import User from '#models/user'
import ServerBackup from '#models/server_backup'
import McContainerService from '#services/mc_container_service'
import FakeMcContainerService from '#tests/fakes/fake_mc_container_service'

const createdIdentifiers: string[] = []

function payload(res: { body: () => unknown }): any {
  return res.body()
}

async function createAdmin() {
  return User.create({
    fullName: 'Backup Admin',
    email: `admin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@pidan.local`,
    password: 'password123',
    role: 'admin',
  })
}

async function seedFiles(identifier: string, files: Record<string, string>) {
  for (const [rel, content] of Object.entries(files)) {
    const full = join(process.cwd(), 'data', 'servers', identifier, rel)
    await mkdir(dirname(full), { recursive: true })
    await writeFile(full, content, 'utf8')
  }
}

function storedZip(fileName: string, content: string) {
  const data = Buffer.from(content, 'utf8')
  const nameBuf = Buffer.from(fileName, 'utf8')
  const crc = crc32(data)

  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0)
  local.writeUInt16LE(20, 4)
  local.writeUInt32LE(crc >>> 0, 14)
  local.writeUInt32LE(data.length, 18)
  local.writeUInt32LE(data.length, 22)
  local.writeUInt16LE(nameBuf.length, 26)

  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50, 0)
  central.writeUInt16LE(20, 4)
  central.writeUInt16LE(20, 6)
  central.writeUInt32LE(crc >>> 0, 16)
  central.writeUInt32LE(data.length, 20)
  central.writeUInt32LE(data.length, 24)
  central.writeUInt16LE(nameBuf.length, 28)

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(1, 8)
  eocd.writeUInt16LE(1, 10)
  eocd.writeUInt32LE(46 + nameBuf.length, 12)
  eocd.writeUInt32LE(30 + nameBuf.length + data.length, 16)

  return Buffer.concat([local, nameBuf, data, central, nameBuf, eocd])
}

test.group('Server Backups', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.each.teardown(async () => {
    for (const identifier of createdIdentifiers) {
      await rm(join(process.cwd(), 'data', 'servers', identifier), {
        recursive: true,
        force: true,
      }).catch(() => {})
      await rm(join(process.cwd(), 'data', 'servers', `${identifier}.pre-restore`), {
        recursive: true,
        force: true,
      }).catch(() => {})
      await rm(join(process.cwd(), 'data', 'backups', identifier), {
        recursive: true,
        force: true,
      }).catch(() => {})
    }
    createdIdentifiers.length = 0
  })

  test('unauthenticated backup list is unauthorized', async ({ client }) => {
    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test',
      identifier: 'bk-unauth',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    createdIdentifiers.push('bk-unauth')

    const res = await client.get(`/api/v1/servers/${payload(createRes).data.id}/backups`)
    res.assertStatus(401)
  })

  test('operator without access is forbidden', async ({ client, assert }) => {
    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test',
      identifier: 'bk-forbidden',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    createdIdentifiers.push('bk-forbidden')

    const other = await User.create({
      fullName: 'Other',
      email: 'other@pidan.local',
      password: 'password123',
      role: 'user',
      serverIds: [],
    })

    const res = await client
      .get(`/api/v1/servers/${payload(createRes).data.id}/backups`)
      .loginAs(other)
    res.assertStatus(403)
    assert.equal(payload(res).errors[0].message, 'Access denied to this server instance.')
  })

  test('creates a snapshot of a stopped instance and returns the wrapped ready resource', async ({
    client,
    assert,
  }) => {
    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test',
      identifier: 'bk-create',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    const server = payload(createRes).data
    createdIdentifiers.push(server.identifier)
    await seedFiles(server.identifier, {
      'world/level.dat': 'v1',
      'plugins/demo.jar': 'plugin',
      'server.properties': 'motd=test',
    })

    const res = await client
      .post(`/api/v1/servers/${server.id}/backups`)
      .loginAs(admin)
      .json({ name: 'before-upgrade' })
    res.assertStatus(201)
    const data = payload(res).data
    assert.equal(data.status, 'ready')
    assert.equal(data.name, 'before-upgrade')
    assert.isAbove(data.sizeBytes, 0)
    assert.isTrue(String(data.fileName).endsWith('.zip'))

    const row = await ServerBackup.find(data.id)
    assert.isNotNull(row)
    assert.equal(row!.mcServerId, server.id)
  })

  test('snapshot archive lives outside the instance data directory', async ({ client, assert }) => {
    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test',
      identifier: 'bk-outside',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    const server = payload(createRes).data
    createdIdentifiers.push(server.identifier)
    await seedFiles(server.identifier, { 'world/level.dat': 'v1' })

    const res = await client.post(`/api/v1/servers/${server.id}/backups`).loginAs(admin).json({})
    res.assertStatus(201)
    const data = payload(res).data
    const zipPath = join(process.cwd(), 'data', 'backups', server.identifier, data.fileName)
    await access(zipPath)
    assert.notInclude(zipPath, join('data', 'servers', server.identifier))
  })

  test('lists snapshots newest first', async ({ client, assert }) => {
    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test',
      identifier: 'bk-list',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    const server = payload(createRes).data
    createdIdentifiers.push(server.identifier)
    await seedFiles(server.identifier, { 'world/level.dat': 'v1' })

    const first = await client
      .post(`/api/v1/servers/${server.id}/backups`)
      .loginAs(admin)
      .json({ name: 'older' })
    first.assertStatus(201)
    const second = await client
      .post(`/api/v1/servers/${server.id}/backups`)
      .loginAs(admin)
      .json({ name: 'newer' })
    second.assertStatus(201)

    const list = await client.get(`/api/v1/servers/${server.id}/backups`).loginAs(admin)
    list.assertStatus(200)
    const rows = payload(list).data as any[]
    assert.isArray(rows)
    assert.equal(rows[0].name, 'newer')
    assert.properties(rows[0], ['id', 'name', 'fileName', 'sizeBytes', 'status', 'createdAt'])
  })

  test('shows snapshot metadata', async ({ client, assert }) => {
    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test',
      identifier: 'bk-show',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    const server = payload(createRes).data
    createdIdentifiers.push(server.identifier)
    await seedFiles(server.identifier, { 'world/level.dat': 'v1' })

    const created = await client
      .post(`/api/v1/servers/${server.id}/backups`)
      .loginAs(admin)
      .json({ name: 'meta' })
    created.assertStatus(201)
    const backupId = payload(created).data.id

    const res = await client.get(`/api/v1/servers/${server.id}/backups/${backupId}`).loginAs(admin)
    res.assertStatus(200)
    assert.equal(payload(res).data.id, backupId)
    assert.equal(payload(res).data.status, 'ready')
  })

  test('downloads a ready snapshot as a zip file', async ({ client, assert }) => {
    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test',
      identifier: 'bk-dl',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    const server = payload(createRes).data
    createdIdentifiers.push(server.identifier)
    await seedFiles(server.identifier, { 'world/level.dat': 'v1' })

    const created = await client
      .post(`/api/v1/servers/${server.id}/backups`)
      .loginAs(admin)
      .json({})
    created.assertStatus(201)
    const backup = payload(created).data

    const res = await client
      .get(`/api/v1/servers/${server.id}/backups/${backup.id}/download`)
      .loginAs(admin)
    res.assertStatus(200)
    const disposition = String(res.header('content-disposition') || '')
    assert.include(disposition, backup.fileName)
    const type = String(res.header('content-type') || '')
    assert.match(type, /zip|octet-stream/i)
  })

  test('restores a snapshot onto a stopped instance and removes files added after the snapshot', async ({
    client,
    assert,
  }) => {
    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test',
      identifier: 'bk-restore',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    const server = payload(createRes).data
    createdIdentifiers.push(server.identifier)
    await seedFiles(server.identifier, { 'world/level.dat': 'v1' })

    const created = await client
      .post(`/api/v1/servers/${server.id}/backups`)
      .loginAs(admin)
      .json({})
    created.assertStatus(201)
    const backupId = payload(created).data.id

    await seedFiles(server.identifier, { 'world/level.dat': 'v2', 'extra.txt': 'new' })

    const res = await client
      .post(`/api/v1/servers/${server.id}/backups/${backupId}/restorations`)
      .loginAs(admin)
      .json({})
    res.assertStatus(201)
    assert.equal(payload(res).data.status, 'restored')

    const level = await readFile(
      join(process.cwd(), 'data', 'servers', server.identifier, 'world', 'level.dat'),
      'utf8'
    )
    assert.equal(level, 'v1')
    const extraGone = await access(
      join(process.cwd(), 'data', 'servers', server.identifier, 'extra.txt')
    )
      .then(() => false)
      .catch(() => true)
    assert.isTrue(extraGone)
  })

  test('deletes a ready snapshot', async ({ client, assert }) => {
    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test',
      identifier: 'bk-del',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    const server = payload(createRes).data
    createdIdentifiers.push(server.identifier)
    await seedFiles(server.identifier, { 'world/level.dat': 'v1' })

    const created = await client
      .post(`/api/v1/servers/${server.id}/backups`)
      .loginAs(admin)
      .json({})
    created.assertStatus(201)
    const backup = payload(created).data
    const zipPath = join(process.cwd(), 'data', 'backups', server.identifier, backup.fileName)

    const res = await client
      .delete(`/api/v1/servers/${server.id}/backups/${backup.id}`)
      .loginAs(admin)
    res.assertStatus(204)

    const gone = await access(zipPath)
      .then(() => false)
      .catch(() => true)
    assert.isTrue(gone)

    const list = await client.get(`/api/v1/servers/${server.id}/backups`).loginAs(admin)
    list.assertStatus(200)
    const ids = (payload(list).data as any[]).map((row) => row.id)
    assert.notInclude(ids, backup.id)
  })

  test('assigned user can create a snapshot', async ({ client, assert }) => {
    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test',
      identifier: 'bk-assigned',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    const server = payload(createRes).data
    createdIdentifiers.push(server.identifier)
    await seedFiles(server.identifier, { 'world/level.dat': 'v1' })

    const assigned = await User.create({
      fullName: 'Assigned',
      email: 'assigned@pidan.local',
      password: 'password123',
      role: 'user',
      serverIds: [server.id],
    })

    const res = await client
      .post(`/api/v1/servers/${server.id}/backups`)
      .loginAs(assigned)
      .json({ name: 'user-snap' })
    res.assertStatus(201)
    assert.equal(payload(res).data.status, 'ready')
  })

  test('live snapshot sends save-all flush, save-off, and save-on', async ({
    client,
    assert,
    swap,
  }) => {
    const fake = new FakeMcContainerService()
    fake.status = 'running'
    swap(McContainerService, fake as any)

    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test',
      identifier: 'bk-live',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    const server = payload(createRes).data
    createdIdentifiers.push(server.identifier)
    await seedFiles(server.identifier, { 'world/level.dat': 'v1' })

    const res = await client.post(`/api/v1/servers/${server.id}/backups`).loginAs(admin).json({})
    res.assertStatus(201)
    assert.equal(payload(res).data.status, 'ready')
    assert.deepEqual(fake.commands, ['save-all flush', 'save-off', 'save-on'])
  })

  test('flush failure aborts the snapshot and still resumes writes', async ({
    client,
    assert,
    swap,
  }) => {
    const fake = new FakeMcContainerService()
    fake.status = 'running'
    fake.failOn = 'save-off'
    swap(McContainerService, fake as any)

    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test',
      identifier: 'bk-flush-fail',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    const server = payload(createRes).data
    createdIdentifiers.push(server.identifier)
    await seedFiles(server.identifier, { 'world/level.dat': 'v1' })

    const res = await client.post(`/api/v1/servers/${server.id}/backups`).loginAs(admin).json({})
    res.assertStatus(400)
    assert.equal(
      payload(res).errors[0].message,
      'Failed to flush world saves. Backup aborted to avoid a corrupt snapshot.'
    )
    assert.include(fake.commands, 'save-on')
  })

  test('restore while running is conflict', async ({ client, assert, swap }) => {
    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test',
      identifier: 'bk-restore-running',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    const server = payload(createRes).data
    createdIdentifiers.push(server.identifier)
    await seedFiles(server.identifier, { 'world/level.dat': 'v1' })

    const created = await client
      .post(`/api/v1/servers/${server.id}/backups`)
      .loginAs(admin)
      .json({})
    created.assertStatus(201)
    const backupId = payload(created).data.id

    const fake = new FakeMcContainerService()
    fake.status = 'running'
    swap(McContainerService, fake as any)

    const res = await client
      .post(`/api/v1/servers/${server.id}/backups/${backupId}/restorations`)
      .loginAs(admin)
      .json({})
    res.assertStatus(409)
    assert.equal(
      payload(res).errors[0].message,
      'Cannot restore while the server is running. Please stop the server first.'
    )
  })

  test('concurrent snapshot while another is in flight is conflict', async ({
    client,
    assert,
    swap,
  }) => {
    let release!: () => void
    const fake = new FakeMcContainerService()
    fake.statusGate = new Promise<void>((resolve) => {
      release = resolve
    })
    swap(McContainerService, fake as any)

    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test',
      identifier: 'bk-concurrent',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    const server = payload(createRes).data
    createdIdentifiers.push(server.identifier)
    await seedFiles(server.identifier, { 'world/level.dat': 'v1' })

    let first: Awaited<ReturnType<typeof client.post>> | undefined
    const firstPromise = client
      .post(`/api/v1/servers/${server.id}/backups`)
      .loginAs(admin)
      .json({})
      .then((res) => {
        first = res
        return res
      })

    for (let i = 0; i < 80; i++) {
      if (fake.statusCalls >= 1) {
        break
      }
      await new Promise((r) => setTimeout(r, 50))
    }
    assert.isAtLeast(fake.statusCalls, 1)

    try {
      const second = await client
        .post(`/api/v1/servers/${server.id}/backups`)
        .loginAs(admin)
        .json({})
      second.assertStatus(409)
      assert.equal(
        payload(second).errors[0].message,
        'A backup or restore is already in progress for this server.'
      )
    } finally {
      release()
    }

    await firstPromise
    first!.assertStatus(201)
  })

  test('zip-slip restore is rejected and leaves files unchanged', async ({ client, assert }) => {
    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test',
      identifier: 'bk-slip',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    const server = payload(createRes).data
    createdIdentifiers.push(server.identifier)
    await seedFiles(server.identifier, { 'marker.txt': 'safe' })

    const backupDir = join(process.cwd(), 'data', 'backups', server.identifier)
    await mkdir(backupDir, { recursive: true })
    await writeFile(join(backupDir, 'slip.zip'), storedZip('../evil.txt', 'pwned'))

    const backup = await ServerBackup.create({
      mcServerId: server.id,
      name: 'slip',
      fileName: 'slip.zip',
      sizeBytes: 1,
      status: 'ready',
      errorMessage: null,
    })

    const res = await client
      .post(`/api/v1/servers/${server.id}/backups/${backup.id}/restorations`)
      .loginAs(admin)
      .json({})
    res.assertStatus(400)
    assert.equal(
      payload(res).errors[0].message,
      'Backup archive contains files outside the server directory.'
    )

    const marker = await readFile(
      join(process.cwd(), 'data', 'servers', server.identifier, 'marker.txt'),
      'utf8'
    )
    assert.equal(marker, 'safe')

    const evilGone = await access(join(process.cwd(), 'data', 'servers', 'evil.txt'))
      .then(() => false)
      .catch(() => true)
    assert.isTrue(evilGone)
  })

  test('deleting the instance discards its snapshots on disk', async ({ client, assert }) => {
    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test',
      identifier: 'bk-cascade',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    const server = payload(createRes).data
    createdIdentifiers.push(server.identifier)
    await seedFiles(server.identifier, { 'world/level.dat': 'v1' })

    const created = await client
      .post(`/api/v1/servers/${server.id}/backups`)
      .loginAs(admin)
      .json({})
    created.assertStatus(201)

    const res = await client.delete(`/api/v1/servers/${server.id}`).loginAs(admin)
    res.assertStatus(204)

    const backupsGone = await access(join(process.cwd(), 'data', 'backups', server.identifier))
      .then(() => false)
      .catch(() => true)
    assert.isTrue(backupsGone)

    const remainingBackups = await ServerBackup.query().where('mcServerId', server.id)
    assert.lengthOf(remainingBackups, 0, 'Database ServerBackup records should be purged when server is deleted')
  })

  test('creates a snapshot with wildcard excludes parameter, skipping ignored files and preserving unignored files', async ({
    client,
    assert,
  }) => {
    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test Exclude',
      identifier: 'bk-excludes',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    const server = payload(createRes).data
    createdIdentifiers.push(server.identifier)

    await seedFiles(server.identifier, {
      'world/level.dat': 'level_data',
      'logs/latest.log': 'log_data',
      'logs/2026-09-07.log.gz': 'compressed_log',
      'crash-reports/crash.txt': 'crash_data',
      'cache/temp.cache': 'cache_data',
      'temporary.tmp': 'temporary_data',
      'server.properties': 'motd=test',
    })

    const backupRes = await client
      .post(`/api/v1/servers/${server.id}/backups`)
      .loginAs(admin)
      .json({
        name: 'Selective Backup',
        excludes: ['logs/**', '*.tmp', 'crash-reports', 'cache/**'],
      })
    backupRes.assertStatus(201)
    const backup = payload(backupRes).data
    const zipPath = join(process.cwd(), 'data', 'backups', server.identifier, backup.fileName)
    const zip = new AdmZip(zipPath)
    const entryNames = zip.getEntries().map((e) => e.entryName.replace(/\\/g, '/'))

    // Unignored files must exist in the archive
    assert.include(entryNames, 'world/level.dat')
    assert.include(entryNames, 'server.properties')

    // Excluded files must not exist in the archive
    assert.notInclude(entryNames, 'logs/latest.log')
    assert.notInclude(entryNames, 'logs/2026-09-07.log.gz')
    assert.notInclude(entryNames, 'crash-reports/crash.txt')
    assert.notInclude(entryNames, 'cache/temp.cache')
    assert.notInclude(entryNames, 'temporary.tmp')
  })

  test('security validation rejects unsafe excludes patterns', async ({ client }) => {
    const admin = await createAdmin()
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Backup Test Security',
      identifier: 'bk-sec-excludes',
      serverPort: 25565,
    })
    createRes.assertStatus(201)
    const server = payload(createRes).data
    createdIdentifiers.push(server.identifier)

    const testCases = [
      ['../escape'],
      ['sub/../../escape'],
      ['/etc/passwd'],
      ['\\windows\\system32'],
      ['C:\\secret'],
      ['evil\0null'],
      ['a'.repeat(121)],
      Array(51).fill('logs/**'),
    ]

    for (const badExcludes of testCases) {
      const res = await client
        .post(`/api/v1/servers/${server.id}/backups`)
        .loginAs(admin)
        .json({
          name: 'Invalid Pattern Backup',
          excludes: badExcludes,
        })
      res.assertStatus(422)
    }
  })
})
