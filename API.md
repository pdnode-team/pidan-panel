# Pidan Panel 后端 API 文档 (v1)

> **基础信息**
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
14. [统一错误响应规范](#14-统一错误响应规范)

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
  | 字段 | 类型 | 说明 |
  | --- | --- | --- |
  | `cpuPercent` | number | 宿主机 CPU 使用率百分比（如 `12.5` 表示 12.5%） |
  | `memoryPercent` | number | 系统内存使用率百分比（如 `45.2` 表示 45.2%） |
  | `usedMemoryBytes` | number | 已用系统内存（字节 Bytes） |
  | `totalMemoryBytes` | number | 系统总内存（字节 Bytes） |
  | `freeMemoryBytes` | number | 空闲系统内存（字节 Bytes） |
  | `nodeVersion` | string | Node.js 运行时版本（如 `"v20.12.2"`） |
  | `panelVersion` | string | 面板核心版本（如 `"1.0.0 (Adonis + Vue3)"`） |
  | `processUser` | string | 面板进程运行用户（如 `"root / administrator"`） |
  | `panelTime` | string | 服务器当前 ISO 时间戳 |
  | `loadAverage` | `[number, number, number]` | 系统负载均值（1分钟、5分钟、15分钟） |
  | `hostMachine` | string | 宿主机主机名（如 `"pidan-local-srv"`） |
  | `osEnvironment` | string | 操作系统与架构环境（如 `"Linux (x64)"` 或 `"Windows (x64)"`） |
  | `containerEngine` | string | 容器引擎状态与版本（如 `"Docker 28.4.0 Ready"`） |

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

---

## 2. 身份认证

### 2.1 首次管理员注册 (Signup)
当 `needsSetup === true` 时可用。创建第一个系统管理员后，该接口将永久关闭（禁止后续自行注册）。

- **URL**: `POST /auth/signup`
- **鉴权**: 无需 Token
- **请求体 (JSON)**:
  | 字段 | 类型 | 必填 | 说明 |
  | --- | --- | --- | --- |
  | `fullName` | string \| null | 否 | 管理员姓名/昵称 |
  | `email` | string | 是 | 邮箱地址，唯一 |
  | `password` | string | 是 | 密码，最少 8 位，最长 32 位 |
  | `passwordConfirmation` | string | 是 | 确认密码，必须与 password 完全一致 |

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
        "createdAt": "2026-09-06T00:00:00.000Z",
        "updatedAt": "2026-09-06T00:00:00.000Z"
      },
      "token": "oat_MQ.XXXXXXXXXXXXXX"
    }
  }
  ```
- **特殊错误**:
  - `HTTP 403`: `{"errors": [{"message": "Registration is closed. Administrator already exists."}]}`

### 2.2 用户登录 (Login)
- **URL**: `POST /auth/login`
- **鉴权**: 无需 Token
- **请求体 (JSON)**:
  | 字段 | 类型 | 必填 | 说明 |
  | --- | --- | --- | --- |
  | `email` | string | 是 | 登录邮箱 |
  | `password` | string | 是 | 登录密码 |

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
        "createdAt": "2026-09-06T00:00:00.000Z",
        "updatedAt": "2026-09-06T00:00:00.000Z"
      },
      "token": "oat_MQ.YYYYYYYYYYYYYY"
    }
  }
  ```

### 2.3 退出登录 (Logout)
注销当前 Token。

