---
built: 2026-09-05
---

# AdonisJS Implementation Plan — API: Pidan Panel

## Pre-implementation requirements

Install Docker SDK dependencies:

```sh
pnpm add dockerode
pnpm add -D @types/dockerode
```

Ensure Docker Desktop / Docker Engine is running on host machine.

## Logical schema

Reads: models.md, migrations.md, schema-rules.md

```dbml title="Logical Schema"
Table mc_servers {
  id integer [pk, increment]
  name varchar(100) [not null]
  identifier varchar(50) [not null, unique]
  server_jar varchar(100) [not null, default: 'server.jar']
  docker_image varchar(255) [not null, default: 'eclipse-temurin:21-jre']
  min_memory_mb integer [not null, default: 1024]
  max_memory_mb integer [not null, default: 2048]
  server_port integer [not null, unique]
  java_args text [null]
  created_at timestamp [not null]
  updated_at timestamp [not null]
}
```

- Invariants:
  - `identifier` is unique lowercase slug format (`^[a-z0-9-]+$`).
  - Container naming convention: `pidan-mc-${server.identifier}`.
  - `server_port` is unique, range 1024-65535.
  - `max_memory_mb >= min_memory_mb > 0`.
  - Data directory jailed to `data/servers/${server.identifier}/`.
  - Docker container state is dynamic and queried directly from Docker Engine API.

## Migrations + models

Reads: migrations.md, models.md

```sh
node ace make:model McServer --migration
node ace migration:run
```

- `database/migrations/<timestamp>_create_mc_servers_table.ts` — Create mc_servers table with column constraints and unique indexes.
- `app/models/mc_server.ts` — McServer model.
  - `containerName` getter — returns `pidan-mc-${this.identifier}`.
  - `dataDirectory` getter — returns absolute path to `data/servers/${this.identifier}`.
  - `jvmOptions` getter — returns `['-Xms...', '-Xmx...', ...args]`.

## Controller layout + CRUD vs services decision

Reads: controllers.md, flow-cruddy-controllers

```sh
node ace make:controller mc_servers
node ace make:controller server_power_states
node ace make:controller server_commands
node ace make:controller server_logs
node ace make:controller server_files
```

- `app/controllers/mc_servers_controller.ts` (new) — actions: `index`, `show`, `store`, `update`, `destroy`. Plain CRUD.
- `app/controllers/server_power_states_controller.ts` (new) — actions: `show`, `store`, `destroy`, `update`. Domain Service (`McContainerService`).
- `app/controllers/server_commands_controller.ts` (new) — action: `store`. Domain Service (`McContainerService`).
- `app/controllers/server_logs_controller.ts` (new) — action: `show`. Domain Service (`McContainerService`).
- `app/controllers/server_files_controller.ts` (new) — actions: `index`, `show`, `store`, `update`, `destroy`. Domain Service (`ServerFileManagerService`).

## Service design

Reads: controllers.md, services.md

```sh
node ace make:service mc_container
node ace make:service server_file_manager
```

- `app/services/mc_container_service.ts` — `McContainerService`
  - `getContainerStatus(server: McServer): Promise<{ status: string, cpuPercent: number, memoryUsageMb: number, memoryLimitMb: number }>`
  - `startContainer(server: McServer): Promise<void>` — checks jar, verifies eula.txt, creates or starts container.
  - `stopContainer(server: McServer, timeoutSeconds?: number): Promise<void>` — writes `stop\n` to stdin, waits, falls back to docker stop.
  - `restartContainer(server: McServer): Promise<void>` — stops then starts.
  - `sendCommand(server: McServer, command: string): Promise<void>` — writes command to stdin.
  - `streamLogs(server: McServer, onLine: (line: string) => void): Promise<() => void>` — streams stdout/stderr from container.
  - Non-responsibilities: HTTP context, model queries, file content editing.

