---
built: 2026-09-06
---

# Server Backups — Test Plan

> Stack: AdonisJS API
> Source: .flow/changes/server-backups/blueprint.md
> Date: 2026-09-06

## Summary

Functional coverage for create/list/show/download/delete/restore of instance snapshots, live flush via a swapped container service, authz, concurrency, zip-slip, and instance-delete cascade. One spec file matching this repo’s existing functional layout.

## Pre-implementation requirements

- `FakeMcContainerService` at `tests/fakes/fake_mc_container_service.ts` — in-memory stand-in for Docker inspect/stdin. Swapped for `McContainerService`.

## Coverage decisions

Reads: testing.md

> This is the scope inventory for this change — every behavior the change makes observable, with a coverage decision per row. It is not the test list.

| Observable behavior | Decision | Notes |
| ------------------- | -------- | ----- |
| Unauthenticated GET backups → 401 | add | — |
| Operator without access → 403 | add | — |
| Assigned user can create a snapshot | add | — |
| Stopped instance POST backups → 201 ready snapshot of whole data space | add | — |
| Snapshot archive is outside the instance data directory | add | — |
| Omitted name → timestamp display name | add | — |
| GET backups lists newest first with name, size, status | add | — |
| GET backup member returns metadata | add | — |
| Download ready snapshot returns zip bytes | add | — |
| Restore onto stopped instance replaces data space | add | — |
| Files added after snapshot are gone after restore | add | — |
| DELETE ready snapshot → 204, archive gone | add | — |
| Running instance create sends save-all flush, save-off, then save-on | add | — |
| Flush failure aborts with exact message, save-on still attempted | add | — |
| Restore while running → 409 exact message | add | — |
| Concurrent create while another backup in flight → 409 | add | — |
| Zip-slip restore rejected, data unchanged | add | — |
| Delete instance discards backup directory | add | — |
| Download pending/failed → 409 | skip | Covered by restore-not-ready shape; download of missing file is rare in v1. Failed create is asserted on flush failure. |
| Delete pending → 409 | skip | Hard to freeze pending without swapping own backup service. Concurrent test covers in-flight mutex. |

## Test list (ordered)

Reads: testing.md

1. T1 [functional] — unauthenticated backup list is unauthorized (401)
2. T2 [functional] — operator without access is forbidden (403)
3. T3 [functional] — creates a snapshot of a stopped instance and returns the wrapped ready resource (201)
4. T4 [functional] — snapshot archive lives outside the instance data directory
5. T5 [functional] — lists snapshots newest first
6. T6 [functional] — shows snapshot metadata
7. T7 [functional] — downloads a ready snapshot as a zip file
8. T8 [functional] — restores a snapshot onto a stopped instance and removes files added after the snapshot
9. T9 [functional] — deletes a ready snapshot (204)
10. T10 [functional] — assigned user can create a snapshot
11. T11 [functional] — live snapshot sends save-all flush, save-off, and save-on
12. T12 [functional] — flush failure aborts the snapshot and still resumes writes
13. T13 [functional] — restore while running is conflict (409)
14. T14 [functional] — concurrent snapshot while another is in flight is conflict (409)
15. T15 [functional] — zip-slip restore is rejected and leaves files unchanged
16. T16 [functional] — deleting the instance discards its snapshots on disk

## Per-test contracts

Reads: testing.md

### Test 1 — unauthenticated backup list is unauthorized (401)

- **Surface:** ServerBackupsController.index
- **Suite:** functional
- **Setup:** create admin + instance. No login.
- **Action:** GET `/api/v1/servers/:id/backups`
- **Outcome contract:** Status 401.
- **Does NOT assert:** body field names of the auth middleware.
- **Why:** list is behind `middleware.auth()`.

### Test 2 — operator without access is forbidden (403)

- **Surface:** ServerBackupsController.index
- **Suite:** functional
- **Setup:** admin-owned instance; second user with empty `serverIds`. Login as second user.
- **Action:** GET `/api/v1/servers/:id/backups`
- **Outcome contract:** Status 403; `errors[0].message` is `Access denied to this server instance.`
- **Does NOT assert:** empty vs missing list body.
- **Why:** `serverAccess` gates the nested group.

