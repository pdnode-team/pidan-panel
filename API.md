# Pidan Panel 后端 API 文档 (v1)

> **基础信息**
>
> - **Base URL**: `http://localhost:3333/api/v1`
> - **数据规范**:
>   - 请求请务必携带 `Content-Type: application/json` 请求头（文件上传除外）。
>   - 成功响应体统一包裹在 `{ "data": ... }` 中（204 No Content 无响应体）。
>   - 失败响应体统一为 `{ "errors": [{ "message": "错误原因", "rule": "规则名", "field": "字段名" }] }`。
>   - 需要认证的接口，请求头需携带：`Authorization: Bearer <token>`。

---

## 目录

1. [系统与初始化 (System & Setup)](#1-系统与初始化)
2. [身份认证 (Authentication)](#2-身份认证)
3. [个人信息 (Profile)](#3-个人信息)
4. [Minecraft 服务端核心下载库 (MCJars)](#4-minecraft-服务端核心下载库)
5. [服务器实例管理 (Servers CRUD)](#5-服务器实例管理)
6. [服务器电源与生命周期 (Power State)](#6-服务器电源与生命周期)
7. [控制台指令交互 (Console Commands)](#7-控制台指令交互)
8. [实时控制台日志 (Console Logs - SSE)](#8-实时控制台日志-sse)
9. [硬件资源实时监控 (Resource Stats)](#9-硬件资源实时监控)
10. [文件管理沙箱 (File Manager)](#10-文件管理沙箱)
11. [服务端核心安装 (Install Jar)](#11-服务端核心安装)
12. [用户管理与实例分配 (User Management)](#12-用户管理与实例分配)
13. [实例快照备份与还原 (Server Backups)](#13-实例快照备份与还原)
14. [实例通用计划任务 (Server Schedules - Cron)](#14-实例通用计划任务)
15. [系统操作审计日志 (Audit Logs)](#15-系统操作审计日志)
16. [Minecraft 历史日志归档与流式解压 (Log Archives)](#16-minecraft-历史日志归档与流式解压)
17. [统一错误响应规范](#17-统一错误响应规范)

---

## 1. 系统与初始化

### 1.1 检查系统初始化状态

用于前端在进入登录/注册页时判断系统是否是“首次安装”（是否有初始管理员）。

- **URL**: `GET /system/setup-status`
- **鉴权**: 无需 Token
- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": {
      "needsSetup": true // true 表示未创建管理员，前端应跳转至首次管理员注册页；false 表示已初始化，跳转登录页
    }
  }
  ```

### 1.2 获取系统实时状态与概览 (System Status)

用于前端概览页展示“系统资源 (System Resources)”及“数据概览 (Data Overview)”。

- **URL**: `GET /system/status`
- **鉴权**: 需要 Token (`Authorization: Bearer <token>`)
- **响应字段说明**:

  | 字段               | 类型                       | 说明                                                          |
  | ------------------ | -------------------------- | ------------------------------------------------------------- |
  | `cpuPercent`       | number                     | 宿主机 CPU 使用率百分比（如 `12.5` 表示 12.5%）               |
  | `memoryPercent`    | number                     | 系统内存使用率百分比（如 `45.2` 表示 45.2%）                  |
  | `usedMemoryBytes`  | number                     | 已用系统内存（字节 Bytes）                                    |
  | `totalMemoryBytes` | number                     | 系统总内存（字节 Bytes）                                      |
  | `freeMemoryBytes`  | number                     | 空闲系统内存（字节 Bytes）                                    |
  | `nodeVersion`      | string                     | Node.js 运行时版本（如 `"v20.12.2"`）                         |
  | `panelVersion`     | string                     | 面板核心版本（如 `"1.0.0 (Adonis + Vue3)"`）                  |
  | `processUser`      | string                     | 面板进程运行用户（如 `"root / administrator"`）               |
  | `panelTime`        | string                     | 服务器当前 ISO 时间戳                                         |
  | `loadAverage`      | `[number, number, number]` | 系统负载均值（1分钟、5分钟、15分钟）                          |
  | `hostMachine`      | string                     | 宿主机主机名（如 `"pidan-local-srv"`）                        |
  | `osEnvironment`    | string                     | 操作系统与架构环境（如 `"Linux (x64)"` 或 `"Windows (x64)"`） |
  | `containerEngine`  | string                     | 容器引擎状态与版本（如 `"Docker 28.4.0 Ready"`）              |

- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": {
      "cpuPercent": 8.4,
      "memoryPercent": 48.2,
      "usedMemoryBytes": 8275914752,
      "totalMemoryBytes": 17179869184,
      "freeMemoryBytes": 8903954432,
      "nodeVersion": "v20.12.2",
      "panelVersion": "1.0.0 (Adonis + Vue3)",
      "processUser": "administrator",
      "panelTime": "2026-09-06T19:08:12.345Z",
      "loadAverage": [0.45, 0.62, 0.58],
      "hostMachine": "pidan-local-srv",
      "osEnvironment": "Windows (x64)",
      "containerEngine": "Docker 28.4.0 Ready"
    }
  }
  ```

### 1.3 全局健康检查 (Global Health Checks)

用于反向代理（Nginx/Caddy）、容器编排探针（Kubernetes liveness/readiness probe、Docker healthcheck）或全局监控中心（Uptime Kuma、Prometheus）。基于 AdonisJS 官方 `@adonisjs/core/health` 体系构建。

- **`GET /health`（liveness 存活探针）**：仅检查进程自身与数据库（磁盘、内存、数据库）。Docker 引擎异常**不会**导致失败，适用于 K8s liveness / Docker healthcheck，避免 Docker 抖动时面板被误重启。
- **`GET /api/v1/health`（readiness 完整就绪检查）**：在存活检查基础上额外包含 Docker 引擎检查，Docker 不可达时返回 `HTTP 503`。
- **鉴权**: 无需 Token
- **响应码**: 系统健康时返回 `HTTP 200 OK`，若核心组件严重异常则返回 `HTTP 503 Service Unavailable`。
- **响应示例 (HTTP 200，完整就绪检查)**:
  ```json
  {
    "isHealthy": true,
    "status": "ok",
    "finishedAt": "2026-09-07T20:00:00.000Z",
    "debugInfo": {
      "pid": 1234,
      "platform": "win32",
      "uptime": 123.45,
      "version": "v20.18.0"
    },
    "checks": [
      {
        "name": "Disk space check",
        "status": "ok",
        "message": "Disk usage is under defined thresholds"
      },
      {
        "name": "Memory heap check",
        "status": "ok",
        "message": "Heap usage is under defined thresholds"
      },
      {
        "name": "Database health check (sqlite)",
        "status": "ok",
        "message": "Successfully connected to the database server"
      },
      {
        "name": "Docker engine check",
        "status": "ok",
        "message": "Docker engine is reachable and operational",
        "meta": { "version": "28.4.0" }
      }
    ]
  }
  ```

---

## 2. 身份认证

### 2.1 首次管理员注册 (Signup)

当 `needsSetup === true` 时可用。创建第一个系统管理员后，该接口将永久关闭（禁止后续自行注册）。

- **URL**: `POST /auth/signup`
- **鉴权**: 无需 Token
- **请求体 (JSON)**:

  | 字段                   | 类型           | 必填 | 说明                               |
  | ---------------------- | -------------- | ---- | ---------------------------------- |
  | `fullName`             | string \| null | 否   | 管理员姓名/昵称                    |
  | `email`                | string         | 是   | 邮箱地址，唯一                     |
  | `password`             | string         | 是   | 密码，最少 8 位，最长 32 位        |
  | `passwordConfirmation` | string         | 是   | 确认密码，必须与 password 完全一致 |

- **请求示例**:
  ```json
  {
    "fullName": "Administrator",
    "email": "admin@example.com",
    "password": "AdminPassword123!",
    "passwordConfirmation": "AdminPassword123!"
  }
  ```
- **响应示例 (HTTP 201)**:
  ```json
  {
    "data": {
      "user": {
        "id": 1,
        "fullName": "Administrator",
        "email": "admin@example.com",
        "role": "admin",
        "serverIds": [],
        "initials": "AD",
        "createdAt": "2026-09-06T00:00:00.000Z",
        "updatedAt": "2026-09-06T00:00:00.000Z"
      },
      "token": "oat_MQ.XXXXXXXXXXXXXX"
    }
  }
  ```
- **特殊错误**:
  - `HTTP 403`: `{"errors": [{"message": "Registration is closed. Administrator already exists."}]}`
  - `HTTP 429`: 触发注册限流（每 IP 每 10 分钟最多 5 次）。并发注册有保护：两个并发首次注册只会产生一个管理员。

### 2.2 用户登录 (Login)

- **URL**: `POST /auth/login`
- **鉴权**: 无需 Token
- **限流**: 同一 IP 每分钟最多 10 次登录尝试；同一 IP + 邮箱组合每分钟最多 5 次失败尝试，超限后封禁 20 分钟（成功登录会清除计数）。
- **Token 有效期**: 登录签发的 Access Token 有效期为 **7 天**，过期后需重新登录。
- **请求体 (JSON)**:

  | 字段       | 类型   | 必填 | 说明     |
  | ---------- | ------ | ---- | -------- |
  | `email`    | string | 是   | 登录邮箱 |
  | `password` | string | 是   | 登录密码 |

- **请求示例**:
  ```json
  {
    "email": "admin@example.com",
    "password": "AdminPassword123!"
  }
  ```
- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": {
      "user": {
        "id": 1,
        "fullName": "Administrator",
        "email": "admin@example.com",
        "role": "admin",
        "serverIds": [],
        "initials": "AD",
        "createdAt": "2026-09-06T00:00:00.000Z",
        "updatedAt": "2026-09-06T00:00:00.000Z"
      },
      "token": "oat_MQ.YYYYYYYYYYYYYY"
    }
  }
  ```
- **特殊错误**:
  - `HTTP 400`: 邮箱或密码错误
  - `HTTP 429`: 触发登录限流

### 2.3 退出登录 (Logout)

注销当前 Token。

- **URL**: `POST /logout`
- **鉴权**: `Bearer <token>`
- **响应**: `HTTP 200 OK`
  ```json
  {
    "data": {
      "message": "Logged out successfully"
    }
  }
  ```

---

## 3. 个人信息

### 3.1 获取当前登录用户信息

- **URL**: `GET /profile`
- **鉴权**: `Bearer <token>`
- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": {
      "id": 1,
      "fullName": "Administrator",
      "email": "admin@example.com",
      "role": "admin",
      "serverIds": [],
      "initials": "AD",
      "createdAt": "2026-09-06T00:00:00.000Z",
      "updatedAt": "2026-09-06T00:00:00.000Z"
    }
  }
  ```

---

## 4. Minecraft 服务端核心下载库

用于新建服务器时提供核心类型（Paper, Vanilla, Purpur, Fabric...）与版本选择。

### 4.1 获取所有支持的服务端类型

- **URL**: `GET /mcjars/types`
- **鉴权**: `Bearer <token>`
- **响应示例 (HTTP 200)**（以类型英文标识为 key 的对象）:
  ```json
  {
    "data": {
      "paper": {
        "name": "Paper",
        "icon": "https://...",
        "description": "High performance Minecraft server",
        "builds": 42,
        "deprecated": false,
        "experimental": false
      },
      "purpur": {
        "name": "Purpur",
        "icon": "https://...",
        "description": "Purpur server software",
        "builds": 31,
        "deprecated": false,
        "experimental": false
      }
    }
  }
  ```

### 4.2 获取指定类型的可用版本列表

- **URL**: `GET /mcjars/types/:type` (例如 `/mcjars/types/paper`)
- **鉴权**: `Bearer <token>`
- **响应示例 (HTTP 200)**（以版本号为 key 的对象）:
  ```json
  {
    "data": {
      "1.21.4": {
        "version": "1.21.4",
        "type": "paper",
        "java": 21,
        "supported": true,
        "jarUrl": "https://...",
        "jarSize": 51234000,
        "buildNumber": 123,
        "zipUrl": null,
        "isZip": false
      },
      "1.20.4": {
        "version": "1.20.4",
        "type": "paper",
        "java": 17,
        "supported": true,
        "jarUrl": "https://...",
        "jarSize": 48210000,
        "buildNumber": 498,
        "zipUrl": null,
        "isZip": false
      }
    }
  }
  ```

---

## 5. 服务器实例管理

### 5.1 获取服务器列表

- **URL**: `GET /servers`
- **鉴权**: `Bearer <token>`
- **行为**: 非分页列表，按 `id` 升序。管理员返回全部实例，普通用户仅返回被授权的实例。
- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "name": "生存一服",
        "identifier": "survival-1",
        "serverJar": "server.jar",
        "dockerImage": "eclipse-temurin:21-jre-alpine",
        "minMemoryMb": 1024,
        "maxMemoryMb": 4096,
        "serverPort": 25565,
        "javaArgs": "-XX:+UseG1GC",
        "stopTimeoutSeconds": 60,
        "autoStartOnBoot": false,
        "autoRestartOnCrash": false,
        "crashBackoffInitialSeconds": 5,
        "crashBackoffMaxSeconds": 300,
        "crashMaxRetries": 5,
        "createdAt": "2026-09-06T00:00:00.000Z",
        "updatedAt": "2026-09-06T00:00:00.000Z"
      }
    ]
  }
  ```

### 5.2 创建服务器实例

- **URL**: `POST /servers`
- **鉴权**: `Bearer <token>`
- **请求体 (JSON)**:

  | 字段          | 类型   | 必填 | 默认值 / 约束                     | 说明                               |
  | ------------- | ------ | ---- | --------------------------------- | ---------------------------------- |
  | `name`        | string | 是   | 1-100字符                         | 显示名称，如 "我的MC服务器"        |
  | `identifier`  | string | 是   | 2-50字符，正则 `^[a-z0-9-]+$`     | 唯一英文标识，决定容器名和存放目录 |
  | `serverJar`   | string | 否   | `"server.jar"`                    | 运行的核心文件名，不含路径分隔符   |
  | `dockerImage` | string | 否   | `"eclipse-temurin:21-jre-alpine"` | Java 运行环境镜像（仅管理员）      |
  | `minMemoryMb` | number | 否   | `1024` (256~65536)                | 最小内存 (-Xms)                    |
  | `maxMemoryMb` | number | 否   | `2048` (256~65536)                | 最大内存 (-Xmx)                    |
  | `serverPort`  | number | 是   | 1024~65535，全局唯一              | 游戏对外端口，映射容器 25565       |
  | `javaArgs`    | string | 否   | 空                                | 附加 JVM 启动参数                  |
  | `stopTimeoutSeconds` | number | 否 | `60` (5~300)               | 优雅停机等待秒数                   |
  | `autoStartOnBoot`    | boolean | 否 | `false`                    | 面板启动时自动开机                 |
  | `autoRestartOnCrash` | boolean | 否 | `false`                    | 崩溃后自动重启                     |
  | `crashBackoffInitialSeconds` | number | 否 | `5` (1~60)          | 崩溃重启初始退避秒数               |
  | `crashBackoffMaxSeconds` | number | 否 | `300` (5~3600)              | 崩溃重启最大退避秒数               |
  | `crashMaxRetries` | number | 否 | `5` (0~50)                      | 崩溃连续重启最大次数               |

- **请求示例**:
  ```json
  {
    "name": "纯净生存服",
    "identifier": "pure-survival",
    "serverJar": "server.jar",
    "dockerImage": "eclipse-temurin:21-jre-alpine",
    "minMemoryMb": 2048,
    "maxMemoryMb": 4096,
    "serverPort": 25565,
    "javaArgs": "-XX:+UseG1GC"
  }
  ```
- **响应**: `HTTP 201 Created`，返回包含 `data` 的服务器完整详情（字段同 5.1）。

### 5.3 获取单个服务器详情

- **URL**: `GET /servers/:id`
- **鉴权**: `Bearer <token>`
- **响应**: `HTTP 200 OK`，字段同 5.1（实时运行状态请使用 `GET /servers/:id/power`）。

### 5.4 更新服务器配置

- **URL**: `PUT /servers/:id` 或 `PATCH /servers/:id`
- **鉴权**: `Bearer <token>`
- **权限**: 管理员或被授权用户。其中 `dockerImage` **仅管理员可修改**（普通用户修改会返回 `403 Forbidden`）。
- **请求体**: 所有字段均为可选，仅传递要修改的字段（`name`, `serverJar`, `dockerImage`, `minMemoryMb`, `maxMemoryMb`, `serverPort`, `javaArgs`, `stopTimeoutSeconds`, `autoStartOnBoot`, `autoRestartOnCrash`, `crashBackoffInitialSeconds`, `crashBackoffMaxSeconds`, `crashMaxRetries`）。
  - `serverJar` 不允许包含路径分隔符（`/` 或 `\`）。
- **响应**: `HTTP 200 OK`，返回修改后的实例。

### 5.5 删除服务器

- **URL**: `DELETE /servers/:id`
- **鉴权**: 仅 `admin` 角色
- **查询参数 / 请求体 (可选)**:
  - `deleteFiles`: `boolean`，默认 `false`。
    - `false` (默认)：仅销毁 Docker 容器并删除数据库记录，**保留服务器数据目录（地图、存档、配置等）**。
    - `true`（如 `?deleteFiles=true` 或 `{ "deleteFiles": true }`）：在销毁容器和记录的同时，**彻底从磁盘抹除该实例的数据目录**。
  - 无论 `deleteFiles` 取值如何，该实例的**快照备份都会被丢弃**。若删除后仍需保留备份，请先下载。
- **前置条件**: 服务器必须处于停止状态。如果正在运行，将返回 `409 Conflict`。
- **特殊错误**:
  - `HTTP 503`: Docker 引擎不可达时拒绝删除（无法安全确认容器已被移除）。
  - `HTTP 500`: 容器移除失败或数据目录抹除失败时中止删除，实例保留以便重试；失败会记入审计日志。
- **审计**: 删除成功与失败均会写入审计日志（`server.delete`），实例删除后日志通过 `serverName`/`serverIdentifier` 保留归属信息。
- **响应**: `HTTP 204 No Content`

---

## 6. 服务器电源与生命周期

### 6.1 查看当前电源状态

- **URL**: `GET /servers/:id/power`
- **鉴权**: `Bearer <token>`
- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": {
      "status": "running", // "running" | "stopped" | "restarting"
      "containerId": "5e1f...",
      "memoryLimitMb": 4096,
      "serverPort": 25565
    }
  }
  ```

### 6.2 启动服务器

- **URL**: `POST /servers/:id/power`
- **鉴权**: `Bearer <token>`
- **响应示例 (HTTP 201)**:
  ```json
  {
    "data": {
      "status": "starting",
      "message": "Server container launch initiated"
    }
  }
  ```

### 6.3 停止 / 强杀服务器

- **URL**: `DELETE /servers/:id/power`
- **查询参数**:
  - `force` (可选): `boolean` (`?force=true` 或 `?force=false`)
- **请求体 (可选)**: 也可以在 Body 中传 `{ "force": true }`
- **模式说明**:
  - **默认（优雅关服）**：不带 `force`，面板先向控制台发送 `stop` 命令让 MC 保存存档，等待最长 15 秒后关闭容器。
  - **强杀（Force Kill）**：带 `?force=true`，面板直接发送 `SIGKILL` 强制终结容器，秒级停止，适用于服务器无响应或卡死。
- **响应**: `HTTP 204 No Content`

### 6.4 重启服务器

- **URL**: `PATCH /servers/:id/power`
- **鉴权**: `Bearer <token>`
- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": {
      "status": "restarting",
      "message": "Server container restart initiated"
    }
  }
  ```

---

## 7. 控制台指令交互

### 7.1 向服务器发送控制台指令 (STDIN)

向运行中的服务器发送指令。**支持用户或前端输入带或不带斜杠 `/`**（后端已做自动剔除容错）。

- **URL**: `POST /servers/:id/commands`
- **鉴权**: `Bearer <token>`
- **请求体 (JSON)**:

  | 字段      | 类型   | 必填 | 说明                                                     |
  | --------- | ------ | ---- | -------------------------------------------------------- |
  | `command` | string | 是   | 指令内容，1-1000字符。如 `"ban Steve"` 或 `"/ban Steve"` |

- **请求示例**:
  ```json
  {
    "command": "say 大家好，欢迎来到服务器！"
  }
  ```
- **响应**: `HTTP 204 No Content`

---

## 8. 实时控制台日志 (SSE)

### 8.1 建立实时日志长连接

基于 **Server-Sent Events (SSE)** 实时推流。连接建立时自动输出最后 50 行历史日志并持续推流。

- **URL**: `GET /servers/:id/logs`
- **鉴权**: `Bearer <token>`（由于浏览器原生 `EventSource` 不方便带 Header，可在 Query 中通过中间件或使用 `fetch` / 第三方库 `@microsoft/fetch-event-source` 携带 `Authorization: Bearer <token>`）
- **响应类型**: `text/event-stream`
- **数据帧格式**:
  ```text
  data: [12:34:56 INFO]: [Server] Done (3.456s)! For help, type "help"

  data: [12:35:01 INFO]: Steve joined the game
  ```

---

## 9. 硬件资源实时监控

### 9.1 获取硬件监控指标

同时支持**单次快照拉取**与 **SSE 持续实时推流**。

- **URL**: `GET /servers/:id/stats`
- **鉴权**: `Bearer <token>`
- **查询参数**:
  - `stream` (可选): 为 `"true"` 时开启 SSE 实时长连接；不传或为 `"false"` 时为单次 HTTP 快照。

#### 模式一：单次快照 (HTTP 200 JSON)

- **请求**: `GET /servers/:id/stats`
- **响应示例 (运行中)**:
  ```json
  {
    "data": {
      "online": true,
      "cpuPercent": 15.42, // 当前 CPU 占用百分比 (数字，如 15.42)
      "memoryBytes": 1610612736, // 当前已用内存字节数 (例如 1.5 GB，已剔除系统 cache)
      "memoryUsageBytes": 1610612736, // 物理内存占用 (同 memoryBytes)
      "memoryLimitBytes": 4294967296, // 实例配置的最大内存上限字节数 (例如 4.0 GB)
      "memoryPercent": 37.5, // 内存占用百分比 (%)
      "diskBytes": 524288000, // 服务器数据目录占用磁盘大小 (Bytes，带 30s 缓存)
      "networkRxBytes": 2048576, // 累计网络下行接收字节数
      "networkTxBytes": 4096128 // 累计网络上行发送字节数
    }
  }
  ```
- **响应示例 (离线状态)**:
  ```json
  {
    "data": {
      "online": false,
      "cpuPercent": 0,
      "memoryBytes": 0,
      "memoryUsageBytes": 0,
      "memoryLimitBytes": 4294967296,
      "memoryPercent": 0,
      "diskBytes": 524288000,
      "networkRxBytes": 0,
      "networkTxBytes": 0
    }
  }
  ```
  _(注：即使服务器离线也返回 HTTP 200 和安全零值，避免前端控制台报错标红)_

#### 模式二：SSE 实时流推流 (text/event-stream)

- **请求**: `GET /servers/:id/stats?stream=true`
- **数据帧格式 (每 1.5 秒推送一次)**:
  ```text
  data: {"online":true,"cpuPercent":12.5,"memoryBytes":1572864000,"memoryUsageBytes":1572864000,"memoryLimitBytes":4294967296,"memoryPercent":36.62,"diskBytes":524288000,"networkRxBytes":2100000,"networkTxBytes":4200000}
  ```

---

## 10. 文件管理沙箱

所有路径均受绝对沙箱隔离保护（禁止跨出该服务器专属的 `dataDirectory`）。

### 10.1 浏览目录

- **URL**: `GET /servers/:id/files`
- **查询参数**:
  - `path` (可选): 相对路径，默认为根目录 `""`。如 `plugins` 或 `world/data`
- **鉴权**: `Bearer <token>`
- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": [
      {
        "name": "plugins",
        "path": "plugins",
        "isDirectory": true,
        "sizeBytes": 0,
        "modifiedAt": "2026-09-06T00:00:00.000Z",
        "extension": ""
      },
      {
        "name": "server.properties",
        "path": "server.properties",
        "isDirectory": false,
        "sizeBytes": 1245,
        "modifiedAt": "2026-09-06T00:00:00.000Z",
        "extension": ".properties"
      }
    ]
  }
  ```

### 10.2 读取文本文件内容

- **URL**: `GET /servers/:id/files/content`
- **查询参数**:
  - `path`: 相对文件路径（必填），如 `server.properties`
- **鉴权**: `Bearer <token>`
- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": {
      "path": "server.properties",
      "content": "enable-jmx-monitoring=false\nrcon.port=25575\n..."
    }
  }
  ```

### 10.3 保存/创建文本文件

- **URL**: `POST /servers/:id/files`
- **鉴权**: `Bearer <token>`
- **请求体 (JSON)**:
  ```json
  {
    "path": "server.properties",
    "content": "motd=A Minecraft Server\nonline-mode=false\n..."
  }
  ```
- **响应示例 (HTTP 201)**:
  ```json
  {
    "data": {
      "success": true,
      "message": "File \"server.properties\" saved successfully"
    }
  }
  ```

### 10.4 上传文件 (Multipart)

- **URL**: `POST /servers/:id/files`
- **鉴权**: `Bearer <token>`
- **Content-Type**: `multipart/form-data`
- **表单字段**:
  - `path`: string (可选，目标目录，如 `plugins`，留空代表根目录)
  - `file`: 待上传的二进制文件（最大限制 500MB，支持 jar/zip/schem/yml 等）
- **响应示例 (HTTP 201)**:
  ```json
  {
    "data": {
      "success": true,
      "message": "File \"EssentialsX.jar\" uploaded successfully"
    }
  }
  ```

### 10.5 重命名 / 移动文件

- **URL**: `PATCH /servers/:id/files`
- **鉴权**: `Bearer <token>`
- **请求体 (JSON)**:
  ```json
  {
    "oldPath": "plugins/config_old.yml",
    "newPath": "plugins/config.yml"
  }
  ```
- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": {
      "success": true,
      "message": "File renamed successfully"
    }
  }
  ```

### 10.6 删除文件或文件夹

- **URL**: `DELETE /servers/:id/files`
- **查询参数**:
  - `path`: 待删除的相对文件或目录路径（必填）
- **鉴权**: `Bearer <token>`
- **响应**: `HTTP 204 No Content`

---

## 11. 服务端核心安装

### 11.1 一键下载或安装服务端核心

通过 MCJars 类型+版本直接下载，或通过任意自定义 Jar 直链 URL 下载并自动配置给服务器。

- **URL**: `POST /servers/:id/jars`
- **鉴权**: `Bearer <token>`
- **请求体 (JSON)**:

  | 字段              | 类型    | 必填 | 说明                                                            |
  | ----------------- | ------- | ---- | --------------------------------------------------------------- |
  | `type`            | string  | 选填 | 核心类型，如 `"paper"`, `"purpur"`, `"vanilla"`                 |
  | `version`         | string  | 选填 | 对应版本，如 `"1.21.4"`                                         |
  | `url`             | string  | 选填 | 自定义直链下载 URL（与 type+version 二选一）                    |
  | `targetFileName`  | string  | 选填 | 保存的目标文件名，默认 `"server.jar"`                           |
  | `updateServerJar` | boolean | 选填 | 下载后是否自动将该服务器的启动核心配置更新为该文件，默认 `true` |

- **请求示例 (通过 MCJars)**:
  ```json
  {
    "type": "paper",
    "version": "1.21.4",
    "updateServerJar": true
  }
  ```
- **请求示例 (通过自定义直链)**:
  ```json
  {
    "url": "https://example.com/forge-1.20.1-installer.jar",
    "targetFileName": "forge.jar",
    "updateServerJar": true
  }
  ```
- **响应示例 (HTTP 201)**:
  ```json
  {
    "data": {
      "success": true,
      "message": "Successfully installed \"server.jar\"",
      "fileName": "server.jar"
    }
  }
  ```

---

## 12. 用户管理与实例分配

> **访问限制**：本章节所有接口仅拥有超级管理员（`admin`）角色的用户可以调用，普通用户访问一律返回 `403 Forbidden`。

### 12.1 获取用户列表 (分页与搜索)

- **URL**: `GET /users`
- **鉴权**: 需要 Token (`admin` 角色)
- **查询参数**:
  | 参数      | 类型   | 说明                             |
  | --------- | ------ | -------------------------------- |
  | `page`    | number | 页码（默认 1）                   |
  | `perPage` | number | 每页数量（默认 20，上限 100）    |
  | `search`  | string | 搜索关键词（模糊匹配姓名或邮箱） |
- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "fullName": "Administrator",
        "email": "admin@pidan.local",
        "role": "admin",
        "serverIds": [],
        "initials": "AD",
        "createdAt": "2026-09-06T12:00:00.000Z",
        "updatedAt": "2026-09-06T12:00:00.000Z"
      },
      {
        "id": 2,
        "fullName": "Player One",
        "email": "player@pidan.local",
        "role": "user",
        "serverIds": [1, 3],
        "initials": "PO",
        "createdAt": "2026-09-06T12:10:00.000Z",
        "updatedAt": "2026-09-06T12:10:00.000Z"
      }
    ],
    "meta": {
      "total": 2,
      "perPage": 20,
      "currentPage": 1,
      "lastPage": 1
    }
  }
  ```

  > **注意**: 响应分页信封为 `{ data, metadata }`（`metadata` 而非 `meta`）。

### 12.2 创建新用户

- **URL**: `POST /users`
- **鉴权**: 需要 Token (`admin` 角色)
- **请求体 (JSON)**:
  | 字段        | 类型           | 必填 | 说明                                                                  |
  | ----------- | -------------- | ---- | --------------------------------------------------------------------- |
  | `email`     | string         | 是   | 用户登录邮箱（全局唯一）                                              |
  | `password`  | string         | 是   | 初始密码（最少 8 位）                                                 |
  | `fullName`  | string \| null | 否   | 用户称谓/真实姓名                                                     |
  | `role`      | string         | 否   | 角色：`"admin"` 或 `"user"`（默认为 `"user"`）                        |
  | `serverIds` | `number[]`     | 否   | 授权该用户可访问与操作的服务器实例 ID 列表（如 `[1, 2]`，多对多授权） |

### 12.3 获取单个用户详情

- **URL**: `GET /users/:id`
- **鉴权**: 需要 Token (`admin` 角色)

### 12.4 修改用户资料与实例授权

- **URL**: `PATCH /users/:id`
- **鉴权**: 需要 Token (`admin` 角色)
- **请求体 (JSON)**:
  | 字段        | 类型           | 必填 | 说明                                                           |
  | ----------- | -------------- | ---- | -------------------------------------------------------------- |
  | `email`     | string         | 否   | 修改邮箱                                                       |
  | `password`  | string         | 否   | 重置密码（传入即更新，不传保持原密码）                         |
  | `fullName`  | string \| null | 否   | 修改姓名                                                       |
  | `role`      | string         | 否   | 修改角色（禁止将系统中最后一位管理员降级为普通用户）           |
  | `serverIds` | `number[]`     | 否   | 更新该用户的授权实例 ID 列表（如 `[1, 3]` 即覆盖更新为该列表） |

### 12.5 删除用户

- **URL**: `DELETE /users/:id`
- **鉴权**: 需要 Token (`admin` 角色)
- **防护机制**:
  - **防自杀保护**：禁止管理员删除自身当前正在登录的账号（返回 400）。
  - **唯一管理员保护**：禁止删除系统中最后一位管理员（返回 400）。
- **响应**: HTTP 204 No Content

---

## 13. 实例快照备份与还原

对某个实例做全量数据快照（世界、插件、配置、核心 jar）。快照文件保存在实例数据目录之外，不会出现在文件管理器里，也不会被打进下一次快照。

能操作该实例的用户（管理员，或 `serverIds` 包含该实例的用户）均可调用本章接口。

### 13.1 获取快照列表（分页）

- **URL**: `GET /servers/:id/backups`
- **查询参数**: `page`（默认 1）、`perPage`（默认 20，上限 100）
- **鉴权**: `Bearer <token>`，且对该实例有访问权
- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "name": "before-upgrade",
        "fileName": "backup-20260906-190812-1.zip",
        "sizeBytes": 1048576,
        "status": "ready",
        "errorMessage": null,
        "createdAt": "2026-09-06T19:08:12.000Z",
        "updatedAt": "2026-09-06T19:08:12.000Z"
      }
    ],
    "meta": {
      "total": 1,
      "perPage": 20,
      "currentPage": 1
    }
  }
  ```
  `status` 为 `"pending"` | `"ready"` | `"failed"`。列表按创建时间倒序。

### 13.2 创建快照

- **URL**: `POST /servers/:id/backups`
- **请求体 (JSON，均可选)**:
  | 字段   | 类型   | 说明                                         |
  | ------ | ------ | -------------------------------------------- |
  | `name` | string | 显示名称，1–100 字符。省略时由面板填入时间戳 |
- **行为**:
  - 实例已停止：直接拷贝数据目录后打包。
  - 实例运行中：先发送 `save-all flush` 与 `save-off`，拷贝后再 `save-on`。刷盘失败则中止，不拷贝脏档。
- **响应**: `HTTP 201`，返回快照对象（成功时 `status` 为 `"ready"`）。
- **错误**:
  - `HTTP 409`: `A backup or restore is already in progress for this server.`
  - `HTTP 400`: `Failed to flush world saves. Backup aborted to avoid a corrupt snapshot.`

### 13.3 获取快照详情

- **URL**: `GET /servers/:id/backups/:backupId`
- **响应**: `HTTP 200`，单个快照对象。

### 13.4 下载快照

- **URL**: `GET /servers/:id/backups/:backupId/download`
- **响应**: zip 文件（非 `{ data }` 包裹）。仅 `ready` 状态可下载。
- **错误**: `HTTP 409` `Backup is not ready to download.`

### 13.5 还原快照到当前实例

- **URL**: `POST /servers/:id/backups/:backupId/restorations`
- **前置**: 实例必须已停止；快照必须为 `ready`。
- **行为**: 用该快照覆盖当前实例数据目录。快照之后新增的文件会消失。还原后实例保持停止，需再开机。
- **响应示例 (HTTP 201)**:
  ```json
  {
    "data": {
      "status": "restored",
      "backupId": 1,
      "message": "Backup restored successfully."
    }
  }
  ```
- **错误**:
  - `HTTP 409`: `Cannot restore while the server is running. Please stop the server first.`
  - `HTTP 409`: `Backup is not ready to restore.`
  - `HTTP 409`: `A backup or restore is already in progress for this server.`
  - `HTTP 400`: `Backup archive contains files outside the server directory.`

### 13.6 删除快照

- **URL**: `DELETE /servers/:id/backups/:backupId`
- **响应**: `HTTP 204 No Content`
- **错误**: `HTTP 409` `Cannot delete a backup that is still being created.`

---

## 14. 实例通用计划任务 (Server Schedules - Cron)

基于 `adonisjs-scheduler` 调度引擎，支持服主为当前服务器实例配置定时自动化任务：

- 定时自动创建快照（可附带通配符排除规则）
- 定时向服务器控制台发送命令（如广播、定时清道夫指令、定时保存）
- 定时重启、关机、开机

> **访问限制**：计划任务涉及指令下发、定时自动备份与容器生命周期调度，仅拥有超级管理员（`admin`）角色的用户可以配置和操作，普通用户访问一律返回 `403 Forbidden`。

### 14.1 获取计划任务列表 (分页)

- **URL**: `GET /servers/:id/schedules`
- **查询参数**: `page`（默认 1）、`perPage`（默认 50，上限 100）
- **鉴权**: `Bearer <token>`
- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "mcServerId": 1,
        "name": "每日凌晨 4 点自动备份",
        "cron": "0 4 * * *",
        "action": "backup",
        "payload": {
          "name": "Auto-4AM",
          "excludes": ["logs/**", "crash-reports/**"]
        },
        "isActive": true,
        "lastRunAt": "2026-09-07T04:00:00.000Z",
        "lastRunStatus": "success",
        "lastRunMessage": "Backup #12 (Auto-4AM) created successfully",
        "createdAt": "2026-09-06T10:00:00.000Z",
        "updatedAt": "2026-09-07T04:00:05.000Z"
      }
    ],
    "meta": {
      "total": 1,
      "perPage": 50,
      "currentPage": 1,
      "lastPage": 1
    }
  }
  ```

### 14.2 创建计划任务

- **URL**: `POST /servers/:id/schedules`
- **鉴权**: `Bearer <token>`
- **请求体 (JSON)**:

  | 字段       | 类型    | 必填 | 说明                                                                        |
  | ---------- | ------- | ---- | --------------------------------------------------------------------------- |
  | `name`     | string  | 是   | 任务名称（1–100 字符）                                                      |
  | `cron`     | string  | 是   | 标准 Cron 表达式（如 `"0 4 * * *"` 每天凌晨 4 点）                          |
  | `action`   | string  | 是   | 动作类型：`"backup"` \| `"command"` \| `"restart"` \| `"start"` \| `"stop"` |
  | `payload`  | object  | 否   | 动作附加参数对象（见下表）                                                  |
  | `isActive` | boolean | 否   | 是否启用（默认 `true`）                                                     |

- **`payload` 字段说明**:

  | 关联 action | 字段       | 类型              | 说明                                                                 |
  | ----------- | ---------- | ----------------- | -------------------------------------------------------------------- |
  | `command`   | `command`  | string            | 要向服务器发送的指令文本（如 `"say 每日例行维护将在 5 分钟后开始"`） |
  | `backup`    | `name`     | string (可选)     | 自动快照显示名称                                                     |
  | `backup`    | `excludes` | `string[]` (可选) | 自定义排除的文件通配符规则（如 `["logs/**"]`）                       |

- **响应**: `HTTP 201 Created`，返回创建成功的计划任务对象。
- **错误**:
  - `HTTP 422`: `The cron field must be a valid cron expression`
  - `HTTP 422`: `The action field must be in ...`

### 14.3 获取计划任务详情

- **URL**: `GET /servers/:id/schedules/:scheduleId`
- **响应**: `HTTP 200`，单个计划任务对象。

### 14.4 更新计划任务

- **URL**: `PATCH /servers/:id/schedules/:scheduleId`
- **鉴权**: `Bearer <token>`
- **请求体 (JSON，均可选)**:
  - `name`: string
  - `cron`: string
  - `action`: `"backup"` | `"command"` | `"restart"` | `"start"` | `"stop"`
  - `payload`: object
  - `isActive`: boolean (快速启用/停用)
- **响应**: `HTTP 200`，更新后的计划任务对象。

### 14.5 删除计划任务

- **URL**: `DELETE /servers/:id/schedules/:scheduleId`
- **响应**: `HTTP 204 No Content`

### 14.6 立即手动触发执行一次 (Manual Run)

用于服主或管理员测试计划任务是否工作正常，或在运维中手动立即触发该预设任务。

- **URL**: `POST /servers/:id/schedules/:scheduleId/runs`
- **鉴权**: `Bearer <token>`
- **响应**: `HTTP 200 OK`，返回执行后的最新任务对象（附带最新的 `lastRunAt`、`lastRunStatus` 与 `lastRunMessage`）。

---

## 15. 系统操作审计日志 (Audit Logs)

记录系统中所有关键操作，仅追加不可删改：

- **命令派发**（`command.dispatch`）
- **电源控制**（`power.start` / `power.stop` / `power.restart` / `power.kill`）
- **文件变更**（`file.upload` / `file.save` / `file.rename` / `file.delete`）
- **备份还原**（`backup.create` / `backup.delete` / `backup.restore`）
- **实例管理**（`server.create` / `server.update` / `server.delete`）
- **认证事件**（`auth.signup` / `auth.login` / `auth.logout`，含失败登录）
- **用户管理**（`user.create` / `user.update` / `user.delete`）
- **计划任务**（`schedule.create` / `schedule.update` / `schedule.delete` / `schedule.run` / `schedule.execute`）

**保留期**: 普通类别 30 天；安全敏感类别（`auth` / `user`）90 天。实例删除后相关日志保留，通过 `serverName` / `serverIdentifier` 快照字段保留归属。

### 15.1 查询全局审计日志（仅管理员）

- **URL**: `GET /audit-logs`
- **鉴权**: `Bearer <token>`（需 `admin` 角色）
- **查询参数（均可选）**:
  | 参数 | 类型 | 说明 |
  | --- | --- | --- |
  | `page` | number | 页码，默认 1 |
  | `perPage` | number | 每页条数，默认 20，最大 100 |
  | `category` | string | 筛选类别：`command` / `power` / `file` / `auth` / `server` / `backup` / `schedule` / `user` |
  | `status` | string | `success` / `failed` |
  | `userId` | number | 按操作用户筛选 |
  | `serverId` | number | 按实例筛选 |
  | `search` | string | 全文关键词搜索（动作、详情、用户邮箱、用户姓名、实例名称/标识、错误信息） |
  | `dateFrom` | string | ISO 日期，如 `2026-09-01` |
  | `dateTo` | string | ISO 日期 |
- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": [
      {
        "id": 42,
        "userId": 1,
        "userEmail": "admin@pidan.local",
        "userFullName": "Admin",
        "mcServerId": 3,
        "serverName": "生存一服",
        "serverIdentifier": "survival-1",
        "category": "command",
        "action": "command.dispatch",
        "details": { "command": "say Hello World" },
        "status": "success",
        "errorMessage": null,
        "ipAddress": "127.0.0.1",
        "createdAt": "2026-09-07T10:00:00.000Z"
      }
    ],
    "metadata": {
      "total": 1,
      "perPage": 20,
      "currentPage": 1,
      "lastPage": 1
    }
  }
  ```

