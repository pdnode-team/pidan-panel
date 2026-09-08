import {
  DiskSpaceCheck,
  HealthChecks,
  MemoryHeapCheck,
  BaseCheck,
  Result,
} from '@adonisjs/core/health'
import { DbCheck } from '@adonisjs/lucid/database'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import McContainerService from '#services/mc_container_service'
import app from '@adonisjs/core/services/app'

/**
 * Disk usage percentage after which the health check warns (default 75).
 * Configure with DISK_WARN_PERCENT in the environment.
 */
const diskWarnPercent = env.get('DISK_WARN_PERCENT', 80)

function makeDiskCheck(): DiskSpaceCheck {
  return new DiskSpaceCheck().warnWhenExceeds(diskWarnPercent).failWhenExceeds(90)
}

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
      return Result.failed('Docker engine is currently unreachable')
    } catch (error: any) {
      return Result.failed(error?.message || 'Docker engine is currently unreachable', error)
    }
  }
}

export const healthChecks = new HealthChecks().register([
  makeDiskCheck(),
  new MemoryHeapCheck(),
  new DbCheck(db.connection()),
  new DockerCheck(),
])

/**
 * Liveness subset: process and database only. Used by the top-level /health
 * endpoint so container orchestrators do not restart the panel whenever the
 * Docker engine blips.
 */
export const livenessChecks = new HealthChecks().register([
  makeDiskCheck(),
  new MemoryHeapCheck(),
  new DbCheck(db.connection()),
])
