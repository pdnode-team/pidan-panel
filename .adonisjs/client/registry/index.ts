/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'auth.new_account.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/signup',
    tokens: [{"old":"/api/v1/auth/signup","type":0,"val":"api","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['auth.new_account.store']['types'],
  },
  'auth.access_tokens.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [{"old":"/api/v1/auth/login","type":0,"val":"api","end":""},{"old":"/api/v1/auth/login","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/login","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['auth.access_tokens.store']['types'],
  },
  'profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/profile',
    tokens: [{"old":"/api/v1/profile","type":0,"val":"api","end":""},{"old":"/api/v1/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['profile.show']['types'],
  },
  'access_tokens.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/logout',
    tokens: [{"old":"/api/v1/logout","type":0,"val":"api","end":""},{"old":"/api/v1/logout","type":0,"val":"v1","end":""},{"old":"/api/v1/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['access_tokens.destroy']['types'],
  },
  'system_status.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/system/status',
    tokens: [{"old":"/api/v1/system/status","type":0,"val":"api","end":""},{"old":"/api/v1/system/status","type":0,"val":"v1","end":""},{"old":"/api/v1/system/status","type":0,"val":"system","end":""},{"old":"/api/v1/system/status","type":0,"val":"status","end":""}],
    types: placeholder as Registry['system_status.show']['types'],
  },
  'mc_jar_types.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/mcjars/types',
    tokens: [{"old":"/api/v1/mcjars/types","type":0,"val":"api","end":""},{"old":"/api/v1/mcjars/types","type":0,"val":"v1","end":""},{"old":"/api/v1/mcjars/types","type":0,"val":"mcjars","end":""},{"old":"/api/v1/mcjars/types","type":0,"val":"types","end":""}],
    types: placeholder as Registry['mc_jar_types.index']['types'],
  },
  'mc_jar_types.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/mcjars/types/:type',
    tokens: [{"old":"/api/v1/mcjars/types/:type","type":0,"val":"api","end":""},{"old":"/api/v1/mcjars/types/:type","type":0,"val":"v1","end":""},{"old":"/api/v1/mcjars/types/:type","type":0,"val":"mcjars","end":""},{"old":"/api/v1/mcjars/types/:type","type":0,"val":"types","end":""},{"old":"/api/v1/mcjars/types/:type","type":1,"val":"type","end":""}],
    types: placeholder as Registry['mc_jar_types.show']['types'],
  },
  'users.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/users',
    tokens: [{"old":"/api/v1/users","type":0,"val":"api","end":""},{"old":"/api/v1/users","type":0,"val":"v1","end":""},{"old":"/api/v1/users","type":0,"val":"users","end":""}],
    types: placeholder as Registry['users.index']['types'],
  },
  'users.store': {
    methods: ["POST"],
    pattern: '/api/v1/users',
    tokens: [{"old":"/api/v1/users","type":0,"val":"api","end":""},{"old":"/api/v1/users","type":0,"val":"v1","end":""},{"old":"/api/v1/users","type":0,"val":"users","end":""}],
    types: placeholder as Registry['users.store']['types'],
  },
  'users.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/users/:id',
    tokens: [{"old":"/api/v1/users/:id","type":0,"val":"api","end":""},{"old":"/api/v1/users/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/users/:id","type":0,"val":"users","end":""},{"old":"/api/v1/users/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['users.show']['types'],
  },
  'users.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/users/:id',
    tokens: [{"old":"/api/v1/users/:id","type":0,"val":"api","end":""},{"old":"/api/v1/users/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/users/:id","type":0,"val":"users","end":""},{"old":"/api/v1/users/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['users.update']['types'],
  },
  'users.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/users/:id',
    tokens: [{"old":"/api/v1/users/:id","type":0,"val":"api","end":""},{"old":"/api/v1/users/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/users/:id","type":0,"val":"users","end":""},{"old":"/api/v1/users/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['users.destroy']['types'],
  },
  'servers.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/servers',
    tokens: [{"old":"/api/v1/servers","type":0,"val":"api","end":""},{"old":"/api/v1/servers","type":0,"val":"v1","end":""},{"old":"/api/v1/servers","type":0,"val":"servers","end":""}],
    types: placeholder as Registry['servers.index']['types'],
  },
  'servers.store': {
    methods: ["POST"],
    pattern: '/api/v1/servers',
    tokens: [{"old":"/api/v1/servers","type":0,"val":"api","end":""},{"old":"/api/v1/servers","type":0,"val":"v1","end":""},{"old":"/api/v1/servers","type":0,"val":"servers","end":""}],
    types: placeholder as Registry['servers.store']['types'],
  },
  'servers.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/servers/:id',
    tokens: [{"old":"/api/v1/servers/:id","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['servers.show']['types'],
  },
  'servers.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/servers/:id',
    tokens: [{"old":"/api/v1/servers/:id","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['servers.update']['types'],
  },
  'servers.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/servers/:id',
    tokens: [{"old":"/api/v1/servers/:id","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['servers.destroy']['types'],
  },
  'server_power_states.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/servers/:id/power',
    tokens: [{"old":"/api/v1/servers/:id/power","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/power","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/power","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/power","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/power","type":0,"val":"power","end":""}],
    types: placeholder as Registry['server_power_states.show']['types'],
  },
  'server_power_states.store': {
    methods: ["POST"],
    pattern: '/api/v1/servers/:id/power',
    tokens: [{"old":"/api/v1/servers/:id/power","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/power","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/power","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/power","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/power","type":0,"val":"power","end":""}],
    types: placeholder as Registry['server_power_states.store']['types'],
  },
  'server_power_states.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/servers/:id/power',
    tokens: [{"old":"/api/v1/servers/:id/power","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/power","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/power","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/power","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/power","type":0,"val":"power","end":""}],
    types: placeholder as Registry['server_power_states.destroy']['types'],
  },
  'server_power_states.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/servers/:id/power',
    tokens: [{"old":"/api/v1/servers/:id/power","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/power","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/power","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/power","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/power","type":0,"val":"power","end":""}],
    types: placeholder as Registry['server_power_states.update']['types'],
  },
  'server_commands.store': {
    methods: ["POST"],
    pattern: '/api/v1/servers/:id/commands',
    tokens: [{"old":"/api/v1/servers/:id/commands","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/commands","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/commands","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/commands","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/commands","type":0,"val":"commands","end":""}],
    types: placeholder as Registry['server_commands.store']['types'],
  },
  'server_logs.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/servers/:id/logs',
    tokens: [{"old":"/api/v1/servers/:id/logs","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/logs","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/logs","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/logs","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/logs","type":0,"val":"logs","end":""}],
    types: placeholder as Registry['server_logs.show']['types'],
  },
  'server_stats.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/servers/:id/stats',
    tokens: [{"old":"/api/v1/servers/:id/stats","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/stats","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/stats","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/stats","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/stats","type":0,"val":"stats","end":""}],
    types: placeholder as Registry['server_stats.show']['types'],
  },
  'server_files.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/servers/:id/files',
    tokens: [{"old":"/api/v1/servers/:id/files","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/files","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/files","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/files","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/files","type":0,"val":"files","end":""}],
    types: placeholder as Registry['server_files.index']['types'],
  },
  'server_files.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/servers/:id/files/content',
    tokens: [{"old":"/api/v1/servers/:id/files/content","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/files/content","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/files/content","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/files/content","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/files/content","type":0,"val":"files","end":""},{"old":"/api/v1/servers/:id/files/content","type":0,"val":"content","end":""}],
    types: placeholder as Registry['server_files.show']['types'],
  },
  'server_files.store': {
    methods: ["POST"],
    pattern: '/api/v1/servers/:id/files',
    tokens: [{"old":"/api/v1/servers/:id/files","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/files","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/files","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/files","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/files","type":0,"val":"files","end":""}],
    types: placeholder as Registry['server_files.store']['types'],
  },
  'server_files.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/servers/:id/files',
    tokens: [{"old":"/api/v1/servers/:id/files","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/files","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/files","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/files","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/files","type":0,"val":"files","end":""}],
    types: placeholder as Registry['server_files.update']['types'],
  },
  'server_files.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/servers/:id/files',
    tokens: [{"old":"/api/v1/servers/:id/files","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/files","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/files","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/files","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/files","type":0,"val":"files","end":""}],
    types: placeholder as Registry['server_files.destroy']['types'],
  },
  'server_jars.store': {
    methods: ["POST"],
    pattern: '/api/v1/servers/:id/jars',
    tokens: [{"old":"/api/v1/servers/:id/jars","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/jars","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/jars","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/jars","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/jars","type":0,"val":"jars","end":""}],
    types: placeholder as Registry['server_jars.store']['types'],
  },
  'server_backups.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/servers/:id/backups',
    tokens: [{"old":"/api/v1/servers/:id/backups","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/backups","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/backups","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/backups","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/backups","type":0,"val":"backups","end":""}],
    types: placeholder as Registry['server_backups.index']['types'],
  },
  'server_backups.store': {
    methods: ["POST"],
    pattern: '/api/v1/servers/:id/backups',
    tokens: [{"old":"/api/v1/servers/:id/backups","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/backups","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/backups","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/backups","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/backups","type":0,"val":"backups","end":""}],
    types: placeholder as Registry['server_backups.store']['types'],
  },
  'server_backups.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/servers/:id/backups/:backupId',
    tokens: [{"old":"/api/v1/servers/:id/backups/:backupId","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/backups/:backupId","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/backups/:backupId","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/backups/:backupId","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/backups/:backupId","type":0,"val":"backups","end":""},{"old":"/api/v1/servers/:id/backups/:backupId","type":1,"val":"backupId","end":""}],
    types: placeholder as Registry['server_backups.show']['types'],
  },
  'server_backups.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/servers/:id/backups/:backupId',
    tokens: [{"old":"/api/v1/servers/:id/backups/:backupId","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/backups/:backupId","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/backups/:backupId","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/backups/:backupId","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/backups/:backupId","type":0,"val":"backups","end":""},{"old":"/api/v1/servers/:id/backups/:backupId","type":1,"val":"backupId","end":""}],
    types: placeholder as Registry['server_backups.destroy']['types'],
  },
  'server_backup_downloads.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/servers/:id/backups/:backupId/download',
    tokens: [{"old":"/api/v1/servers/:id/backups/:backupId/download","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/backups/:backupId/download","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/backups/:backupId/download","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/backups/:backupId/download","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/backups/:backupId/download","type":0,"val":"backups","end":""},{"old":"/api/v1/servers/:id/backups/:backupId/download","type":1,"val":"backupId","end":""},{"old":"/api/v1/servers/:id/backups/:backupId/download","type":0,"val":"download","end":""}],
    types: placeholder as Registry['server_backup_downloads.show']['types'],
  },
  'server_backup_restorations.store': {
    methods: ["POST"],
    pattern: '/api/v1/servers/:id/backups/:backupId/restorations',
    tokens: [{"old":"/api/v1/servers/:id/backups/:backupId/restorations","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/backups/:backupId/restorations","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/backups/:backupId/restorations","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/backups/:backupId/restorations","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/backups/:backupId/restorations","type":0,"val":"backups","end":""},{"old":"/api/v1/servers/:id/backups/:backupId/restorations","type":1,"val":"backupId","end":""},{"old":"/api/v1/servers/:id/backups/:backupId/restorations","type":0,"val":"restorations","end":""}],
    types: placeholder as Registry['server_backup_restorations.store']['types'],
  },
  'server_schedules.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/servers/:id/schedules',
    tokens: [{"old":"/api/v1/servers/:id/schedules","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/schedules","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/schedules","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/schedules","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/schedules","type":0,"val":"schedules","end":""}],
    types: placeholder as Registry['server_schedules.index']['types'],
  },
  'server_schedules.store': {
    methods: ["POST"],
    pattern: '/api/v1/servers/:id/schedules',
    tokens: [{"old":"/api/v1/servers/:id/schedules","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/schedules","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/schedules","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/schedules","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/schedules","type":0,"val":"schedules","end":""}],
    types: placeholder as Registry['server_schedules.store']['types'],
  },
  'server_schedules.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/servers/:id/schedules/:scheduleId',
    tokens: [{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":0,"val":"schedules","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":1,"val":"scheduleId","end":""}],
    types: placeholder as Registry['server_schedules.show']['types'],
  },
  'server_schedules.update': {
    methods: ["PATCH"],
    pattern: '/api/v1/servers/:id/schedules/:scheduleId',
    tokens: [{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":0,"val":"schedules","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":1,"val":"scheduleId","end":""}],
    types: placeholder as Registry['server_schedules.update']['types'],
  },
  'server_schedules.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/servers/:id/schedules/:scheduleId',
    tokens: [{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":0,"val":"schedules","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId","type":1,"val":"scheduleId","end":""}],
    types: placeholder as Registry['server_schedules.destroy']['types'],
  },
  'server_schedules.run': {
    methods: ["POST"],
    pattern: '/api/v1/servers/:id/schedules/:scheduleId/runs',
    tokens: [{"old":"/api/v1/servers/:id/schedules/:scheduleId/runs","type":0,"val":"api","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId/runs","type":0,"val":"v1","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId/runs","type":0,"val":"servers","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId/runs","type":1,"val":"id","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId/runs","type":0,"val":"schedules","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId/runs","type":1,"val":"scheduleId","end":""},{"old":"/api/v1/servers/:id/schedules/:scheduleId/runs","type":0,"val":"runs","end":""}],
    types: placeholder as Registry['server_schedules.run']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