### 15.2 查询单实例审计日志（管理员或已授权用户）

- **URL**: `GET /servers/:id/audit-logs`
- **鉴权**: `Bearer <token>`（需拥有对应实例访问权）
- **查询参数**: 同 15.1（`serverId` 自动限定为路由中的 `:id`）
- **权限**:
  - 管理员：可查看该实例全部日志
  - 普通用户：仅可查看自己被授权的实例日志，不可越权访问其他实例
  - **任何角色不可通过 API 删除或修改审计日志**

---

## 16. Minecraft 历史日志归档与流式解压 (Log Archives)

访问服务器 `data/<identifier>/logs/` 目录下的 `.log` 和 `.log.gz` 日志文件，支持在线流式解压分页与关键词搜索，以及直接下载原始归档包。

> **鉴权**: 所有以下接口均需 `Bearer <token>`，且操作者须对该实例有访问权。

### 16.1 列出归档文件列表

- **URL**: `GET /servers/:id/logs/archives`
- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": [
      { "fileName": "latest.log", "sizeBytes": 12340, "modifiedAt": "2026-09-07T10:00:00.000Z", "isCompressed": false },
      { "fileName": "2026-09-06-1.log.gz", "sizeBytes": 5120, "modifiedAt": "2026-09-06T23:59:00.000Z", "isCompressed": true }
    ]
  }
  ```
  - `latest.log` 始终排列在最前面，其余按修改时间从新到旧排序。
  - 仅列出 `.log` 和 `.log.gz` 文件，其他文件忽略。

### 16.2 在线流式读取/搜索日志（支持分页与关键词）

- **URL**: `GET /servers/:id/logs/archives/:filename`
- **查询参数（均可选）**:
  | 参数 | 类型 | 说明 |
  | --- | --- | --- |
  | `page` | number | 页码，默认 1 |
  | `perPage` | number | 每页行数，默认 200，最大 1000 |
  | `search` | string | 关键词过滤（大小写不敏感） |
  | `tail` | boolean | `true` 时返回最后 `perPage` 行（类似 `tail -n`） |
- **安全限制**:
  - 单次最多扫描 50,000 行（防止解压炸弹）
  - 只允许 `.log` 和 `.log.gz` 后缀，路径穿越尝试返回 `400`
- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": {
      "fileName": "2026-09-06-1.log.gz",
      "totalMatchedLines": 4,
      "lines": [
        "[08:00:00] [Server thread/INFO]: Booting server",
        "[08:00:01] [Server thread/ERROR]: Failed to load"
      ],
      "page": 1,
      "perPage": 200,
      "hasMore": false
    }
  }
  ```

### 16.3 下载原始归档文件

- **URL**: `GET /servers/:id/logs/archives/:filename/download`
- **响应**: 原始文件二进制流
  - `.log.gz` 文件 → `Content-Type: application/gzip`
  - `.log` 文件 → `Content-Type: text/plain`
  - 响应头携带 `Content-Disposition: attachment; filename="<filename>"`

---

## 17. 统一错误响应规范

当接口返回 `4xx` 或 `5xx` 时，统一返回格式如下：

```json
{
  "errors": [
    {
      "message": "The email field must be defined",
      "rule": "required",
      "field": "email"
    }
  ]
}
```

前端统一封装示例 (Axios / Fetch 拦截器)：

```typescript
// 提取第一条错误信息的通用工具函数
export function getErrorMessage(error: any): string {
  const errResponse = error.response?.data
  if (errResponse?.errors && Array.isArray(errResponse.errors) && errResponse.errors.length > 0) {
    return errResponse.errors[0].message
  }
  return error.message || '网络请求发生错误，请稍后重试'
}
```
