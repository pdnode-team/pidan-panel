/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'auth.new_account.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.access_tokens.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'access_tokens.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
    }
  }
  'system_status.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/system/status'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/system_status_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/system_status_controller').default['show']>>>
    }
  }
  'mc_jar_types.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/mcjars/types'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/mc_jar_types_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/mc_jar_types_controller').default['index']>>>
    }
  }
  'mc_jar_types.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/mcjars/types/:type'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { type: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/mc_jar_types_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/mc_jar_types_controller').default['show']>>>
    }
  }
  'users.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/users'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/users_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/users_controller').default['index']>>>
    }
  }
  'users.store': {
    methods: ["POST"]
    pattern: '/api/v1/users'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').createUserValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').createUserValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/users_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/users_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'users.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/users/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/users_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/users_controller').default['show']>>>
    }
  }
  'users.update': {
    methods: ["PUT","PATCH"]
    pattern: '/api/v1/users/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').updateUserValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/user').updateUserValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/users_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/users_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'users.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/users/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/users_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/users_controller').default['destroy']>>>
    }
  }
  'audit_logs.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/audit-logs'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/audit_log').auditLogFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/audit_logs_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/audit_logs_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'servers.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/servers'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/mc_servers_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/mc_servers_controller').default['index']>>>
    }
  }
  'servers.store': {
    methods: ["POST"]
    pattern: '/api/v1/servers'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/mc_server').createMcServerValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/mc_server').createMcServerValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/mc_servers_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/mc_servers_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'servers.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/servers/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/mc_servers_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/mc_servers_controller').default['show']>>>
    }
  }
  'servers.update': {
    methods: ["PUT","PATCH"]
    pattern: '/api/v1/servers/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/mc_server').updateMcServerValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/mc_server').updateMcServerValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/mc_servers_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/mc_servers_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'servers.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/servers/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/mc_servers_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/mc_servers_controller').default['destroy']>>>
    }
  }
  'server_power_states.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/servers/:id/power'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_power_states_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_power_states_controller').default['show']>>>
    }
  }
  'server_power_states.store': {
    methods: ["POST"]
    pattern: '/api/v1/servers/:id/power'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_power_states_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_power_states_controller').default['store']>>>
    }
  }
  'server_power_states.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/servers/:id/power'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_power_states_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_power_states_controller').default['destroy']>>>
    }
  }
  'server_power_states.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/servers/:id/power'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_power_states_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_power_states_controller').default['update']>>>
    }
  }
  'server_commands.store': {
    methods: ["POST"]
    pattern: '/api/v1/servers/:id/commands'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/server_command').dispatchServerCommandValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/server_command').dispatchServerCommandValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_commands_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_commands_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'server_logs.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/servers/:id/logs'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_logs_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_logs_controller').default['show']>>>
    }
  }
  'server_audit_logs.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/servers/:id/audit-logs'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/audit_log').auditLogFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_audit_logs_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_audit_logs_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'server_log_archives.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/servers/:id/logs/archives'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_log_archives_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_log_archives_controller').default['index']>>>
    }
  }
  'server_log_archives.download': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/servers/:id/logs/archives/:filename/download'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; filename: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_log_archives_controller').default['download']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_log_archives_controller').default['download']>>>
    }
  }
  'server_log_archives.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/servers/:id/logs/archives/:filename'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; filename: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/audit_log').logArchiveFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_log_archives_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_log_archives_controller').default['show']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'server_stats.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/servers/:id/stats'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_stats_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_stats_controller').default['show']>>>
    }
  }
  'server_files.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/servers/:id/files'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_files_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_files_controller').default['index']>>>
    }
  }
  'server_files.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/servers/:id/files/content'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_files_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_files_controller').default['show']>>>
    }
  }
  'server_files.store': {
    methods: ["POST"]
    pattern: '/api/v1/servers/:id/files'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/server_file').uploadServerFileValidator)>|InferInput<(typeof import('#validators/server_file').saveServerFileValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/server_file').uploadServerFileValidator)>|InferInput<(typeof import('#validators/server_file').saveServerFileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_files_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_files_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'server_files.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/servers/:id/files'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/server_file').renameServerFileValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/server_file').renameServerFileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_files_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_files_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'server_files.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/servers/:id/files'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_files_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_files_controller').default['destroy']>>>
    }
  }
  'server_jars.store': {
    methods: ["POST"]
    pattern: '/api/v1/servers/:id/jars'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/server_jar').installServerJarValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/server_jar').installServerJarValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_jars_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_jars_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'server_backups.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/servers/:id/backups'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_backups_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_backups_controller').default['index']>>>
    }
  }
  'server_backups.store': {
    methods: ["POST"]
    pattern: '/api/v1/servers/:id/backups'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/server_backup').createServerBackupValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/server_backup').createServerBackupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_backups_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_backups_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'server_backups.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/servers/:id/backups/:backupId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; backupId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_backups_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_backups_controller').default['show']>>>
    }
  }
  'server_backups.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/servers/:id/backups/:backupId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; backupId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_backups_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_backups_controller').default['destroy']>>>
    }
  }
  'server_backup_downloads.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/servers/:id/backups/:backupId/download'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; backupId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_backup_downloads_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_backup_downloads_controller').default['show']>>>
    }
  }
  'server_backup_restorations.store': {
    methods: ["POST"]
    pattern: '/api/v1/servers/:id/backups/:backupId/restorations'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; backupId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_backup_restorations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_backup_restorations_controller').default['store']>>>
    }
  }
  'server_schedules.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/servers/:id/schedules'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_schedules_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_schedules_controller').default['index']>>>
    }
  }
  'server_schedules.store': {
    methods: ["POST"]
    pattern: '/api/v1/servers/:id/schedules'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/server_schedule').createServerScheduleValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/server_schedule').createServerScheduleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_schedules_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_schedules_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'server_schedules.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/servers/:id/schedules/:scheduleId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; scheduleId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_schedules_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_schedules_controller').default['show']>>>
    }
  }
  'server_schedules.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/servers/:id/schedules/:scheduleId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/server_schedule').updateServerScheduleValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; scheduleId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/server_schedule').updateServerScheduleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_schedules_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_schedules_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'server_schedules.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/servers/:id/schedules/:scheduleId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; scheduleId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_schedules_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_schedules_controller').default['destroy']>>>
    }
  }
  'server_schedules.run': {
    methods: ["POST"]
    pattern: '/api/v1/servers/:id/schedules/:scheduleId/runs'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; scheduleId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/server_schedules_controller').default['run']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/server_schedules_controller').default['run']>>>
    }
  }
}
