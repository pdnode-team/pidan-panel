import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'system_status.show': { paramsTuple?: []; params?: {} }
    'mc_jar_types.index': { paramsTuple?: []; params?: {} }
    'mc_jar_types.show': { paramsTuple: [ParamValue]; params: {'type': ParamValue} }
    'users.index': { paramsTuple?: []; params?: {} }
    'users.store': { paramsTuple?: []; params?: {} }
    'users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'servers.index': { paramsTuple?: []; params?: {} }
    'servers.store': { paramsTuple?: []; params?: {} }
    'servers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'servers.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'servers.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_power_states.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_power_states.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_power_states.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_power_states.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_commands.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_logs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_stats.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_files.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_files.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_files.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_files.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_files.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_jars.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_backups.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_backups.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_backups.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'backupId': ParamValue} }
    'server_backups.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'backupId': ParamValue} }
    'server_backup_downloads.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'backupId': ParamValue} }
    'server_backup_restorations.store': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'backupId': ParamValue} }
    'server_schedules.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_schedules.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_schedules.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'scheduleId': ParamValue} }
    'server_schedules.update': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'scheduleId': ParamValue} }
    'server_schedules.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'scheduleId': ParamValue} }
    'server_schedules.run': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'scheduleId': ParamValue} }
  }
  GET: {
    'profile.show': { paramsTuple?: []; params?: {} }
    'system_status.show': { paramsTuple?: []; params?: {} }
    'mc_jar_types.index': { paramsTuple?: []; params?: {} }
    'mc_jar_types.show': { paramsTuple: [ParamValue]; params: {'type': ParamValue} }
    'users.index': { paramsTuple?: []; params?: {} }
    'users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'servers.index': { paramsTuple?: []; params?: {} }
    'servers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_power_states.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_logs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_stats.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_files.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_files.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_backups.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_backups.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'backupId': ParamValue} }
    'server_backup_downloads.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'backupId': ParamValue} }
    'server_schedules.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_schedules.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'scheduleId': ParamValue} }
  }
  HEAD: {
    'profile.show': { paramsTuple?: []; params?: {} }
    'system_status.show': { paramsTuple?: []; params?: {} }
    'mc_jar_types.index': { paramsTuple?: []; params?: {} }
    'mc_jar_types.show': { paramsTuple: [ParamValue]; params: {'type': ParamValue} }
    'users.index': { paramsTuple?: []; params?: {} }
    'users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'servers.index': { paramsTuple?: []; params?: {} }
    'servers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_power_states.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_logs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_stats.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_files.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_files.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_backups.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_backups.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'backupId': ParamValue} }
    'server_backup_downloads.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'backupId': ParamValue} }
    'server_schedules.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_schedules.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'scheduleId': ParamValue} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'users.store': { paramsTuple?: []; params?: {} }
    'servers.store': { paramsTuple?: []; params?: {} }
    'server_power_states.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_commands.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_files.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_jars.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_backups.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_backup_restorations.store': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'backupId': ParamValue} }
    'server_schedules.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_schedules.run': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'scheduleId': ParamValue} }
  }
  PUT: {
    'users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'servers.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'servers.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_power_states.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_files.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_schedules.update': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'scheduleId': ParamValue} }
  }
  DELETE: {
    'users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'servers.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_power_states.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_files.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'server_backups.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'backupId': ParamValue} }
    'server_schedules.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'scheduleId': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}