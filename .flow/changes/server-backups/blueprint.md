---
planned: 2026-09-06
built: 2026-09-06
---

# Server Backups — Implementation Plan

> Task type: greenfield
> Stack: AdonisJS API
> Database: SQLite

## Summary

Operators who can access an instance can create, list, download, delete, and restore full-directory snapshots. Snapshots live outside the instance data space. Live snapshots flush and pause world writes before copying. Restore overwrites the same stopped instance.

## Pre-implementation requirements

- `archiver` — streaming zip create so a live world copy is not buffered in memory. Install with `pnpm add archiver` and `pnpm add -D @types/archiver`.
- `@adonisjs/bouncer` / `authorization.md` — not installed. Authz reuses existing `middleware.auth()` + `middleware.serverAccess()`. User chose the same access as files; do not add Bouncer in this change.

## Out of scope

- Scheduled snapshots — later change.
- Restore as a new instance — later change.
- Auto-prune / keep-last-N — later change.
- Path picking / worlds-only snapshots — rejected in the brief.

## Target shape

Nested under `/api/v1/servers/:id`: backups collection, backup member, download file, restorations create. `ServerBackupService` owns flush/copy/zip/extract/mutex. Deleting an instance also removes `data/backups/<identifier>/`.

## Logical schema

Reads: models.md, model-relationships.md, migrations.md, schema-rules.md

```dbml
Table server_backups {
  id integer [pk, increment]
  mc_server_id integer [not null, ref: > mc_servers.id]
  name varchar(100) [not null]
  file_name varchar(255) [not null]
  size_bytes integer [not null, default: 0]
  status varchar(20) [not null]
  error_message text
  created_at timestamp [not null]
  updated_at timestamp [not null]
}

indexes {
  (mc_server_id) [name: 'server_backups_mc_server_id_index']
}
```

`status` is app-enforced `'pending' | 'ready' | 'failed'` (string column, matching `users.role`). Narrow via `database/schema_rules.ts` table rule. FK `onDelete CASCADE`. Hard delete.

## Migrations + models

Reads: migrations.md, models.md, model-relationships.md, schema-rules.md

`node ace make:model ServerBackup --migration --transformer`

Migration files (ordered):

- `database/migrations/<ts>_create_server_backups_table.ts` — create `server_backups` with FK to `mc_servers.id` onDelete CASCADE, two explicit timestamps.

Model files:

- `app/models/server_backup.ts` (new) — `ServerBackup` extends generated `ServerBackupSchema`.
  - `@belongsTo(() => McServer)` `mcServer`
- `app/models/mc_server.ts` (modified)
  - `@hasMany(() => ServerBackup)` `backups`
  - `backupDirectory` getter — `app.makePath('data/backups', this.identifier)`
- `database/schema_rules.ts` (modified) — table `server_backups` column `status` tsType `'pending' | 'ready' | 'failed'`

`node ace migration:run`

## Service design

Reads: services.md, controllers.md

`node ace make:service server_backup`

- `app/services/server_backup_service.ts` — `ServerBackupService`.
  - Injected: `McContainerService` via constructor `@inject()`.
  - `createBackup(server: McServer, name?: string): Promise<ServerBackup>` — mutex, pending row, live flush (`save-all flush` → wait → `save-off`), copy to staging, `save-on` in finally if was running, zip with archiver excluding `session.lock`, mark ready/failed.
  - `restoreBackup(server: McServer, backup: ServerBackup): Promise<void>` — mutex, must be ready + instance stopped, zip-slip check, extract to staging skipping `session.lock`, rename data dir aside, move staging in, rollback aside on failure.
  - `deleteBackup(backup: ServerBackup): Promise<void>` — reject pending, unlink zip, delete row.
  - `archivePath(server: McServer, backup: ServerBackup): string` — `join(server.backupDirectory, backup.fileName)`.
  - `purgeInstanceBackups(server: McServer): Promise<void>` — `rm` backup directory.
  - Does NOT: read HttpContext, shape HTTP responses, authorize users, send unrelated console commands.

In-process `Map<number, 'backup' | 'restore'>` mutex. Do not add `@adonisjs/lock`. Restore extract: `adm-zip` (already installed) after zip-slip scan.

## Validation

Reads: validation.md, vine/types/string.md

### Input validation

`node ace make:validator server_backup`

```ts title="app/validators/server_backup.ts"
import vine from '@vinejs/vine'

export const createServerBackupValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
  })
)
```

### Business rules

- Concurrent backup/restore → 409. Owner: service mutex.
- Live flush failure → 400 with abort message. Owner: service.
- Restore while running → 409. Owner: service.
- Restore/download if not `ready` → 409. Owner: service.
- Delete while `pending` → 409. Owner: service.
- Zip-slip → 400. Owner: service.
- Backup must belong to `:id` instance → 404. Owner: controller lookup.

