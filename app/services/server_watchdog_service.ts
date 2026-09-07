import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import McServer from '#models/mc_server'
import McContainerService from '#services/mc_container_service'
import ServerBackupService from '#services/server_backup_service'

export interface ServerWatchdogState {
  serverId: number
  desiredState: 'running' | 'stopped'
  crashAttempts: number
  pendingTimer: NodeJS.Timeout | null
  nextRetryAt: Date | null
  stabilityTimer: NodeJS.Timeout | null
  haltedReason: string | null
}

export interface ServerRestartStatus {
  isWaitingRestart: boolean
  nextRetryInSeconds: number | null
  crashAttempts: number
  maxRetries: number
  haltedReason: string | null
}

const globalServerStates = new Map<number, ServerWatchdogState>()

@inject()
export default class ServerWatchdogService {
  protected serverStates = globalServerStates
  protected pollTimer: NodeJS.Timeout | null = null
  protected eventStream: any = null
  protected stabilityWindowMs = 60000 // 60 seconds of running resets crashAttempts

  constructor(
    protected containerService: McContainerService,
    protected backupService: ServerBackupService
  ) {}

  /**
   * Calculate exponential backoff delay in seconds:
   * delay = min(initial * 2^(attempt - 1), max)
   */
  calculateBackoffDelay(server: McServer, attempt: number): number {
    const initial = server.crashBackoffInitialSeconds ?? 5
    const max = server.crashBackoffMaxSeconds ?? 300
    const factor = Math.pow(2, Math.max(0, attempt - 1))
    const delay = initial * factor
    return Math.min(delay, max)
  }

  /**
   * Get or create in-memory state tracking for a server instance
   */
  protected getOrCreateState(serverId: number): ServerWatchdogState {
    let state = this.serverStates.get(serverId)
    if (!state) {
      state = {
        serverId,
        desiredState: 'stopped',
        crashAttempts: 0,
        pendingTimer: null,
        nextRetryAt: null,
        stabilityTimer: null,
        haltedReason: null,
      }
      this.serverStates.set(serverId, state)
    }
    return state
  }

  /**
   * Automatically start servers configured with autoStartOnBoot
   */
  async bootstrapAutoStart(): Promise<void> {
    try {
      const servers = await McServer.query().where('autoStartOnBoot', true)
      for (const server of servers) {
        try {
          const runtime = await this.containerService.getContainerStatus(server)
          if (runtime.status === 'stopped') {
            logger.info(`[Watchdog] Auto-starting server on boot: ${server.name} (#${server.id})`)
            await this.containerService.startContainer(server)
            this.handleServerStarted(server, true)
          } else if (runtime.status === 'running') {
            this.handleServerStarted(server, true)
          }
        } catch (err: any) {
          logger.error(
            `[Watchdog] Failed to auto-start server #${server.id} (${server.name}): ${err.message}`
          )
        }
      }
    } catch (err: any) {
      logger.error(`[Watchdog] bootstrapAutoStart error: ${err.message}`)
    }
  }

  /**
   * Called when a server is successfully launched (user action, schedule, or auto-start)
   */
  handleServerStarted(server: McServer, resetAttempts = true): void {
    const state = this.getOrCreateState(server.id)
    state.desiredState = 'running'
    state.haltedReason = null

    if (state.pendingTimer) {
      clearTimeout(state.pendingTimer)
      state.pendingTimer = null
      state.nextRetryAt = null
    }

    if (resetAttempts) {
      state.crashAttempts = 0
    }

    if (state.stabilityTimer) {
      clearTimeout(state.stabilityTimer)
    }

    // Schedule stability check: if it runs for stabilityWindowMs, reset crash count to 0
    state.stabilityTimer = setTimeout(() => {
      if (state.desiredState === 'running') {
        state.crashAttempts = 0
        state.haltedReason = null
        logger.debug?.(
          `[Watchdog] Server #${server.id} reached stability window, crash counter reset.`
        )
      }
      state.stabilityTimer = null
    }, this.stabilityWindowMs)

    state.stabilityTimer.unref?.()
  }