- **URL**: `POST /logout`
- **鉴权**: `Bearer <token>`
- **响应**: `HTTP 204 No Content`

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
- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": [
      {
        "type": "paper",
        "category": "server",
        "name": "Paper",
        "compatibility": ["plugins"]
      },
      {
        "type": "vanilla",
        "category": "server",
        "name": "Vanilla",
        "compatibility": []
      },
      {
        "type": "purpur",
        "category": "server",
        "name": "Purpur",
        "compatibility": ["plugins"]
      }
    ]
  }
  ```

### 4.2 获取指定类型的可用版本列表
- **URL**: `GET /mcjars/types/:type` (例如 `/mcjars/types/paper`)
- **鉴权**: `Bearer <token>`
- **响应示例 (HTTP 200)**:
  ```json
  {
    "data": [
      {
        "version": "1.21.4",
        "build": 123,
        "experimental": false,
        "releaseDate": "2025-01-10T12:00:00.000Z"
      },
      {
        "version": "1.20.4",
        "build": 498,
        "experimental": false,
        "releaseDate": "2024-04-01T10:00:00.000Z"
      }
    ]
  }
  ```

---

## 5. 服务器实例管理

### 5.1 获取服务器列表 (分页)
- **URL**: `GET /servers`
- **查询参数**:
  - `page`: 页码，默认 `1`
  - `limit`: 每页条数，默认 `20`
- **鉴权**: `Bearer <token>`
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
        "containerName": "pidan_mc_survival-1",
        "dataDirectory": "D:\\pidan-panel\\data\\servers\\survival-1",
        "runtime": {
          "status": "running", // 'running' | 'stopped' | 'restarting' | 'error'
          "containerId": "a1b2c3d4e5f6...",
          "memoryLimitMb": 4096,
          "serverPort": 25565
        },
        "createdAt": "2026-09-06T00:00:00.000Z",
        "updatedAt": "2026-09-06T00:00:00.000Z"
      }
    ],
    "meta": {
      "total": 1,
      "perPage": 20,
      "currentPage": 1,
      "lastPage": 1,
      "firstPage": 1,
      "firstPageUrl": "/?page=1",
      "lastPageUrl": "/?page=1",
      "nextPageUrl": null,
      "previousPageUrl": null
    }
  }
  ```

### 5.2 创建服务器实例
- **URL**: `POST /servers`
- **鉴权**: `Bearer <token>`
- **请求体 (JSON)**:
  | 字段 | 类型 | 必填 | 默认值 / 约束 | 说明 |
  | --- | --- | --- | --- | --- |
  | `name` | string | 是 | 1-100字符 | 显示名称，如 "我的MC服务器" |
  | `identifier` | string | 是 | 2-50字符，正则 `^[a-z0-9-]+$` | 唯一英文标识，决定容器名和存放目录 |
  | `serverJar` | string | 否 | `"server.jar"` | 运行的核心文件名 |
  | `dockerImage` | string | 否 | `"eclipse-temurin:21-jre-alpine"` | Java 运行环境镜像 |
  | `minMemoryMb` | number | 否 | `1024` (256~65536) | 最小内存 (-Xms) |
  | `maxMemoryMb` | number | 否 | `2048` (256~65536) | 最大内存 (-Xmx) |
  | `serverPort` | number | 是 | 1024~65535，全局唯一 | 游戏对外端口，映射容器 25565 |
  | `javaArgs` | string | 否 | 空 | 附加 JVM 启动参数 |

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
- **响应**: `HTTP 201 Created`，返回包含 `data` 的服务器完整详情及初始状态 `runtime.status: "stopped"`。

### 5.3 获取单个服务器详情
- **URL**: `GET /servers/:id`
- **鉴权**: `Bearer <token>`
- **响应**: `HTTP 200 OK`，包含该实例完整字段和 `runtime` 实时运行状态。

### 5.4 更新服务器配置
- **URL**: `PUT /servers/:id` 或 `PATCH /servers/:id`
- **鉴权**: `Bearer <token>`
- **请求体**: 所有字段均为可选，仅传递要修改的字段（`name`, `serverJar`, `dockerImage`, `minMemoryMb`, `maxMemoryMb`, `serverPort`, `javaArgs`）。
- **响应**: `HTTP 200 OK`，返回修改后的实例。

### 5.5 删除服务器
- **URL**: `DELETE /servers/:id`
- **查询参数 / 请求体 (可选)**:
  - `deleteFiles`: `boolean`，默认 `false`。
    - `false` (默认)：仅销毁 Docker 容器并删除数据库记录，**保留服务器数据目录（地图、存档、配置等）**。
    - `true`（如 `?deleteFiles=true` 或 `{ "deleteFiles": true }`）：在销毁容器和记录的同时，**彻底从磁盘抹除该实例的数据目录**。
  - 无论 `deleteFiles` 取值如何，该实例的**快照备份都会被丢弃**。若删除后仍需保留备份，请先下载。
