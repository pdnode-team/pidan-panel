import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Global Health Checks', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /api/v1/health returns health check report with system, database and docker checks', async ({
    client,
    assert,
  }) => {
    const res = await client.get('/api/v1/health')
    assert.oneOf(res.status(), [200, 503])

    const body = res.body()
    assert.isDefined(body.isHealthy)
    assert.isArray(body.checks)

    const checkNames = body.checks.map((c: any) => c.name)
    assert.include(checkNames, 'Disk space check')
    assert.include(checkNames, 'Memory heap check')
    assert.isTrue(checkNames.some((n: string) => n.includes('Database health check')))
    assert.include(checkNames, 'Docker engine check')
  })

  test('GET /health top-level alias also returns the health check report', async ({
    client,
    assert,
  }) => {
    const res = await client.get('/health')
    assert.oneOf(res.status(), [200, 503])
    const body = res.body()
    assert.isDefined(body.isHealthy)
    assert.isArray(body.checks)
  })
})