  /**
   * Called when a server is intentionally stopped or killed by user/backup
   */
  handleServerStopped(server: McServer): void {
    const state = this.getOrCreateState(server.id)
    state.desiredState = 'stopped'
    state.haltedReason = null

    if (state.pendingTimer) {
      clearTimeout(state.pendingTimer)
      state.pendingTimer = null
      state.nextRetryAt = null
    }

    if (state.stabilityTimer) {
      clearTimeout(state.stabilityTimer)
      state.stabilityTimer = null
    }

    state.crashAttempts = 0
  }

  /**
   * Handle unexpected container termination
   */
  async handleContainerCrash(server: McServer, _exitCode?: number): Promise<void> {
    const state = this.getOrCreateState(server.id)
    if (state.desiredState !== 'running') {
      return
    }

    if (!server.autoRestartOnCrash) {
      return
    }

    if (this.backupService.isInflight(server.id)) {
      return
    }

    if (state.pendingTimer !== null) {
      return
    }

    if (state.stabilityTimer) {
      clearTimeout(state.stabilityTimer)
      state.stabilityTimer = null
    }

    state.crashAttempts++
    const maxRetries = server.crashMaxRetries ?? 5
    if (maxRetries > 0 && state.crashAttempts > maxRetries) {
      state.desiredState = 'stopped'
      state.haltedReason = `Exceeded maximum consecutive crash restarts (${maxRetries})`
      logger.warn(
        `[Watchdog] Server ${server.name} (#${server.id}) exceeded max crash retries (${maxRetries}). Halting auto-restart.`
      )
      return
    }

    const delaySeconds = this.calculateBackoffDelay(server, state.crashAttempts)
    state.nextRetryAt = new Date(Date.now() + delaySeconds * 1000)
    logger.info(
      `[Watchdog] Server ${server.name} (#${server.id}) crashed (attempt ${state.crashAttempts}/${maxRetries || 'inf'}). Restarting in ${delaySeconds}s (exponential backoff)...`
    )

    state.pendingTimer = setTimeout(async () => {
      state.pendingTimer = null
      state.nextRetryAt = null

      if (state.desiredState !== 'running') {
        return
      }

      try {
        const freshServer = await McServer.find(server.id)
        if (!freshServer || !freshServer.autoRestartOnCrash) {
          state.desiredState = 'stopped'
          return
        }

        if (this.backupService.isInflight(freshServer.id)) {
          await this.handleContainerCrash(freshServer)
          return
        }

        await this.containerService.startContainer(freshServer)
        this.handleServerStarted(freshServer, false)
      } catch (err: any) {
        logger.error(
          `[Watchdog] Failed to restart server ${server.name} (#${server.id}): ${err.message}`
        )
        await this.handleContainerCrash(server)
      }
    }, delaySeconds * 1000)

    state.pendingTimer.unref?.()
  }

  /**
   * Clear pending restart timer without resetting attempts or marking stopped
   */
  clearPendingTimer(serverId: number): void {
    const state = this.serverStates.get(serverId)
    if (state && state.pendingTimer) {
      clearTimeout(state.pendingTimer)
      state.pendingTimer = null
      state.nextRetryAt = null
    }
  }

  /**
   * Cancel any pending retry timer for a server
   */
  cancelPendingRestart(serverId: number): void {
    const state = this.serverStates.get(serverId)
    if (state) {
      if (state.pendingTimer) {
        clearTimeout(state.pendingTimer)
        state.pendingTimer = null
        state.nextRetryAt = null
      }
      state.desiredState = 'stopped'
      state.crashAttempts = 0
      state.haltedReason = null
    }
  }

