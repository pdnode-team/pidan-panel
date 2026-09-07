---
affects: [server-backups]
briefed: 2026-09-06
---

# Server Backups — Brief

## Entry point, user goal, status

The user is an authenticated operator (administrator, or a member assigned to the instance) who already manages Minecraft server instances. They enter from the instance they are operating, with the goal of taking a recoverable snapshot of that instance and, when needed, rolling the instance back to a chosen snapshot.

Status: new.

## Prerequisites

Instance management (the instance exists, the operator can access it). Starting and stopping the instance. The instance has a dedicated data space.

## The journey, step by step

1. **Viewing snapshots for an instance**
   - The operator opens the snapshots list for an instance they can access.
   - They see each snapshot’s name, size, readiness (creating / ready / failed), any failure reason, and when it was taken, newest first.
   - An operator without access to the instance cannot see the list.
   - An unauthenticated caller is rejected.

2. **Creating a snapshot**
   - The operator requests a new snapshot. They may supply a display name; if they do not, the panel assigns a timestamp name.
   - The snapshot captures the **entire instance data space** (worlds, plugins, configs, the server jar, and other files in that space).
   - If the instance is **stopped**, the panel copies the data space as-is.
   - If the instance is **running**, the panel first asks the game to flush world saves and pause writes, copies the data, then resumes writes. The world is only paused for the copy, not for later packaging.
   - If flushing or pausing writes fails, the snapshot is aborted. The panel does **not** copy a dirty running world. The operator sees: `Failed to flush world saves. Backup aborted to avoid a corrupt snapshot.`
   - While a snapshot or restore is already in progress for this instance, a second snapshot request is rejected: `A backup or restore is already in progress for this server.`
   - On success the operator receives the new snapshot, marked ready, with its size.
   - On packaging failure the snapshot is recorded as failed with a reason, and no usable archive is left behind.

3. **Downloading a snapshot**
   - The operator downloads a **ready** snapshot as an archive file.
   - A snapshot that is still creating or has failed cannot be downloaded: `Backup is not ready to download.`
   - The archive is stored outside the instance data space, so it does not appear in the instance file manager and is not included in the next snapshot.

4. **Restoring a snapshot onto the same instance**
   - The operator chooses a ready snapshot and asks to restore it onto **this same instance**.
   - The instance must be stopped. If it is running: `Cannot restore while the server is running. Please stop the server first.`
   - A snapshot that is not ready cannot be restored: `Backup is not ready to restore.`
   - If a snapshot or restore is already in progress: `A backup or restore is already in progress for this server.`
   - On success, the instance data space is replaced by the snapshot. Files added after the snapshot was taken are gone. Files that existed in the snapshot are back. The instance stays stopped; the operator starts it afterwards.
   - If the archive contains paths that would write outside the instance data space, restore is rejected: `Backup archive contains files outside the server directory.` The current data space is left unchanged.
   - If restore fails partway through, the previous data space is put back.

5. **Deleting a snapshot**
   - The operator deletes a snapshot they no longer need. The archive and the list entry are both gone.
   - A snapshot that is still being created cannot be deleted: `Cannot delete a backup that is still being created.`

6. **Deleting the instance**
   - When the operator deletes the instance, every snapshot for that instance is discarded as well, even if they chose to keep the instance’s world files. If they need a snapshot after deletion, they must download it first.

## Research

- Pterodactyl snapshots the whole instance directory and stores archives outside that directory so they are not nested in the next snapshot (Pterodactyl Wings backup adapter).
- MCSManager and Crafty treat backup as a first-class instance action with list / create / restore / delete, not as a file-manager zip.
- Minecraft operators pause world writes (`save-off` after `save-all`) before copying a live world so region files are consistent (Minecraft server commands; Paper `save-all flush`).

## Decisions made

| Decision                                            | Chosen over                                  | Why                                                                                                                                                      |
| :-------------------------------------------------- | :------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entire instance data space in each snapshot         | Worlds-only, or operator-picked paths        | Restoring a world without matching plugins and configs is a common footgun; the operator mental model is “snapshot of this server”. Matches Pterodactyl. |
| Live snapshot with flushed, paused writes           | Must-stop, or copy while dirty               | Survival servers should not kick everyone for a snapshot; a dirty copy can corrupt the world on restore.                                                 |
| Restore overwrites the current instance             | Restore-as-new-instance, or download-only v1 | A snapshot you cannot apply is not production-safe. Restore-as-new-instance needs a new identifier and port and is a later change.                       |
| Snapshots kept until the operator deletes them      | Auto-prune / keep-last-N                     | v1 stays small; disk policy can come with scheduled snapshots later.                                                                                     |
| Anyone who can operate the instance can snapshot it | Admin-only                                   | Snapshots are part of operating the instance, same as files and console.                                                                                 |
| Deleting the instance discards its snapshots        | Keep snapshots after instance deletion       | A snapshot belongs to that instance; restoring it requires the instance. Download first if it must survive.                                              |

## Constraints the journey places on implementation

1. A snapshot must not live inside the instance data space.
2. A live snapshot must not copy the world unless writes were successfully paused; otherwise abort with `Failed to flush world saves. Backup aborted to avoid a corrupt snapshot.`
3. Concurrent snapshot or restore on the same instance is rejected with `A backup or restore is already in progress for this server.`
4. Restore is refused while the instance is running, with `Cannot restore while the server is running. Please stop the server first.`
5. Restore must not write outside the instance data space; reject with `Backup archive contains files outside the server directory.`
6. A failed restore must leave the previous data space in place.
7. Deleting an instance discards that instance’s snapshots regardless of whether world files are kept.
8. Creating a snapshot still being packaged cannot be deleted: `Cannot delete a backup that is still being created.`
9. Only a ready snapshot can be downloaded or restored.
