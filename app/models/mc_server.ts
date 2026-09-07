import app from '@adonisjs/core/services/app'
import { McServerSchema } from '#database/schema'
import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import ServerBackup from '#models/server_backup'
import ServerSchedule from '#models/server_schedule'

export default class McServer extends McServerSchema {
  @column({ consume: (v) => Boolean(v) })
  declare autoStartOnBoot: boolean

  @column({ consume: (v) => Boolean(v) })
  declare autoRestartOnCrash: boolean

  @hasMany(() => ServerBackup)
  declare backups: HasMany<typeof ServerBackup>

  @hasMany(() => ServerSchedule)
  declare schedules: HasMany<typeof ServerSchedule>

  /**
   * Dedicated container name for this instance
   */
  get containerName(): string {
    return `pidan-mc-${this.identifier}`
  }

  /**
   * Absolute path to the host data directory for this instance
   */
  get dataDirectory(): string {
    return app.makePath('data/servers', this.identifier)
  }

  /**
   * Absolute path to the snapshot directory for this instance (outside the data jail)
   */
  get backupDirectory(): string {
    return app.makePath('data/backups', this.identifier)
  }

  /**
   * Formatted JVM options array
   */
  get jvmOptions(): string[] {
    const opts = [`-Xms${this.minMemoryMb}M`, `-Xmx${this.maxMemoryMb}M`]
    if (this.javaArgs && this.javaArgs.trim()) {
      const extra = this.javaArgs
        .trim()
        .split(/\s+/)
        .filter((arg) => arg.length > 0)
      opts.push(...extra)
    }
    return opts
  }
}