  /**
   * Retrieve current restart and backoff status
   */
  getRestartStatus(serverId: number, server?: McServer): ServerRestartStatus {
    const state = this.serverStates.get(serverId)
    const maxRetries = server?.crashMaxRetries ?? 5
    if (!state) {
      return {
        isWaitingRestart: false,
        nextRetryInSeconds: null,
        crashAttempts: 0,
        maxRetries,
        haltedReason: null,
      }
    }

    let nextRetryInSeconds: number | null = null
    if (state.nextRetryAt) {
      const remainingMs = state.nextRetryAt.getTime() - Date.now()
      nextRetryInSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
    }

    return {
      isWaitingRestart: state.pendingTimer !== null,
      nextRetryInSeconds,
      crashAttempts: state.crashAttempts,
      maxRetries,
      haltedReason: state.haltedReason,
    }
  }

  /**
   * Check all tracked running servers for unexpected crash exits
   */
  async checkServers(): Promise<void> {
    for (const [serverId, state] of this.serverStates.entries()) {
      if (state.desiredState !== 'running' || state.pendingTimer !== null) {
        continue
      }
      try {
        const server = await McServer.find(serverId)
        if (!server) {
          this.serverStates.delete(serverId)
          continue
        }
        if (!server.autoRestartOnCrash) {
          continue
        }
        if (this.backupService.isInflight(server.id)) {
          continue
        }
        const runtime = await this.containerService.getContainerStatus(server)
        if (runtime.status === 'stopped') {
          await this.handleContainerCrash(server)
        }
      } catch (err: any) {
        logger.debug?.(`[Watchdog] checkServers error for #${serverId}: ${err.message}`)
      }
    }
  }

  /**
   * Start watchdog loop and Docker event listener
   */
  async startWatchdog(intervalMs = 10000): Promise<void> {
    if (this.pollTimer) return
    this.pollTimer = setInterval(() => {
      this.checkServers().catch(() => {})
    }, intervalMs)
    this.pollTimer.unref?.()

    this.attachDockerEvents().catch(() => {})
  }

  /**
   * Stop watchdog and clear all timers
   */
  stopWatchdog(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    for (const state of this.serverStates.values()) {
      if (state.pendingTimer) {
        clearTimeout(state.pendingTimer)
        state.pendingTimer = null
      }
      if (state.stabilityTimer) {
        clearTimeout(state.stabilityTimer)
        state.stabilityTimer = null
      }
    }
    this.serverStates.clear()
    if (this.eventStream) {
      try {
        this.eventStream.destroy?.()
      } catch {}
      this.eventStream = null
    }
  }

  /**
   * Listen to Docker daemon die events
   */
  protected async attachDockerEvents(): Promise<void> {
    try {
      const docker = (this.containerService as any).docker
      if (!docker || typeof docker.getEvents !== 'function') return
      const stream = await docker.getEvents({
        filters: JSON.stringify({
          type: ['container'],
          event: ['die'],
        }),
      })
      this.eventStream = stream

      stream.on('data', async (chunk: Buffer) => {
        try {
          const event = JSON.parse(chunk.toString())
          const containerName = event.Actor?.Attributes?.name
          if (containerName && containerName.startsWith('pidan-mc-')) {
            const identifier = containerName.replace('pidan-mc-', '')
            const server = await McServer.findBy('identifier', identifier)
            if (server) {
              const exitCode = Number(event.Actor?.Attributes?.exitCode ?? 0)
              await this.handleContainerCrash(server, exitCode)
            }
          }
        } catch {}
      })

      stream.on('error', () => {
        this.eventStream = null
      })
      stream.on('end', () => {
        this.eventStream = null
      })
    } catch {
      // Fallback polling will handle it if Docker events cannot be attached
    }
  }

  /**
   * Set custom stability window (useful for unit testing)
   */
  setStabilityWindowMs(ms: number): void {
    this.stabilityWindowMs = ms
  }
}
