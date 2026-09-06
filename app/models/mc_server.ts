import app from '@adonisjs/core/services/app'
import { McServerSchema } from '#database/schema'

export default class McServer extends McServerSchema {
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
