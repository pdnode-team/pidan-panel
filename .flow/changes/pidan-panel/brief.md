---
affects: [server-management]
briefed: 2026-09-05
---

# Pidan Panel — Brief

## Entry point, user goal, status

The user is an authenticated administrator managing multiple dedicated Minecraft server instances running on a single local node. The user enters via the panel dashboard with the goal of creating, configuring, operating, and deleting distinct server instances. Each instance runs in its own isolated Docker container with an independent data directory, exclusive server port, and dedicated runtime settings.

Status: new.

## Prerequisites

User authentication (an active administrator session/token). Local Docker Engine available on the host node.

## The journey, step by step

1. **Viewing Server Instances List**:
   - The user views the dashboard showing all managed server instances.
   - For each instance, the user observes its name, allocated port, current runtime state (stopped, starting, running, error), and resource metrics (CPU/Memory).
   - The user can filter or navigate into a specific server instance.

2. **Creating a Server Instance**:
   - The user enters details for a new server instance: display name, unique identifier, target host port (e.g. 25565), memory limits (min/max), and optional server jar name or launch arguments.
   - The system validates that the identifier and host port are not already in use by another instance.
   - On success, the instance record is saved and a dedicated data directory (e.g. `data/servers/<id>/`) is initialized with standard requirements (such as default `eula.txt`).
   - If the port is already allocated, the creation is rejected with a conflict error.

3. **Configuring a Server Instance**:
   - The user selects a specific server instance and views its configuration: memory allocation limits, port mapping, server jar name, and additional JVM arguments.
   - The user updates and saves configuration.
   - If the server is currently running, the user is notified that changes will take effect on next restart.

4. **Starting an Instance**:
   - The user triggers start on a stopped instance.
   - The system checks that the server executable jar exists in the instance's data directory.
   - A dedicated Docker container (e.g. `pidan-mc-<identifier>`) is launched, binding the instance data directory to container `/data` and publishing the configured server port.
   - If the jar is missing, the start action halts with: "Server executable jar file not found".
   - If the container is already running or launching, redundant start actions are rejected.

5. **Monitoring Real-Time Console and Issuing Commands**:
   - The user opens the console view for an instance and receives a live log stream from the container.
   - The user sends in-game operator commands via the web console.
   - The command is written directly into the instance container's standard input stream.
   - If the instance is offline, the command is rejected.

6. **Stopping and Restarting an Instance**:
   - The user triggers stop on an active instance.
   - The container receives a graceful shutdown signal, saves world state, and terminates.
   - If graceful shutdown times out, forceful termination is applied.
   - If the user triggers restart, an orderly stop is executed followed by fresh startup.

7. **Managing Server Files per Instance**:
   - The user inspects files and directories inside the specific instance's data folder.
   - The user can view/edit text files, upload plugins/mods/jar files, rename, and delete items.
   - Any path traversal outside the specific instance's data directory is blocked.

8. **Deleting an Instance**:
   - The user deletes a stopped server instance.
   - The user chooses whether to retain or purge the instance's data directory.
   - Active running instances cannot be deleted until stopped.

## Decisions made

| Decision                               | Chosen over                           | Why                                                                                                                                                           |
| :------------------------------------- | :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Multi-instance, single-node            | Distributed multi-node (daemon/wings) | Keeps architecture as a simple self-contained monolith without separate daemon/agent synchronization complexity, while allowing multiple servers on one host. |
| Multi-instance, single-node            | Single-instance fixed singleton       | Provides full flexibility to run multiple game servers (e.g. Survival, Creative, BungeeCord) on distinct ports.                                               |
| Container standard input + stream logs | Network RCON protocol                 | Avoids managing extra RCON ports or credentials; directly leverages container runtime primitives.                                                             |
| Dedicated data directory per instance  | Shared directory space                | Isolates worlds, configs, and plugins, preventing port and file write collisions.                                                                             |
| Database persisted instance registry   | Pure Docker inspection                | Persists user-defined metadata, JVM flags, port mappings, and offline instance state reliably.                                                                |
| Pure RESTful API service presentation  | Bundled monolithic user interface     | Decouples interface design from backend lifecycle management for custom frontends.                                                                            |

## Constraints the journey places on implementation

1. **Port Exclusivity**: Each server instance must be assigned an exclusive host port (1024-65535) with no overlapping allocations across instances.
2. **Directory Isolation Barrier**: All file operations for an instance must be strictly jailed to that instance's designated data folder (`data/servers/<id>/`).
3. **Safe Deletion**: A running instance cannot be deleted; it must be stopped first.
4. **Container Naming Convention**: Containers must follow a predictable, collision-free naming format based on instance identifier (e.g. `pidan-mc-<id>`).
5. **Memory Sizing Rules**: For every instance, `max_memory_mb >= min_memory_mb` with positive integers.
