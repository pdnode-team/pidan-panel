import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'

test.group('Minecraft Servers Management', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('setup-status returns needsSetup true initially and false after signup', async ({
    client,
    assert,
  }) => {
    const res1 = await client.get('/api/v1/system/setup-status')
    res1.assertStatus(200)
    assert.deepEqual(res1.body(), { data: { needsSetup: true } })

    // Register first user
    const signupRes = await client.post('/api/v1/auth/signup').json({
      fullName: 'Admin User',
      email: 'admin@pidan.local',
      password: 'password123',
      passwordConfirmation: 'password123',
    })
    signupRes.assertStatus(201)

    // Check setup status again
    const res2 = await client.get('/api/v1/system/setup-status')
    res2.assertStatus(200)
    assert.deepEqual(res2.body(), { data: { needsSetup: false } })

    // Second signup must be rejected
    const secondSignup = await client.post('/api/v1/auth/signup').json({
      fullName: 'Second User',
      email: 'hacker@pidan.local',
      password: 'password123',
      passwordConfirmation: 'password123',
    })
    secondSignup.assertStatus(403)
  })

  test('server instance CRUD and jailed file management', async ({ client, assert }) => {
    // 1. Create admin user
    const user = await User.create({
      fullName: 'Admin',
      email: 'admin@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    // 2. Create server instance
    const createRes = await client.post('/api/v1/servers').loginAs(user).json({
      name: 'Survival 1.21',
      identifier: 'survival-1',
      serverPort: 25565,
      minMemoryMb: 1024,
      maxMemoryMb: 2048,
    })

    createRes.assertStatus(201)
    const server = createRes.body().data as any
    assert.equal(server.name, 'Survival 1.21')
    assert.equal(server.identifier, 'survival-1')
    assert.equal(server.serverPort, 25565)

    // 3. List servers
    const listRes = await client.get('/api/v1/servers').loginAs(user)
    listRes.assertStatus(200)
    assert.lengthOf(listRes.body().data as any[], 1)

    // 4. File management: List files in server directory
    const filesRes = await client.get(`/api/v1/servers/${server.id}/files`).loginAs(user)
    filesRes.assertStatus(200)
    const files = (filesRes.body() as any).data as any[]
    // eula.txt was created automatically
    const eulaFile = files.find((f: any) => f.name === 'eula.txt')
    assert.isDefined(eulaFile)

    // 5. File management: Write server.properties
    const saveFileRes = await client.post(`/api/v1/servers/${server.id}/files`).loginAs(user).json({
      path: 'server.properties',
      content: 'difficulty=hard\nmotd=Pidan MC Server\n',
    })
    saveFileRes.assertStatus(201)

    // 6. File management: Read server.properties
    const readFileRes = await client
      .get(`/api/v1/servers/${server.id}/files/content?path=server.properties`)
      .loginAs(user)
    readFileRes.assertStatus(200)
    assert.include(((readFileRes.body() as any).data as any).content, 'motd=Pidan MC Server')

    // 7. Security: Path traversal must be blocked
    const traversalRes = await client
      .get(`/api/v1/servers/${server.id}/files/content?path=../../package.json`)
      .loginAs(user)
    traversalRes.assertStatus(400)
    assert.include((traversalRes.body() as any).errors[0].message, 'Access Denied')

    // 8. Check power status (stopped or error if docker offline)
    const powerRes = await client.get(`/api/v1/servers/${server.id}/power`).loginAs(user)
    powerRes.assertStatus(200)
    assert.oneOf(((powerRes.body() as any).data as any).status, ['stopped', 'error'])

    // 9. Delete server instance
    const deleteRes = await client.delete(`/api/v1/servers/${server.id}`).loginAs(user)
    deleteRes.assertStatus(204)

    // Verify deleted
    const verifyList = await client.get('/api/v1/servers').loginAs(user)
    verifyList.assertStatus(200)
    assert.lengthOf(verifyList.body().data as any[], 0)
  })

  test('mcjars API endpoints discover server types and builds', async ({ client, assert }) => {
    const user = await User.create({
      fullName: 'Admin',
      email: 'admin@pidan.local',
      password: 'password123',
    })

    // 1. Get types
    const typesRes = await client.get('/api/v1/mcjars/types').loginAs(user)
    typesRes.assertStatus(200)
    const types = (typesRes.body() as any).data
    assert.isObject(types)
    assert.property(types, 'paper')
    assert.property(types, 'purpur')

    // 2. Get versions for paper
    const paperRes = await client.get('/api/v1/mcjars/types/paper').loginAs(user)
    paperRes.assertStatus(200)
    const versions = (paperRes.body() as any).data
    assert.isObject(versions)
    assert.isNotEmpty(Object.keys(versions))
  })

  test('installs server jar only upon explicit API request', async ({ client, assert, swap }) => {
    const user = await User.create({
      fullName: 'Admin',
      email: 'admin@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const identifier = `paper-test-${Date.now()}`
    const createRes = await client.post('/api/v1/servers').loginAs(user).json({
      name: 'Paper Instance',
      identifier,
      serverPort: 25566,
      minMemoryMb: 1024,
      maxMemoryMb: 2048,
    })
    createRes.assertStatus(201)
    const server = (createRes.body() as any).data

    // Check files: server.jar should NOT exist initially
    const initialFiles = await client.get(`/api/v1/servers/${server.id}/files`).loginAs(user)
    initialFiles.assertStatus(200)
    const hasJarInitially = (initialFiles.body() as any).data.some(
      (f: any) => f.name === 'server.jar'
    )
    assert.isFalse(hasJarInitially, 'Server jar must not exist before download request')

    // Mock McJarsService to simulate fast download and write to server directory
    const McJarsServiceModule = await import('#services/mc_jars_service')
    const McJarsService = McJarsServiceModule.default
    const { writeFile, mkdir, rm } = await import('node:fs/promises')
    const { join } = await import('node:path')

    class FakeMcJarsService extends McJarsService {
      override async downloadAndInstall(
        targetServer: any,
        options: any
      ): Promise<{ fileName: string; size: number; downloadUrl: string }> {
        await mkdir(targetServer.dataDirectory, { recursive: true })
        const fileName = options.targetFileName || targetServer.serverJar || 'server.jar'
        await writeFile(join(targetServer.dataDirectory, fileName), 'PK dummy jar content')
        return {
          fileName,
          size: 21,
          downloadUrl: 'https://fake-mcjars.test/paper-1.21.4.jar',
        }
      }
    }

    swap(McJarsService, new FakeMcJarsService())

    // Trigger API request to install jar
    const installRes = await client.post(`/api/v1/servers/${server.id}/jars`).loginAs(user).json({
      type: 'paper',
      version: '1.21.4',
    })

    installRes.assertStatus(201)
    const installData = (installRes.body() as any).data
    assert.equal(installData.fileName, 'server.jar')
    assert.equal(installData.size, 21)

    // Now check files: server.jar MUST exist after the API request
    const filesAfter = await client.get(`/api/v1/servers/${server.id}/files`).loginAs(user)
    filesAfter.assertStatus(200)
    const hasJarAfter = (filesAfter.body() as any).data.some((f: any) => f.name === 'server.jar')
    assert.isTrue(hasJarAfter, 'Server jar must exist after API download request')

    // Cleanup server data directory
    await rm(join(process.cwd(), 'data', 'servers', identifier), { recursive: true, force: true })
  })

  test('mcjars API discovers forge and neoforge versions with zipUrl and isZip flag', async ({
    client,
    assert,
  }) => {
    const user = await User.create({
      fullName: 'Admin',
      email: 'admin-forge@pidan.local',
      password: 'password123',
    })

    // 1. Get versions for forge
    const forgeRes = await client.get('/api/v1/mcjars/types/forge').loginAs(user)
    forgeRes.assertStatus(200)
    const forgeVersions = (forgeRes.body() as any).data
    assert.isObject(forgeVersions)
    // 1.20.1 is modern forge and has zipUrl
    assert.isDefined(forgeVersions['1.20.1'])
    assert.isTrue(forgeVersions['1.20.1'].isZip)
    assert.isNotEmpty(forgeVersions['1.20.1'].jarUrl)

    // 2. Get versions for neoforge
    const neoForgeRes = await client.get('/api/v1/mcjars/types/neoforge').loginAs(user)
    neoForgeRes.assertStatus(200)
    const neoVersions = (neoForgeRes.body() as any).data
    assert.isObject(neoVersions)
    assert.isNotEmpty(Object.keys(neoVersions))
    const firstVer = Object.values(neoVersions)[0] as any
    assert.isTrue(firstVer.isZip)
    assert.isNotEmpty(firstVer.jarUrl)
  })

  test('McJarsService downloadAndInstall unpacks zip bundles and cleans up archive', async ({
    assert,
  }) => {
    const McJarsServiceModule = await import('#services/mc_jars_service')
    const McJarsService = McJarsServiceModule.default
    const AdmZipModule = await import('adm-zip')
    const AdmZip = AdmZipModule.default
    const { readFile, readdir, rm } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const http = await import('node:http')

    const identifier = `forge-zip-test-${Date.now()}`
    const fakeServer: any = {
      dataDirectory: join(process.cwd(), 'tmp', identifier),
      serverJar: 'server.jar',
    }

    // Create a mock zip archive with server.jar and libraries/test.txt
    const zip = new AdmZip()
    zip.addFile('server.jar', Buffer.from('dummy server jar content'))
    zip.addFile('libraries/forge-lib.jar', Buffer.from('dummy forge lib content'))
    const zipBuffer = zip.toBuffer()

    // Host this mock zip on a local HTTP server
    const server = http.createServer((_req, res) => {
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Length': zipBuffer.length,
      })
      res.end(zipBuffer)
    })

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address() as any
    const mockUrl = `http://127.0.0.1:${address.port}/forge-bundle.zip`

    try {
      const mcJarsService = new McJarsService()
      const result = await mcJarsService.downloadAndInstall(fakeServer, {
        url: mockUrl,
      })

      assert.equal(result.fileName, 'server.jar')
      assert.equal(result.size, zipBuffer.length)

      // Verify files in data directory
      const jarContent = await readFile(join(fakeServer.dataDirectory, 'server.jar'), 'utf-8')
      assert.equal(jarContent, 'dummy server jar content')

      const libContent = await readFile(
        join(fakeServer.dataDirectory, 'libraries', 'forge-lib.jar'),
        'utf-8'
      )
      assert.equal(libContent, 'dummy forge lib content')

      // Verify no temporary zip left behind
      const allFiles = await readdir(fakeServer.dataDirectory)
      const hasZip = allFiles.some((f) => f.endsWith('.zip'))
      assert.isFalse(hasZip, 'Temporary zip file must be deleted after extraction')
    } finally {
      server.close()
      await rm(fakeServer.dataDirectory, { recursive: true, force: true })
    }
  })

  test('GET /api/v1/system/status requires authentication and returns full host metrics', async ({
    client,
    assert,
  }) => {
    // 1. Unauthorized request
    const guestRes = await client.get('/api/v1/system/status')
    guestRes.assertStatus(401)

    // 2. Authorized request
    const user = await User.create({
      fullName: 'System Admin',
      email: 'sysadmin@pidan.local',
      password: 'password123',
    })

    const authRes = await client.get('/api/v1/system/status').loginAs(user)
    authRes.assertStatus(200)

    const status = (authRes.body() as any).data
    assert.isObject(status)

    // System resources checks
    assert.isNumber(status.cpuPercent)
    assert.isNumber(status.memoryPercent)
    assert.isNumber(status.usedMemoryBytes)
    assert.isNumber(status.totalMemoryBytes)
    assert.isNumber(status.freeMemoryBytes)
    assert.isTrue(status.totalMemoryBytes > 0)
    assert.isTrue(status.usedMemoryBytes >= 0)

    // Data overview environment checks
    assert.isString(status.nodeVersion)
    assert.isNotEmpty(status.nodeVersion)
    assert.isString(status.panelVersion)
    assert.isNotEmpty(status.panelVersion)
    assert.isString(status.processUser)
    assert.isNotEmpty(status.processUser)
    assert.isString(status.panelTime)
    assert.isNotEmpty(status.panelTime)
    assert.isArray(status.loadAverage)
    assert.lengthOf(status.loadAverage, 3)
    assert.isString(status.hostMachine)
    assert.isNotEmpty(status.hostMachine)
    assert.isString(status.osEnvironment)
    assert.isNotEmpty(status.osEnvironment)
    assert.isString(status.containerEngine)
    assert.isNotEmpty(status.containerEngine)
  })

  test('deleting an instance permits recreating with the same serverPort immediately', async ({
    client,
    assert,
  }) => {
    const admin = await User.create({
      fullName: 'Admin Recreate',
      email: 'admin-recreate@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    const targetPort = 25588
    const id1 = `test-recreate-1-${Date.now()}`

    // 1. Create initial server
    const create1 = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Server 1',
      identifier: id1,
      serverPort: targetPort,
    })
    create1.assertStatus(201)
    const server1 = (create1.body() as any).data

    // 2. Delete server 1
    const delRes = await client.delete(`/api/v1/servers/${server1.id}`).loginAs(admin)
    delRes.assertStatus(204)

    // 3. Immediately recreate server 2 using the same port
    const id2 = `test-recreate-2-${Date.now()}`
    const create2 = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Server 2',
      identifier: id2,
      serverPort: targetPort,
    })
    create2.assertStatus(201)
    const server2 = (create2.body() as any).data
    assert.equal(server2.serverPort, targetPort)
  })

  test('deleting an instance automatically strips its id from assigned users serverIds', async ({
    client,
    assert,
  }) => {
    const admin = await User.create({
      fullName: 'Admin Sync',
      email: 'admin-sync@pidan.local',
      password: 'password123',
      role: 'admin',
    })

    // 1. Create a server
    const createRes = await client.post('/api/v1/servers').loginAs(admin).json({
      name: 'Server For User Sync',
      identifier: `sync-srv-${Date.now()}`,
      serverPort: 25589,
    })
    createRes.assertStatus(201)
    const server = (createRes.body() as any).data

    // 2. Create a normal user and assign this server + a dummy server
    const normalUser = await User.create({
      fullName: 'Assigned User',
      email: 'assigned-user@pidan.local',
      password: 'password123',
      role: 'user',
      serverIds: [server.id, 99999],
    })

    assert.include(normalUser.serverIds, server.id)

    // 3. Delete the server
    const delRes = await client.delete(`/api/v1/servers/${server.id}`).loginAs(admin)
    delRes.assertStatus(204)

    // 4. Reload user and verify server.id has been stripped
    await normalUser.refresh()
    assert.notInclude(normalUser.serverIds, server.id)
    assert.deepEqual(normalUser.serverIds, [99999])
  })
})
