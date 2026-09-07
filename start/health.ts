import { DiskSpaceCheck, HealthChecks, MemoryHeapCheck, BaseCheck, Result } from '@adonisjs/core/health'
import { DbCheck } from '@adonisjs/lucid/database'
import db from '@adonisjs/lucid/services/db'
import McContainerService from '#services/mc_container_service'
import app from '@adonisjs/core/services/app'

class DockerCheck extends BaseCheck {
  name = 'Docker engine check'

  async run() {
    try {
      const containerService = await app.container.make(McContainerService)
      const version = await containerService.getDockerEngineVersion()
      if (version) {
        return Result.ok('Docker engine is reachable and operational').mergeMetaData({
          version,
        })
      }
      return Result.warning('Docker engine is currently unreachable')
    } catch (error: any) {
      return Result.warning(error?.message || 'Docker check error')
    }
  }
}

export const healthChecks = new HealthChecks().register([
  new DiskSpaceCheck(),
  new MemoryHeapCheck(),
  new DbCheck(db.connection()),
  new DockerCheck(),
])
