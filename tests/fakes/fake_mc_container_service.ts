import type McServer from '#models/mc_server'
import type { ContainerRuntimeState, ContainerStatsSnapshot } from '#services/mc_container_service'

export default class FakeMcContainerService {
  status: ContainerRuntimeState['status'] = 'stopped'
  commands: string[] = []
  saveOffGate: Promise<void> | null = null
  statusGate: Promise<void> | null = null
  statusCalls = 0
  failOn: string | null = null

  async getContainerStatus(server: McServer): Promise<ContainerRuntimeState> {
    this.statusCalls++
    if (this.statusGate) {
      await this.statusGate
    }
    return {
      status: this.status,
      containerId: this.status === 'running' ? 'fake-container' : null,
      memoryLimitMb: server.maxMemoryMb,
      serverPort: server.serverPort,
    }
  }

  async sendCommand(_server: McServer, command: string): Promise<void> {
    this.commands.push(command)
    if (this.failOn && command === this.failOn) {
      throw new Error('stdin failed')
    }
    if (command === 'save-off' && this.saveOffGate) {
      await this.saveOffGate
    }
  }

  async getDockerEngineVersion(): Promise<string | null> {
    return 'fake'
  }

  startCalls: McServer[] = []
  stopCalls: McServer[] = []
  removeError: Error | null = null

  async startContainer(server: McServer): Promise<void> {
    this.startCalls.push(server)
  }
  async stopContainer(server: McServer): Promise<void> {
    this.stopCalls.push(server)
  }
  async killContainer(server: McServer): Promise<void> {
    this.stopCalls.push(server)
  }
  async restartContainer(server: McServer): Promise<void> {
    this.startCalls.push(server)
  }
  async removeContainer(_server: McServer): Promise<void> {
    if (this.removeError) {
      throw this.removeError
    }
  }
  async getContainerStats(_server: McServer): Promise<ContainerStatsSnapshot> {
    return {
      online: this.status === 'running',
      cpuPercent: 0,
      memoryUsageBytes: 0,
      memoryBytes: 0,
      memoryLimitBytes: 0,
      memoryPercent: 0,
      networkRxBytes: 0,
      networkTxBytes: 0,
      diskBytes: 0,
    }
  }

  async getStats(server: McServer): Promise<ContainerStatsSnapshot> {
    return this.getContainerStats(server)
  }

  async getDiskBytes(_server: McServer): Promise<number> {
    return 0
  }
}