- **鉴权**: `Bearer <token>`
- **前置条件**: 服务器必须处于停止状态。如果正在运行，将返回 `409 Conflict`。
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
  | 字段 | 类型 | 必填 | 说明 |
  | --- | --- | --- | --- |
  | `command` | string | 是 | 指令内容，1-1000字符。如 `"ban Steve"` 或 `"/ban Steve"` |

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
      "cpuPercent": 15.42,            // CPU 使用率 (%)
      "memoryUsageBytes": 1610612736, // 真实物理内存占用 (Bytes，已剔除系统 cache)
      "memoryLimitBytes": 4294967296, // 容器最大内存上限 (Bytes)
      "memoryPercent": 37.5,          // 内存占用百分比 (%)
      "networkRxBytes": 2048576,      // 累计网络下行接收字节数
      "networkTxBytes": 4096128       // 累计网络上行发送字节数
    }
  }
  ```
- **响应示例 (离线状态)**:
  ```json
  {
    "data": {
      "online": false,
      "cpuPercent": 0,
      "memoryUsageBytes": 0,
      "memoryLimitBytes": 4294967296,
      "memoryPercent": 0,
      "networkRxBytes": 0,
      "networkTxBytes": 0
    }
  }
  ```
  *(注：即使服务器离线也返回 HTTP 200 和安全零值，避免前端控制台报错标红)*

#### 模式二：SSE 实时流推流 (text/event-stream)
- **请求**: `GET /servers/:id/stats?stream=true`
- **数据帧格式 (每 1.5 秒推送一次)**:
  ```text
  data: {"online":true,"cpuPercent":12.5,"memoryUsageBytes":1572864000,"memoryLimitBytes":4294967296,"memoryPercent":36.62,"networkRxBytes":2100000,"networkTxBytes":4200000}
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
  | 字段 | 类型 | 必填 | 说明 |
  | --- | --- | --- | --- |
  | `type` | string | 选填 | 核心类型，如 `"paper"`, `"purpur"`, `"vanilla"` |
  | `version` | string | 选填 | 对应版本，如 `"1.21.4"` |
  | `url` | string | 选填 | 自定义直链下载 URL（与 type+version 二选一） |
  | `targetFileName`| string | 选填 | 保存的目标文件名，默认 `"server.jar"` |
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
  | 参数 | 类型 | 说明 |
  | --- | --- | --- |
  | `page` | number | 页码（默认 1） |
  | `perPage` | number | 每页数量（默认 20，上限 100） |
  | `search` | string | 搜索关键词（模糊匹配姓名或邮箱） |
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

### 12.2 创建新用户
- **URL**: `POST /users`
- **鉴权**: 需要 Token (`admin` 角色)
- **请求体 (JSON)**:
  | 字段 | 类型 | 必填 | 说明 |
  | --- | --- | --- | --- |
  | `email` | string | 是 | 用户登录邮箱（全局唯一） |
  | `password` | string | 是 | 初始密码（最少 8 位） |
  | `fullName` | string \| null | 否 | 用户称谓/真实姓名 |
  | `role` | string | 否 | 角色：`"admin"` 或 `"user"`（默认为 `"user"`） |
  | `serverIds` | `number[]` | 否 | 授权该用户可访问与操作的服务器实例 ID 列表（如 `[1, 2]`，多对多授权） |

### 12.3 获取单个用户详情
- **URL**: `GET /users/:id`
- **鉴权**: 需要 Token (`admin` 角色)

### 12.4 修改用户资料与实例授权
- **URL**: `PATCH /users/:id`
- **鉴权**: 需要 Token (`admin` 角色)
- **请求体 (JSON)**:
  | 字段 | 类型 | 必填 | 说明 |
  | --- | --- | --- | --- |
  | `email` | string | 否 | 修改邮箱 |
  | `password` | string | 否 | 重置密码（传入即更新，不传保持原密码） |
  | `fullName` | string \| null | 否 | 修改姓名 |
  | `role` | string | 否 | 修改角色（禁止将系统中最后一位管理员降级为普通用户） |
  | `serverIds` | `number[]` | 否 | 更新该用户的授权实例 ID 列表（如 `[1, 3]` 即覆盖更新为该列表） |

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
  | 字段 | 类型 | 说明 |
  | --- | --- | --- |
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

## 14. 统一错误响应规范

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
