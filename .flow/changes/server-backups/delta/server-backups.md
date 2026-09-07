---
capability: server-backups
change: server-backups
---

# Delta — server-backups

## ADDED

### List instance snapshots

- Given an authenticated operator with access to an instance that has snapshots, when requesting the snapshot list, then the snapshots are returned newest first with name, size, readiness, failure reason, and created time.
- Given an authenticated operator without access to the instance, when requesting the snapshot list, then access is denied.
- Given an unauthenticated caller, when requesting the snapshot list, then the request is rejected as unauthorized.

### Create instance snapshot

- Given an authenticated operator with access and a stopped instance, when requesting a snapshot, then a ready snapshot of the entire instance data space is created and returned with its size.
- Given an authenticated operator with access and a running instance, when requesting a snapshot, then world saves are flushed and writes paused, the data space is copied, writes are resumed, and a ready snapshot is returned.
- Given a running instance where flushing or pausing writes fails, when requesting a snapshot, then the snapshot is aborted with `Failed to flush world saves. Backup aborted to avoid a corrupt snapshot.` and no usable archive is kept.
- Given a snapshot or restore already in progress for the instance, when requesting a snapshot, then the request is rejected with `A backup or restore is already in progress for this server.`
- Given no display name, when creating a snapshot, then the panel assigns a timestamp name.

### Download instance snapshot

- Given a ready snapshot, when downloading it, then the archive file is returned.
- Given a snapshot that is still creating or has failed, when downloading it, then the request is rejected with `Backup is not ready to download.`

### Restore instance snapshot

- Given a ready snapshot and a stopped instance, when restoring that snapshot onto the same instance, then the instance data space is replaced by the snapshot contents and the instance remains stopped.
- Given a running instance, when restoring, then the request is rejected with `Cannot restore while the server is running. Please stop the server first.`
- Given a snapshot that is not ready, when restoring, then the request is rejected with `Backup is not ready to restore.`
- Given a snapshot or restore already in progress, when restoring, then the request is rejected with `A backup or restore is already in progress for this server.`
- Given an archive whose paths would write outside the instance data space, when restoring, then the request is rejected with `Backup archive contains files outside the server directory.` and the current data space is unchanged.
- Given a restore that fails after the current data space has been moved aside, when the failure occurs, then the previous data space is put back.

### Delete instance snapshot

- Given a ready or failed snapshot, when deleting it, then the archive and list entry are removed.
- Given a snapshot that is still being created, when deleting it, then the request is rejected with `Cannot delete a backup that is still being created.`

### Discard snapshots with the instance

- Given an instance that has snapshots, when the operator deletes the instance, then those snapshots are discarded even if the instance world files are kept.

## MODIFIED

_None._

## REMOVED

_None._
