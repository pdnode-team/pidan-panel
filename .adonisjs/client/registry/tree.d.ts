/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    newAccount: {
      store: typeof routes['auth.new_account.store']
    }
    accessTokens: {
      store: typeof routes['auth.access_tokens.store']
    }
  }
  profile: {
    show: typeof routes['profile.show']
  }
  accessTokens: {
    destroy: typeof routes['access_tokens.destroy']
  }
  systemStatus: {
    show: typeof routes['system_status.show']
  }
  mcJarTypes: {
    index: typeof routes['mc_jar_types.index']
    show: typeof routes['mc_jar_types.show']
  }
  users: {
    index: typeof routes['users.index']
    store: typeof routes['users.store']
    show: typeof routes['users.show']
    update: typeof routes['users.update']
    destroy: typeof routes['users.destroy']
  }
  servers: {
    index: typeof routes['servers.index']
    store: typeof routes['servers.store']
    show: typeof routes['servers.show']
    update: typeof routes['servers.update']
    destroy: typeof routes['servers.destroy']
  }
  serverPowerStates: {
    show: typeof routes['server_power_states.show']
    store: typeof routes['server_power_states.store']
    destroy: typeof routes['server_power_states.destroy']
    update: typeof routes['server_power_states.update']
  }
  serverCommands: {
    store: typeof routes['server_commands.store']
  }
  serverLogs: {
    show: typeof routes['server_logs.show']
  }
  serverStats: {
    show: typeof routes['server_stats.show']
  }
  serverFiles: {
    index: typeof routes['server_files.index']
    show: typeof routes['server_files.show']
    store: typeof routes['server_files.store']
    update: typeof routes['server_files.update']
    destroy: typeof routes['server_files.destroy']
  }
  serverJars: {
    store: typeof routes['server_jars.store']
  }
  serverBackups: {
    index: typeof routes['server_backups.index']
    store: typeof routes['server_backups.store']
    show: typeof routes['server_backups.show']
    destroy: typeof routes['server_backups.destroy']
  }
  serverBackupDownloads: {
    show: typeof routes['server_backup_downloads.show']
  }
  serverBackupRestorations: {
    store: typeof routes['server_backup_restorations.store']
  }
}
