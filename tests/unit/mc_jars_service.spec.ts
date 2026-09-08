import { test } from '@japa/runner'
import McJarsService from '#services/mc_jars_service'

test.group('McJars jar filename jail', () => {
  test('sanitizeJarFileName strips anything that could escape the data directory', ({ assert }) => {
    assert.equal(McJarsService.sanitizeJarFileName('../../etc/passwd'), 'passwd')
    assert.equal(McJarsService.sanitizeJarFileName('..\\..\\evil.jar'), 'evil.jar')
    assert.equal(McJarsService.sanitizeJarFileName('/etc/passwd'), 'passwd')
    assert.equal(McJarsService.sanitizeJarFileName('C:\\Windows\\evil.jar'), 'evil.jar')
    assert.equal(McJarsService.sanitizeJarFileName('..'), 'server.jar')
    assert.equal(McJarsService.sanitizeJarFileName('.'), 'server.jar')
    assert.equal(McJarsService.sanitizeJarFileName(''), 'server.jar')
    assert.equal(McJarsService.sanitizeJarFileName('paper-1.21.jar'), 'paper-1.21.jar')
  })

  test('isPrivateAddress classifies non-routable networks', ({ assert }) => {
    assert.isTrue(McJarsService.isPrivateAddress('127.0.0.1'))
    assert.isTrue(McJarsService.isPrivateAddress('10.1.2.3'))
    assert.isTrue(McJarsService.isPrivateAddress('172.16.0.1'))
    assert.isTrue(McJarsService.isPrivateAddress('172.31.255.255'))
    assert.isTrue(McJarsService.isPrivateAddress('192.168.1.1'))
    assert.isTrue(McJarsService.isPrivateAddress('169.254.169.254'))
    assert.isTrue(McJarsService.isPrivateAddress('100.64.0.1'))
    assert.isTrue(McJarsService.isPrivateAddress('0.1.2.3'))
    assert.isTrue(McJarsService.isPrivateAddress('::1'))
    assert.isTrue(McJarsService.isPrivateAddress('fd00::1'))
    assert.isTrue(McJarsService.isPrivateAddress('fe80::1'))
    assert.isTrue(McJarsService.isPrivateAddress('::ffff:192.168.0.1'))

    assert.isFalse(McJarsService.isPrivateAddress('8.8.8.8'))
    assert.isFalse(McJarsService.isPrivateAddress('172.32.0.1'))
    assert.isFalse(McJarsService.isPrivateAddress('100.128.0.1'))
    assert.isFalse(McJarsService.isPrivateAddress('2606:4700::1111'))
  })
})
