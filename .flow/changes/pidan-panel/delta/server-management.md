---
capability: server-management
change: pidan-panel
---

# Delta — server-management

## ADDED

### List server instances

- Given an authenticated administrator, when requesting the server list, then all registered server instances with their names, ports, and current runtime status are returned.

### Create server instance

- Given an authenticated administrator, when providing valid instance details (name, identifier, unique port, memory), then a new server instance record is created and its local data directory is initialized.
- Given an already used port or identifier, when attempting to create an instance, then the request is rejected with a conflict error.

### View server instance details and metrics

- Given an authenticated administrator, when requesting details for a specific server instance, then its configuration, container state, and live metrics are returned.
- Given a non-existent instance id, when requesting details, then a 404 not found error is returned.

### Update server instance configuration

- Given an authenticated administrator, when updating memory, jar, port, or JVM parameters with valid values, then the instance configuration is persisted.
- Given invalid parameters (such as duplicate port or min memory greater than max memory), when updating, then the request is rejected with validation errors.

### Delete server instance

- Given an authenticated administrator and a stopped server instance, when requesting deletion, then the instance record and associated container are removed.
- Given an actively running server instance, when requesting deletion, then the request is rejected with a conflict error stating the server must be stopped first.

### Start server instance

- Given a stopped server instance with a valid server jar present in its directory, when requesting start, then a dedicated container launches with the configured JVM arguments and the port is published.
- Given an instance missing the executable jar, when requesting start, then the operation is rejected with an error indicating the jar is missing.
- Given an already running instance, when requesting start, then the request is rejected.

### Stop server instance

- Given an active server instance, when requesting stop, then a graceful stop signal is dispatched to the container.
- Given a stopped server instance, when requesting stop, then the request is rejected.

### Restart server instance

- Given an active server instance, when requesting restart, then the instance is stopped gracefully and automatically started again.

### Dispatch console command to instance

- Given an active server instance, when submitting a console command, then the command is written to that instance container's standard input.
- Given an inactive server instance, when submitting a command, then the request is rejected with an offline server error.

### Stream instance console logs

- Given an authenticated administrator, when subscribing to an instance's console log stream, then real-time standard output and standard error from its container are delivered via SSE.

### Browse instance files

- Given an authenticated administrator and instance id, when requesting a directory listing within that instance's data space, then file items and metadata are returned.
- Given a path traversing outside that instance's data directory, when requesting, then the request is rejected with an unauthorized path error.

### Read, write, upload, and delete instance files

- Given an authenticated administrator and valid file path within the instance boundary, when reading or saving content, then the file is accessed or updated.
- Given an uploaded file and target folder within the boundary, when uploading, then the file is stored in that folder.
- Given an existing file within the boundary, when requesting deletion, then the file is removed.
- Given any path outside the instance's directory, when attempting file operations, then the operation is rejected.

## MODIFIED

_None._

## REMOVED

_None._