### Test 3 — creates a snapshot of a stopped instance and returns the wrapped ready resource (201)

- **Surface:** ServerBackupsController.store
- **Suite:** functional
- **Setup:** admin login; instance with `world/level.dat`, `plugins/demo.jar`, `server.properties`. POST `{ name: "before-upgrade" }`.
- **Action:** POST `/api/v1/servers/:id/backups`
- **Outcome contract:** Status 201; `data.status` is `ready`; `data.name` is `before-upgrade`; `data.sizeBytes` > 0; `data.fileName` ends with `.zip`; DB row exists with `mcServerId` matching.
- **Does NOT assert:** zip entry listing.
- **Why:** happy-path create for a stopped instance.

### Test 4 — snapshot archive lives outside the instance data directory

- **Surface:** ServerBackupsController.store
- **Suite:** functional
- **Setup:** same as T3 (may share group helper).
- **Action:** POST `/api/v1/servers/:id/backups`
- **Outcome contract:** Status 201; archive path is under `data/backups/<identifier>/` and not under `data/servers/<identifier>/`; file exists on disk.
- **Does NOT assert:** zip compression ratio.
- **Why:** snapshots must not nest inside the next snapshot or the file manager jail.

### Test 5 — lists snapshots newest first

- **Surface:** ServerBackupsController.index
- **Suite:** functional
- **Setup:** two snapshots created in order.
- **Action:** GET `/api/v1/servers/:id/backups`
- **Outcome contract:** Status 200; `data` is an array; first item is the later snapshot; each item has `id`, `name`, `fileName`, `sizeBytes`, `status`, `createdAt`.
- **Does NOT assert:** pagination URLs.
- **Why:** operator sees newest first.

### Test 6 — shows snapshot metadata

- **Surface:** ServerBackupsController.show
- **Suite:** functional
- **Setup:** one ready snapshot.
- **Action:** GET `/api/v1/servers/:id/backups/:backupId`
- **Outcome contract:** Status 200; `data.id` matches; `data.status` is `ready`.
- **Does NOT assert:** download bytes.
- **Why:** member read is distinct from list.

### Test 7 — downloads a ready snapshot as a zip file

- **Surface:** ServerBackupDownloadsController.show
- **Suite:** functional
- **Setup:** one ready snapshot.
- **Action:** GET `/api/v1/servers/:id/backups/:backupId/download`
- **Outcome contract:** Status 200; body is non-empty; `content-type` includes `zip` or `octet-stream`; content-disposition includes the file name.
- **Does NOT assert:** zip CRC.
- **Why:** download is a file response, not `{ data }`.

### Test 8 — restores a snapshot onto a stopped instance and removes files added after the snapshot

- **Surface:** ServerBackupRestorationsController.store
- **Suite:** functional
- **Setup:** snapshot of `world/level.dat` content `v1`; then write `world/level.dat` to `v2` and add `extra.txt`.
- **Action:** POST `/api/v1/servers/:id/backups/:backupId/restorations`
- **Outcome contract:** Status 201; `data.status` is `restored`; `world/level.dat` is `v1`; `extra.txt` is gone.
- **Does NOT assert:** container start.
- **Why:** restore overwrites the same instance.

### Test 9 — deletes a ready snapshot (204)

- **Surface:** ServerBackupsController.destroy
- **Suite:** functional
- **Setup:** one ready snapshot.
- **Action:** DELETE `/api/v1/servers/:id/backups/:backupId`
- **Outcome contract:** Status 204; zip file gone; GET list `data` does not include that id.
- **Does NOT assert:** recycle bin.
- **Why:** hard delete of the snapshot.

### Test 10 — assigned user can create a snapshot

- **Surface:** ServerBackupsController.store
- **Suite:** functional
- **Setup:** instance owned by admin; user with `serverIds: [instance.id]`. Login as that user.
- **Action:** POST `/api/v1/servers/:id/backups` json `{ name: "user-snap" }`
- **Outcome contract:** Status 201; `data.status` is `ready`.
- **Does NOT assert:** user cannot delete the instance.
- **Why:** same access as files.

### Test 11 — live snapshot sends save-all flush, save-off, and save-on

