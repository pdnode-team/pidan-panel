/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'
import { healthChecks } from '#start/health'

router.get('/', () => {
  return { name: 'pidan-panel', status: 'operational' }
})

router.get('/health', async ({ response }) => {
  const report = await healthChecks.run()
  if (report.isHealthy) {
    return response.ok(report)
  }
  return response.serviceUnavailable(report)
})

router
  .group(() => {
    // Public health, auth and setup routes
    router.get('health', async ({ response }) => {
      const report = await healthChecks.run()
      if (report.isHealthy) {
        return response.ok(report)
      }
      return response.serviceUnavailable(report)
    })

    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router.get('system/setup-status', async ({ serialize }) => {
      const userModule = await import('#models/user')
      const User = userModule.default
      const countResult = await User.query().count('* as total')
      const total = Number((countResult[0] as any).$extras.total)
      return serialize({ needsSetup: total === 0 })
    })

    // Authenticated management routes
    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])

        // System status and host metrics
        router.get('system/status', [controllers.SystemStatus, 'show'])

        // MCJars API version discovery
        router.get('mcjars/types', [controllers.McJarTypes, 'index'])
        router.get('mcjars/types/:type', [controllers.McJarTypes, 'show'])

        // Users resource (Admin only)
        router
          .resource('users', controllers.Users)
          .apiOnly()
          .where('id', router.matchers.number())
          .use('*', middleware.admin())

        // Global audit logs (Admin only)
        router.get('audit-logs', [controllers.AuditLogs, 'index']).use(middleware.admin())

        // Servers resource (index, store, show, update, destroy)
        router
          .resource('servers', controllers.McServers)
          .apiOnly()
          .where('id', router.matchers.number())

        // Sub-resources under servers/:id (Requires admin or assigned ownership)
        router
          .group(() => {
            // Container power & lifecycle (show, store, destroy, update)
            router.get('power', [controllers.ServerPowerStates, 'show'])
            router.post('power', [controllers.ServerPowerStates, 'store'])
            router.delete('power', [controllers.ServerPowerStates, 'destroy'])
            router.patch('power', [controllers.ServerPowerStates, 'update'])

            // Console command dispatch
            router.post('commands', [controllers.ServerCommands, 'store'])

            // Real-time console logs (SSE stream)
            router.get('logs', [controllers.ServerLogs, 'show'])

            // Server audit logs (Admin or assigned owner)
            router.get('audit-logs', [controllers.ServerAuditLogs, 'index'])

            // Historical log archives (.log.gz and .log)
            router.get('logs/archives', [controllers.ServerLogArchives, 'index'])
            router.get('logs/archives/:filename/download', [
              controllers.ServerLogArchives,
              'download',
            ])
            router.get('logs/archives/:filename', [controllers.ServerLogArchives, 'show'])

            // Hardware resource metrics snapshot and SSE stream
            router.get('stats', [controllers.ServerStats, 'show'])

            // Jailed file management
            router.get('files', [controllers.ServerFiles, 'index'])
            router.get('files/content', [controllers.ServerFiles, 'show'])
            router.post('files', [controllers.ServerFiles, 'store'])
            router.patch('files', [controllers.ServerFiles, 'update'])
            router.delete('files', [controllers.ServerFiles, 'destroy'])

            // Server jar download and installation via McJars / URL
            router.post('jars', [controllers.ServerJars, 'store'])

            // Instance snapshots
            router.get('backups', [controllers.ServerBackups, 'index'])
            router.post('backups', [controllers.ServerBackups, 'store'])
            router
              .get('backups/:backupId', [controllers.ServerBackups, 'show'])
              .where('backupId', router.matchers.number())
            router
              .delete('backups/:backupId', [controllers.ServerBackups, 'destroy'])
              .where('backupId', router.matchers.number())
            router
              .get('backups/:backupId/download', [controllers.ServerBackupDownloads, 'show'])
              .where('backupId', router.matchers.number())
            router
              .post('backups/:backupId/restorations', [
                controllers.ServerBackupRestorations,
                'store',
              ])
              .where('backupId', router.matchers.number())

            // Instance cron schedules (Admin only)
            router
              .group(() => {
                router.get('schedules', [controllers.ServerSchedules, 'index'])
                router.post('schedules', [controllers.ServerSchedules, 'store'])
                router
                  .get('schedules/:scheduleId', [controllers.ServerSchedules, 'show'])
                  .where('scheduleId', router.matchers.number())
                router
                  .patch('schedules/:scheduleId', [controllers.ServerSchedules, 'update'])
                  .where('scheduleId', router.matchers.number())
                router
                  .delete('schedules/:scheduleId', [controllers.ServerSchedules, 'destroy'])
                  .where('scheduleId', router.matchers.number())
                router
                  .post('schedules/:scheduleId/runs', [controllers.ServerSchedules, 'run'])
                  .where('scheduleId', router.matchers.number())
              })
              .use(middleware.admin())
          })
          .prefix('servers/:id')
          .where('id', router.matchers.number())
          .use(middleware.serverAccess())
      })
      .use(middleware.auth())
  })
  .prefix('/api/v1')
