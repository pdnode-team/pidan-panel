/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),
  APP_NAME: Env.schema.string.optional(),

  // Database
  DB_DATABASE: Env.schema.string.optional(),

  // Instance data root (servers/, backups/). When running the panel inside a
  // container, set this to a path that exists identically on the docker host
  // so MC container bind mounts resolve to the same physical directory.
  PIDAN_DATA_DIR: Env.schema.string.optional(),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // CORS (comma-separated allowlist used in production)
  CORS_ORIGIN: Env.schema.string.optional(),

  // Health checks
  DISK_WARN_PERCENT: Env.schema.number.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the limiter package
  |----------------------------------------------------------
  */
  LIMITER_STORE: Env.schema.enum(['database', 'memory'] as const),
})