- **Surface:** ServerBackupsController.store
- **Suite:** functional
- **Setup:** swap `McContainerService` with `FakeMcContainerService` status `running`. Instance has files.
- **Action:** POST `/api/v1/servers/:id/backups`
- **Outcome contract:** Status 201; `data.status` is `ready`; fake `commands` include `save-all flush`, then `save-off`, then `save-on` in that order.
- **Does NOT assert:** the 2s flush wait duration.
- **Why:** live snapshot must pause writes.

### Test 12 — flush failure aborts the snapshot and still resumes writes

- **Surface:** ServerBackupsController.store
- **Suite:** functional
- **Setup:** fake running; `sendCommand` throws on `save-off`.
- **Action:** POST `/api/v1/servers/:id/backups`
- **Outcome contract:** Status 400; `errors[0].message` is `Failed to flush world saves. Backup aborted to avoid a corrupt snapshot.`; fake commands include `save-on`; no ready zip for a successful backup of this request.
- **Does NOT assert:** exact pending row cleanup.
- **Why:** never copy a dirty live world; always resume writes.

### Test 13 — restore while running is conflict (409)

- **Surface:** ServerBackupRestorationsController.store
- **Suite:** functional
- **Setup:** ready snapshot; fake status `running`.
- **Action:** POST `/api/v1/servers/:id/backups/:backupId/restorations`
- **Outcome contract:** Status 409; `errors[0].message` is `Cannot restore while the server is running. Please stop the server first.`
- **Does NOT assert:** file contents.
- **Why:** restore requires a stopped instance.

### Test 14 — concurrent snapshot while another is in flight is conflict (409)

- **Surface:** ServerBackupsController.store
- **Suite:** functional
- **Setup:** fake running; `saveOffGate` promise that does not resolve until released. Start first POST without awaiting completion; then second POST.
- **Action:** second POST `/api/v1/servers/:id/backups`
- **Outcome contract:** Status 409; `errors[0].message` is `A backup or restore is already in progress for this server.` Then release the gate; first POST eventually 201.
- **Does NOT assert:** restore concurrency separately.
- **Why:** one snapshot/restore per instance.

### Test 15 — zip-slip restore is rejected and leaves files unchanged

- **Surface:** ServerBackupRestorationsController.store
- **Suite:** functional
- **Setup:** stopped instance with `marker.txt` = `safe`; insert a `ready` backup row whose zip contains `../evil.txt` (and optionally `marker.txt`).
- **Action:** POST restorations
- **Outcome contract:** Status 400; `errors[0].message` is `Backup archive contains files outside the server directory.`; `marker.txt` still `safe`; no `evil.txt` outside the instance dir.
- **Does NOT assert:** zip-slip on create.
- **Why:** restore must jail paths.

### Test 16 — deleting the instance discards its snapshots on disk

- **Surface:** McServersController.destroy
- **Suite:** functional
- **Setup:** ready snapshot; admin login.
- **Action:** DELETE `/api/v1/servers/:id` (keep files default)
- **Outcome contract:** Status 204; `data/backups/<identifier>/` no longer exists.
- **Does NOT assert:** whether `data/servers/<identifier>/` remains.
- **Why:** snapshots belong to the instance.

## Factories audit

Reads: testing.md

No Lucid factories. Tests create `User` / `McServer` / `ServerBackup` with `Model.create` like existing functional specs.

## Fakes audit

Reads: testing.md

- `FakeMcContainerService` — swap binding `McContainerService` at `tests/fakes/fake_mc_container_service.ts`. Boundary: wraps Docker Engine (external IO). Used by T11–T14.

## Order rationale

Stopped-instance CRUD first so the surface exists before Docker-fake cases. Zip-slip and instance-delete last because they need a working restore/delete path.

## Runner-model risks

Reads: testing.md

- Leftover `data/servers/<id>` and `data/backups/<id>` across tests. Mitigation: group teardown `rm` by identifier; unique identifier per test (`bk-${Date.now()}-${n}`).
- T14 hangs if the gate is never released. Mitigation: `finally` release after the second request, even on assertion failure.
- `testUtils.db().truncate()` per existing servers spec. Apply `group.each.setup`.