## Authorization + segregation

Reads: authentication.md, packages.md

- No Bouncer policies. Route group already uses `middleware.auth()` then `middleware.serverAccess()` which reads `params.id` as the instance.
- Query segregation: `ServerBackup.query().where('mcServerId', server.id).orderBy('id', 'desc')`.
- Assigned users and admins share the same snapshot actions. Creating/deleting the **instance** remains admin-only on `McServersController.destroy`.

## Controllers

Reads: controllers.md, http-context.md, request.md, middleware.md, response.md, exception-handling.md

`node ace make:controller server_backups`
`node ace make:controller server_backup_downloads`
`node ace make:controller server_backup_restorations`
`node ace make:exception backup_operation`

- `app/exceptions/backup_operation_exception.ts` (new) — `BackupOperationException`. Constructor `(message, status)`. `handle` returns `{ errors: [{ message }] }` via `conflict` / `badRequest` / `notFound`.

- `app/controllers/server_backups_controller.ts` (new). Constructor inject `ServerBackupService`.
  - `index` — wiring: McServer.findOrFail(params.id), paginate backups for that server, `ServerBackupTransformer.paginate`, `serialize`.
  - `show` — wiring: load backup scoped to server id, `serialize(transform)`. 404 if missing or wrong server.
  - `store` — wiring: `request.validateUsing(createServerBackupValidator)`, `createBackup`, `response.created(await serialize(transform))`. Throw `BackupOperationException`.
    - Non-default: domain service (Docker stdin + copy + zip).
  - `destroy` — wiring: load scoped backup, `deleteBackup`, `response.noContent()`.

- `app/controllers/server_backup_downloads_controller.ts` (new). Constructor inject `ServerBackupService`.
  - `show` — wiring: load scoped ready backup, `response.attachment(archivePath, fileName)`. File response, not serialize.

- `app/controllers/server_backup_restorations_controller.ts` (new). Constructor inject `ServerBackupService`.
  - `store` — wiring: load scoped backup, `restoreBackup`, `response.created(await serialize({ status: 'restored' as const, backupId: backup.id, message: 'Backup restored successfully.' }))`.

- `app/controllers/mc_servers_controller.ts` (modified)
  - `destroy` — after running-server check, `purgeInstanceBackups(server)` regardless of `deleteFiles`.

- DI: constructor `@inject()` on the three new controllers and `McServersController` (already injects container service; add backup service).
- Per-action middleware: none beyond the existing group `auth` + `serverAccess`.

## Response layer

Reads: transformers.md, response.md, exception-handling.md, pagination.md

- `app/transformers/server_backup_transformer.ts` — `ServerBackupTransformer`.
- Fields needing transformation: none (no dual-shape, no relations).
- Pass-through fields: `id`, `name`, `fileName`, `sizeBytes`, `status`, `errorMessage`, `createdAt`, `updatedAt`.
- Relationships to preload before transform: none.
- Runtime context required: none.
- Wrapping mode:
  - index → `serialize` (data + meta paginated)
  - show / store → `serialize` (data object)
  - restorations.store → `serialize` (data object action)
  - destroy → 204 no body
  - downloads.show → file via `response.attachment`
- Success status: index/show 200; store/restorations.store `response.created`; destroy `response.noContent`.
- Recoverable errors: Vine 422 on invalid name.
- Self-handled exceptions thrown: `BackupOperationException`.

## Routes

Reads: routing.md

```diff title="start/routes.ts"
             router.post('jars', [controllers.ServerJars, 'store'])
+
+            router.get('backups', [controllers.ServerBackups, 'index'])
+            router.post('backups', [controllers.ServerBackups, 'store'])
+            router.get('backups/:backupId', [controllers.ServerBackups, 'show']).where('backupId', router.matchers.number())
+            router.delete('backups/:backupId', [controllers.ServerBackups, 'destroy']).where('backupId', router.matchers.number())
+            router.get('backups/:backupId/download', [controllers.ServerBackupDownloads, 'show']).where('backupId', router.matchers.number())
+            router.post('backups/:backupId/restorations', [controllers.ServerBackupRestorations, 'store']).where('backupId', router.matchers.number())
           })
           .prefix('servers/:id')
```

Keep parent param `:id` so `serverAccess` still works. Static `backups` before `backups/:backupId`. Verify route names with `node ace list:routes`.

## Events + side effects

Reads: events.md

_n/a (no application events; disk zip and container stdin are owned by the service)._

## Test coverage gap

Existing functional tests cover servers CRUD, files, authz, mcjars. None cover snapshots. New file `tests/functional/server_backups.spec.ts`. Swap `McContainerService` for Docker. Plan owned by assert.md.