- `app/services/server_file_manager_service.ts` — `ServerFileManagerService`
  - `resolveJailedPath(server: McServer, relativePath: string): string` — enforces jailed boundary against path traversal.
  - `listDirectory(server: McServer, relativePath: string): Promise<FileItem[]>` — returns directory entries.
  - `readFile(server: McServer, relativePath: string): Promise<string>` — reads text file.
  - `writeFile(server: McServer, relativePath: string, content: string): Promise<void>` — writes text file.
  - `uploadFile(server: McServer, targetRelativeDir: string, file: MultipartFile): Promise<void>` — stores uploaded file.
  - `renameFile(server: McServer, oldPath: string, newPath: string): Promise<void>` — renames/moves file.
  - `deleteFile(server: McServer, relativePath: string): Promise<void>` — deletes file or empty folder.
  - Non-responsibilities: Docker execution, HTTP response formatting.

## Validation rules

Reads: validation.md, vine/types/string.md, vine/types/number.md, vine/types/file.md

```sh
node ace make:validator mc_server
node ace make:validator server_command
node ace make:validator server_file
```

### Input validation

```ts title="app/validators/mc_server.ts"
import vine from '@vinejs/vine'

export const createMcServerValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100),
    identifier: vine
      .string()
      .trim()
      .minLength(2)
      .maxLength(50)
      .regex(/^[a-z0-9-]+$/)
      .unique({ table: 'mc_servers', column: 'identifier' }),
    serverJar: vine.string().trim().minLength(1).maxLength(100).optional(),
    dockerImage: vine.string().trim().maxLength(255).optional(),
    minMemoryMb: vine.number().min(256).max(65536).optional(),
    maxMemoryMb: vine.number().min(256).max(65536).optional(),
    serverPort: vine
      .number()
      .range([1024, 65535])
      .unique({ table: 'mc_servers', column: 'server_port' }),
    javaArgs: vine.string().trim().optional(),
  })
)

export const updateMcServerValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
    serverJar: vine.string().trim().minLength(1).maxLength(100).optional(),
    dockerImage: vine.string().trim().maxLength(255).optional(),
    minMemoryMb: vine.number().min(256).max(65536).optional(),
    maxMemoryMb: vine.number().min(256).max(65536).optional(),
    serverPort: vine
      .number()
      .range([1024, 65535])
      .unique({
        table: 'mc_servers',
        column: 'server_port',
        filter: (db, value, field) => {
          if (field.meta.serverId) {
            db.whereNot('id', field.meta.serverId)
          }
        },
      })
      .optional(),
    javaArgs: vine.string().trim().nullable().optional(),
  })
)
```

```ts title="app/validators/server_command.ts"
import vine from '@vinejs/vine'

export const dispatchServerCommandValidator = vine.create(
  vine.object({
    command: vine.string().trim().minLength(1).maxLength(1000),
  })
)
```

```ts title="app/validators/server_file.ts"
import vine from '@vinejs/vine'

export const saveServerFileValidator = vine.create(
  vine.object({
    path: vine.string().trim().minLength(1),
    content: vine.string(),
  })
)

export const uploadServerFileValidator = vine.create(
  vine.object({
    path: vine.string().trim().optional(),
    file: vine.file({
      size: '500mb',
    }),
  })
)

export const renameServerFileValidator = vine.create(
  vine.object({
    oldPath: vine.string().trim().minLength(1),
    newPath: vine.string().trim().minLength(1),
  })
)
```

### Business rules

- `maxMemoryMb >= minMemoryMb`. Owner: `McServersController`.
- Running server guard: port cannot be changed while running; running server cannot be deleted. Owner: `McServersController`.
- Offline command guard: commands can only be dispatched to running container. Owner: `ServerCommandsController`.
- File path jail: no operations outside instance data folder. Owner: `ServerFileManagerService`.
- Closed registration guard: once initial admin is registered, sign up closes. Owner: `NewAccountController`.

## Authorization + segregation

Reads: authentication.md

- All `/api/v1/servers/**` endpoints protected by `middleware.auth()`.
- Controller reads authenticated user via `auth.getUserOrFail()`.
- Scope segregation: Instances identified by integer `params.id`, checked with `McServer.findOrFail(params.id)`.

## Controllers

Reads: controllers.md, http-context.md, response.md

