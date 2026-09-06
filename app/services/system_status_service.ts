import os from 'node:os'
import McContainerService from '#services/mc_container_service'
import { inject } from '@adonisjs/core'

export interface SystemStatusData {
  cpuPercent: number
  memoryPercent: number
  usedMemoryBytes: number
  totalMemoryBytes: number
  freeMemoryBytes: number
  nodeVersion: string
  panelVersion: string
  processUser: string
  panelTime: string
  loadAverage: [number, number, number]
  hostMachine: string
  osEnvironment: string
  containerEngine: string
}

@inject()
export default class SystemStatusService {
  protected lastCpuSample: { idle: number; total: number }
  protected currentCpuPercent: number = 0

  constructor(protected containerService: McContainerService) {
    this.lastCpuSample = this.calculateCpuTimes()
    // Perform background sampling every 2.5 seconds
    setInterval(() => {
      this.sampleCpu()
    }, 2500).unref()
  }

  protected calculateCpuTimes(): { idle: number; total: number } {
    const cpus = os.cpus()
    let idle = 0
    let total = 0
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        total += (cpu.times as any)[type]
      }
      idle += cpu.times.idle
    }
    return { idle, total }
  }

  protected sampleCpu(): void {
    const current = this.calculateCpuTimes()
    const deltaTotal = current.total - this.lastCpuSample.total
    const deltaIdle = current.idle - this.lastCpuSample.idle

    if (deltaTotal > 0) {
      const usage = ((deltaTotal - deltaIdle) / deltaTotal) * 100
      this.currentCpuPercent = Number(Math.max(0, Math.min(100, usage)).toFixed(1))
    }

    this.lastCpuSample = current
  }

  /**
   * Get host OS and architecture description
   */
  protected getOsEnvironment(): string {
    const platform = os.platform()
    const arch = os.arch()
    const release = os.release()

    if (platform === 'win32') {
      return `Windows (${arch})`
    } else if (platform === 'linux') {
      return `Linux (${arch})`
    } else if (platform === 'darwin') {
      return `macOS (${arch})`
    }
    return `${os.type()} ${release} (${arch})`
  }

  /**
   * Get process user name
   */
  protected getProcessUser(): string {
    try {
      const userInfo = os.userInfo()
      return userInfo.username || 'root / administrator'
    } catch {
      return process.env.USER || process.env.USERNAME || 'root / administrator'
    }
  }

  /**
   * Get load average (with Windows fallback calculation)
   */
  protected getLoadAverage(cpuPercent: number): [number, number, number] {
    const load = os.loadavg()
    if (load && (load[0] > 0 || load[1] > 0 || load[2] > 0)) {
      return [
        Number(load[0].toFixed(2)),
        Number(load[1].toFixed(2)),
        Number(load[2].toFixed(2)),
      ]
    }

    // Windows fallback: extrapolate reasonable 1m, 5m, 15m load from core count & CPU %
    const cores = Math.max(1, os.cpus().length)
    const base = Number(((cpuPercent / 100) * cores).toFixed(2))
    return [base, Number((base * 0.9).toFixed(2)), Number((base * 0.85).toFixed(2))]
  }

  /**
   * Retrieve current system status snapshot
   */
  async getStatus(): Promise<SystemStatusData> {
    this.sampleCpu()

    const totalMemoryBytes = os.totalmem()
    const freeMemoryBytes = os.freemem()
    const usedMemoryBytes = totalMemoryBytes - freeMemoryBytes
    const memoryPercent = Number(((usedMemoryBytes / totalMemoryBytes) * 100).toFixed(1))

    let containerEngine = 'Docker Ready'
    try {
      const dockerVer = await this.containerService.getDockerEngineVersion()
      containerEngine = dockerVer ? `Docker ${dockerVer} Ready` : 'Docker Ready'
    } catch {
      containerEngine = 'Docker Offline'
    }

    return {
      cpuPercent: this.currentCpuPercent,
      memoryPercent,
      usedMemoryBytes,
      totalMemoryBytes,
      freeMemoryBytes,
      nodeVersion: process.version,
      panelVersion: '1.0.0 (Adonis + Vue3)',
      processUser: this.getProcessUser(),
      panelTime: new Date().toISOString(),
      loadAverage: this.getLoadAverage(this.currentCpuPercent),
      hostMachine: os.hostname(),
      osEnvironment: this.getOsEnvironment(),
      containerEngine,
    }
  }
}