- `app/controllers/new_account_controller.ts` (modified):
  - `store`: Checks `User.query().count('*')`. If count > 0, returns 403 Forbidden. Otherwise registers initial admin.
- `app/controllers/mc_servers_controller.ts` (new):
  - `index`: Loads all servers with ordering, transforms via `McServerTransformer`.
  - `show`: Loads single server with `findOrFail`, transforms via `McServerTransformer`.
  - `store`: Validates `createMcServerValidator`, creates record, ensures `data/servers/<identifier>/eula.txt` exists, returns 201 with transformer.
  - `update`: Validates `updateMcServerValidator`, updates record, returns 200 with transformer.
  - `destroy`: Guards against running container (409), removes container, deletes record, returns 204.
- `app/controllers/server_power_states_controller.ts` (new):
  - Injected: `McContainerService`.
  - `show`: Returns live container metrics.
  - `store`: Starts container, returns 201 `{ status: 'starting' }`.
  - `destroy`: Stops container gracefully, returns 204.
  - `update`: Restarts container, returns 200 `{ status: 'restarting' }`.
- `app/controllers/server_commands_controller.ts` (new):
  - Injected: `McContainerService`.
  - `store`: Validates command, dispatches to stdin, returns 204.
- `app/controllers/server_logs_controller.ts` (new):
  - Injected: `McContainerService`.
  - `show`: Connects SSE stream (`text/event-stream`), pipes lines, registers cleanup on connection abort.
- `app/controllers/server_files_controller.ts` (new):
  - Injected: `ServerFileManagerService`.
  - `index`: Lists items in relative directory, returns array wrapped in serialize.
  - `show`: Reads file content, returns `{ content, size }`.
  - `store`: Handles text save or file upload, returns 201.
  - `update`: Renames or moves file, returns 200.
  - `destroy`: Deletes file/dir, returns 204.

## Response layer

Reads: transformers.md

```sh
node ace make:transformer mc_server
```

- `app/transformers/mc_server_transformer.ts` — `McServerTransformer`
- Pass-through fields: `id`, `name`, `identifier`, `serverJar`, `dockerImage`, `minMemoryMb`, `maxMemoryMb`, `serverPort`, `javaArgs`, `createdAt`, `updatedAt`.
- Wrapping mode: `serialize` (data envelope).
- Error responses: `{ errors: [{ message, rule?, field? }] }`.

## Routes

Reads: routing.md

```diff title="start/routes.ts"
@@ -28,10 +28,40 @@
     router
       .group(() => {
         router.get('profile', [controllers.Profile, 'show'])
         router.post('logout', [controllers.AccessTokens, 'destroy'])
+
+        router
+          .resource('servers', controllers.McServers)
+          .apiOnly()
+          .where('id', router.matchers.number())
+
+        router
+          .group(() => {
+            router.get('power', [controllers.ServerPowerStates, 'show'])
+            router.post('power', [controllers.ServerPowerStates, 'store'])
+            router.delete('power', [controllers.ServerPowerStates, 'destroy'])
+            router.patch('power', [controllers.ServerPowerStates, 'update'])
+
+            router.post('commands', [controllers.ServerCommands, 'store'])
+
+            router.get('logs', [controllers.ServerLogs, 'show'])
+
+            router.get('files', [controllers.ServerFiles, 'index'])
+            router.get('files/content', [controllers.ServerFiles, 'show'])
+            router.post('files', [controllers.ServerFiles, 'store'])
+            router.patch('files', [controllers.ServerFiles, 'update'])
+            router.delete('files', [controllers.ServerFiles, 'destroy'])
+          })
+          .prefix('servers/:id')
+          .where('id', router.matchers.number())
       })
       .prefix('account')
       .as('profile')
       .use(middleware.auth())
```

## Events + side effects

Reads: events.md

- Data directory initialization on server create.
- Container removal on server delete.
- Real-time log stream cleanup on HTTP client disconnect.

## Test coverage gap

- Functional tests covering:
  - Auth registration initial setup lock.
  - Server CRUD validation (identifier regex, port uniqueness, memory constraint).
  - Jailed path traversal rejection (e.g. attempting to read `../../package.json`).
  - Container mock/unit lifecycle flows.
