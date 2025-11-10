# MOSS AI Office 概要设计文档

**版本**: 0.1  
**日期**: 2025-11-10  
**状态**: Draft

---

## 1. 概述

### 1.1 项目背景

MOSS AI Office 是基于 Agent Manifest Specification (AMS) 的协作平台，将 Google Workspace 的"文档协作"抽象升级为"Agent 协作"。

### 1.2 核心设计原则：一切资源 = 智能体

**全局原则**：平台只有一个一等公民——**Agent**。

- **文档不是文件**，是"会产出文档的智能体"（DocAgent）
- **表格不是文件**，是"会维护表格状态的智能体"（SheetAgent）
- **幻灯不是文件**，是"会生成多页展示的智能体"（SlideAgent）
- **Worker 不是特例**，只是"能操作别的智能体的智能体"（WorkerAgent）

**核心优势**：
- **平台心智最干净**：只有"智能体"这个概念，无双轨制
- **自动化最好做**：WorkerAgent 不用管文件格式，只认统一 API
- **协作最一致**：Chat/Call/Office 看到的都是 Agent
- **扩展性最强**：未来 3D 场景、UE、前端组件都可以是 Agent（`agent_type: scene`）

### 1.3 设计目标

- **统一抽象**：所有资源都是 Agent，只是 `agent_type` 和 `capabilities` 不同
- **统一接口**：所有 Agent 使用相同的操作接口（`GET /agents/{id}`, `POST /agents/{id}/act`）
- **实时协作**：多人多 Agent 同时编辑/驱动 Agent 实体
- **事件驱动**：通过 hooks 机制实现自动化，无需轮询
- **统一交互**：MOSS Chat（对话总线）+ MOSS CALL（实时音视频）
- **细粒度权限**：支持 human 和 agent 两种权限主体

### 1.4 技术原则

- **CRDT 优先**：无冲突实时协作
- **统一抽象**：一切资源 = Agent Object
- **事件驱动**：Agent 通过 hooks 自动触发操作
- **API 优先**：所有功能通过统一 REST/WebSocket 暴露

---

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Office UI    │  │ MOSS Chat    │  │ MOSS CALL    │        │
│  │ (Agent 列表) │  │ (对话界面)   │  │ (音视频)      │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│         │                  │                  │               │
│         └──────────────────┼──────────────────┘               │
│                            │                                  │
│                    WebSocket + HTTP                            │
└────────────────────────────┼──────────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                      API Gateway                               │
│  - 路由、认证、限流、负载均衡                                   │
└────────────────────────────┬──────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│  Office Service│  │  Sync Service   │  │ Agent Runtime   │
│  - Office 管理  │  │  - CRDT Ops     │  │  - LLM 调用     │
│  - 权限管理     │  │  - WebSocket    │  │  - Agent 执行   │
│  - Agent 元数据 │  │  - 冲突解决     │  │  - 流式响应     │
└────────────────┘  └────────────────┘  └────────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                   数据层                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ PostgreSQL   │  │ Redis        │  │ 对象存储      │        │
│  │ - 元数据     │  │ - 缓存       │  │ - 文件       │        │
│  │ - 权限       │  │ - 会话       │  │ - 媒体       │        │
│  │ - 审计日志   │  │ - 任务队列   │  │              │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 核心服务

#### 2.2.1 Office Service
- **职责**：Office/Agent 生命周期管理、权限控制
- **技术栈**：Node.js + Express / Go + Gin
- **接口**：REST API

#### 2.2.2 Sync Service
- **职责**：实时协作同步、CRDT 操作处理
- **技术栈**：Node.js + Yjs Server
- **接口**：WebSocket + REST

#### 2.2.3 Agent Runtime
- **职责**：Agent 执行、LLM 调用、流式响应
- **技术栈**：Python + FastAPI + LangChain
- **接口**：REST API + SSE

#### 2.2.4 Chat Service
- **职责**：MOSS Chat 消息路由、Agent 调用编排
- **技术栈**：Node.js + Socket.io
- **接口**：WebSocket + REST

#### 2.2.5 Call Service
- **职责**：MOSS CALL 音视频、实时转录
- **技术栈**：Node.js + mediasoup + Whisper
- **接口**：WebSocket + WebRTC

---

## 3. 数据模型

### 3.1 Office 模型

```typescript
interface Office {
  office_id: string;
  name: string;
  organization_id: string;
  created_at: timestamp;
  updated_at: timestamp;
  agents: Agent[];
  chat_channels: ChatChannel[];
  call_sessions: CallSession[];
}
```

### 3.2 Agent 模型（统一结构）

所有 Agent 都遵循相同的结构，只是 `agent_type`、`state` 结构、`capabilities` 不同：

```typescript
interface Agent {
  id: string;                    // agent-20251110-001
  name: string;                   // "Project Intro Doc"
  agent_type: 'doc' | 'sheet' | 'slide' | 'worker';
  office_id: string;
  
  // 能力声明
  capabilities: string[];         // ["render", "edit", "chatable", "spawn", ...]
  
  // 状态（CRDT，类型相关）
  state: AgentState;              // 不同类型结构不同，见下方
  
  // 权限（统一格式）
  permissions: {
    human: Record<string, string[]>;  // "human:alan": ["view", "edit"]
    agent: Record<string, string[]>;  // "agent:worker-001": ["read", "edit", "invoke", "spawn_child"]
  };
  
  // 事件钩子（自动化）
  hooks: Hook[];
  
  // 元数据
  metadata: {
    created_at: timestamp;
    updated_at: timestamp;
    version: string;
    manifest?: AMSManifest;       // 完整 AMS manifest（可选）
  };
}
```

### 3.3 权限模型（Human + Agent 双主体）

```typescript
interface Permissions {
  human: Record<string, string[]>;  // "human:alan": ["view", "comment", "edit"]
  agent: Record<string, string[]>;  // "agent:worker-001": ["view", "edit", "invoke", "spawn_child"]
}

// 权限操作类型
type PermissionAction = 
  | 'view'        // 查看状态
  | 'comment'     // 添加批注
  | 'edit'        // 修改 state
  | 'invoke'      // 调用 agent 能力
  | 'spawn_child' // 创建子 agent（仅 WorkerAgent）
```

### 3.4 Agent State 结构（按类型）

不同类型 Agent 的 `state` 结构不同，但都存储在 CRDT（Yjs）中：

```typescript
// DocAgent
interface DocAgentState {
  blocks: Y.Array<Block>;  // Yjs Array
  // Block: { type: "h1" | "p" | "code", text: string, ... }
}

// SheetAgent
interface SheetAgentState {
  sheets: Y.Array<Sheet>;  // Yjs Array
  // Sheet: { name: string, cells: Y.Map<Y.Map>, formulas: Y.Map<string> }
}

// SlideAgent
interface SlideAgentState {
  slides: Y.Array<Slide>;  // Yjs Array
  // Slide: { title: string, content: Y.Map, layout: string }
}

// WorkerAgent（通常 state 为空或存储配置）
interface WorkerAgentState {
  rules: Y.Array<Rule>;  // 任务规则
  // Rule: { trigger: string, action: string, target: string }
}
```

### 3.5 Hooks 机制（事件驱动）

```typescript
interface Hook {
  on: string;              // 事件类型: "state.updated" | "created" | "deleted" | ...
  call: string;            // 目标 agent_id
  with: Record<string, any>; // 传递的参数
  condition?: string;      // 可选条件表达式
}

// 示例
{
  "on": "state.updated",
  "call": "agent-worker-001",
  "with": { "target": "self", "event": "doc.updated" }
}
```

---

## 4. 核心功能设计

### 4.1 实时协作（Sync Service）

#### 4.1.1 CRDT 选择
- **Yjs**：成熟、性能好、支持多种数据类型
- **数据结构映射**：
  - DocAgent → Y.Text
  - SheetAgent → Y.Map<Y.Map>
  - SlideAgent → Y.Array<Y.Map>

#### 4.1.2 同步流程
```
1. Client 连接 WebSocket
2. 订阅 Agent: ws://sync/agents/{agent_id}
3. 发送本地操作 (Yjs update)
4. Server 验证权限
5. Server 应用操作到 Yjs document
6. Server 广播更新给所有订阅者
7. Client 应用远程更新
```

#### 4.1.3 权限检查
- 操作前检查 `permissions.edit` 或 `permissions.operate`
- WorkerAgent 操作检查 `permissions.spawn`

### 4.2 统一操作接口（核心）

所有 Agent 使用**统一的操作接口**，WorkerAgent 不需要区分"文件还是智能体"：

#### 4.2.1 统一接口规范

```
GET  /api/v1/agents/{id}           # 读取 Agent（包含 state）
POST /api/v1/agents/{id}/act        # 让 Agent 执行操作
```

#### 4.2.2 `/act` 接口规范

```typescript
// 请求
POST /api/v1/agents/{id}/act
{
  "action": string;        // 操作类型: "update_content" | "render" | "spawn" | ...
  "params": Record<string, any>;  // 操作参数
  "caller": string;        // 调用者: "human:alan" | "agent:worker-001"
}

// 响应
{
  "result": any;           // 操作结果
  "state_updated": boolean; // state 是否更新
  "hooks_triggered": string[]; // 触发的 hooks
}
```

#### 4.2.3 WorkerAgent 操作示例

WorkerAgent 要修改 DocAgent，只需：

```json
POST /api/v1/agents/doc-123/act
{
  "action": "update_content",
  "params": { "append": "今天的进度是..." },
  "caller": "agent-worker-001"
}
```

不需要判断"这是文件还是智能体"，统一走 `/act` 接口。

#### 4.2.4 各类型 Agent 的 action

```typescript
// DocAgent
actions: ["update_content", "render", "summarize", "export"]

// SheetAgent
actions: ["update_cell", "calc", "query", "render", "export"]

// SlideAgent
actions: ["add_slide", "update_slide", "render", "export"]

// WorkerAgent
actions: ["spawn", "edit_other", "route", "schedule"]
```

### 4.3 事件驱动自动化（Hooks）

#### 4.3.1 Hooks 触发流程

```
1. Agent state 更新
2. 检查该 Agent 的 hooks
3. 匹配 hook.on 事件类型
4. 验证 hook.call 目标 Agent 的权限
5. 调用目标 Agent: POST /agents/{hook.call}/act
6. 传递 hook.with 参数
```

#### 4.3.2 示例：自动更新 SlideAgent

```json
// SheetAgent 的 hooks
{
  "on": "state.updated",
  "call": "agent-slide-003",
  "with": {
    "action": "update_slide",
    "params": { "source": "self", "slide_index": 1 }
  }
}
```

当 SheetAgent 数据更新时，自动触发 SlideAgent 更新。

#### 4.3.3 WorkerAgent 的定时任务

WorkerAgent 的 state 中可以存储规则：

```json
{
  "rules": [
    {
      "trigger": "0 9 * * *",  // Cron
      "action": "spawn",
      "target_type": "doc",
      "template": "daily-report"
    }
  ]
}
```

系统定时检查 WorkerAgent 的 rules，触发相应操作。

### 4.4 MOSS Chat（统一 Agent 调用）

#### 4.4.1 消息模型
```typescript
interface ChatMessage {
  message_id: string;
  channel_id: string;
  sender: string;           // "human:alan" | "agent:doc-123"
  content: string;
  mentions: Mention[];      // @agent-xxx
  context: {
    office_id: string;
    referenced_agents: string[];
  };
  ts: number;
}
```

#### 4.4.2 Agent 调用流程（统一接口）

```
1. 用户发送: "@doc-123 summarize"
2. Chat Service 解析 mentions → agent-123
3. 调用统一接口: POST /api/v1/agents/doc-123/act
   {
     "action": "summarize",
     "params": {},
     "caller": "human:alan"
   }
4. DocAgent 执行，返回结果
5. DocAgent 回复消息到 Chat（通过 Chat Service）
6. 更新 UI
```

#### 4.4.3 Agent 链式调用

```
用户: "@worker-001 use @doc-123 to create @slide-456"

→ Chat Service 解析，调用 WorkerAgent
→ POST /api/v1/agents/worker-001/act
   {
     "action": "route",
     "params": {
       "steps": [
         { "agent": "doc-123", "action": "render" },
         { "agent": "slide-456", "action": "create_from", "source": "doc-123" }
       ]
     },
     "caller": "human:alan"
   }
→ WorkerAgent 依次调用各 Agent
→ WorkerAgent 回复结果到 Chat
```

**关键**：Chat 不需要理解各种文件格式，只需要会调用统一的 `/act` 接口。

### 4.5 MOSS CALL（Agent 渲染嵌入）

#### 4.5.1 WebRTC 架构
- **SFU 模式**：mediasoup（多人通话）
- **信令**：WebSocket
- **媒体流**：WebRTC peer connections

#### 4.5.2 Agent 内容嵌入

CALL 中共享的"文档/表格/幻灯"实际上是**调用对应 Agent 的 `render` action**：

```
1. 用户选择共享 agent-slide-003
2. Call Service 调用: POST /api/v1/agents/slide-003/act
   {
     "action": "render",
     "params": { "format": "canvas" },
     "caller": "human:alan"
   }
3. SlideAgent 返回渲染结果（Canvas/Video）
4. 通过 WebRTC 共享给参与者
```

**关键**：CALL 不需要理解各种文件格式，只需要会调用 Agent 的 `render` action。

#### 4.5.3 实时转录 + Agent 更新

```
1. 客户端音频 → WebRTC → Call Service
2. Call Service → Whisper API / Deepgram
3. 转录文本 → 路由到 focus_agent
4. 调用 focus_agent: POST /api/v1/agents/{focus_agent}/act
   {
     "action": "update_from_voice",
     "params": { "text": "转录文本" },
     "caller": "human:alan"
   }
5. Agent 更新 state
6. 触发 hooks（如有）
7. 内容更新 → 推送到 CALL UI
```

---

## 5. 技术栈选型

### 5.1 前端

| 组件 | 技术选型 | 说明 |
|------|---------|------|
| 框架 | Next.js 14+ | SSR、路由、API Routes |
| 状态管理 | Zustand | 轻量、TypeScript 友好 |
| UI 组件 | shadcn/ui | 可定制组件库 |
| 富文本 | Tiptap | ProseMirror 封装，CRDT 友好 |
| 表格 | AG Grid | 企业级表格组件 |
| 演示 | reveal.js | 或自定义 React 组件 |
| WebSocket | Socket.io-client | 实时通信 |
| WebRTC | simple-peer / mediasoup-client | 音视频 |

### 5.2 后端

| 服务 | 技术选型 | 说明 |
|------|---------|------|
| API Gateway | Nginx / Kong | 路由、限流、SSL |
| Office Service | Node.js + Express | 或 Go + Gin |
| Sync Service | Node.js + Yjs | CRDT 同步 |
| Agent Runtime | Python + FastAPI | LLM 集成方便 |
| Chat Service | Node.js + Socket.io | 实时消息 |
| Call Service | Node.js + mediasoup | WebRTC SFU |

### 5.3 数据存储

| 类型 | 技术选型 | 用途 |
|------|---------|------|
| 关系数据库 | PostgreSQL 15+ | Agent 元数据、权限、审计 |
| 缓存 | Redis 7+ | 会话、实时状态、任务队列 |
| 对象存储 | MinIO / S3 | 文件、媒体、导出 |
| 向量数据库 | Qdrant / Pinecone | Chat 上下文检索（可选） |

### 5.4 Agent 技术

| 组件 | 技术选型 | 说明 |
|------|---------|------|
| Agent 框架 | LangChain / LlamaIndex | Agent 编排 |
| LLM API | OpenAI / Anthropic | 或本地模型 |
| 任务调度 | BullMQ (Node.js) / Celery (Python) | WorkerAgent |

### 5.5 基础设施

| 组件 | 技术选型 | 说明 |
|------|---------|------|
| 容器化 | Docker | 服务打包 |
| 编排 | Kubernetes | 生产环境 |
| 监控 | Prometheus + Grafana | 指标监控 |
| 日志 | ELK / Loki | 日志聚合 |
| CI/CD | GitHub Actions | 自动化部署 |

---

## 6. 接口设计（统一 Agent API）

### 6.1 统一 Agent API（核心）

所有 Agent 操作都通过统一接口：

```
GET    /api/v1/agents/{id}                # 读取 Agent（包含 state、permissions、hooks）
POST   /api/v1/agents/{id}/act             # 执行操作（统一入口）
WS     /api/v1/agents/{id}/sync            # WebSocket 订阅 state 变更
GET    /api/v1/agents/{id}/history          # 操作历史
```

### 6.2 `/act` 接口详细规范

```typescript
// 请求
POST /api/v1/agents/{id}/act
Headers: {
  "Authorization": "Bearer <token>",
  "X-Caller": "human:alan" | "agent:worker-001"
}
Body: {
  "action": string;              // 操作类型
  "params": Record<string, any>;  // 操作参数
}

// 响应
{
  "result": any;                  // 操作结果
  "state_updated": boolean;       // state 是否更新
  "hooks_triggered": string[];    // 触发的 hooks（agent_id 列表）
  "permission_checked": boolean;  // 权限检查结果
}
```

### 6.3 Office Service API

```
GET    /api/v1/offices                    # 列表
POST   /api/v1/offices                    # 创建
GET    /api/v1/offices/{id}               # 详情
PUT    /api/v1/offices/{id}                # 更新
DELETE /api/v1/offices/{id}                # 删除

GET    /api/v1/offices/{id}/agents        # Agent 列表（过滤、搜索）
POST   /api/v1/offices/{id}/agents        # 创建 Agent（需要 spawn 权限）
```

### 6.4 Chat Service API

```
WS     /api/v1/chat/channels/{id}          # WebSocket 连接
POST   /api/v1/chat/channels/{id}/messages # 发送消息
GET    /api/v1/chat/channels/{id}/messages # 历史消息

# Chat 内部会调用 Agent API
# 用户 @agent-123 → POST /api/v1/agents/agent-123/act
```

### 6.5 Call Service API

```
POST   /api/v1/calls                      # 创建通话
WS     /api/v1/calls/{id}/signaling       # WebRTC 信令
POST   /api/v1/calls/{id}/focus           # 设置 focus_agent
POST   /api/v1/calls/{id}/transcribe      # 转录配置

# Call 内部会调用 Agent API
# 共享 agent-123 → POST /api/v1/agents/agent-123/act { "action": "render" }
```

---

## 7. 安全设计

### 7.1 认证授权
- **JWT Token**：用户认证
- **RBAC**：基于角色的权限控制
- **Agent 身份**：Agent 也有身份，可参与权限检查

### 7.2 数据安全
- **传输加密**：HTTPS / WSS
- **存储加密**：敏感数据加密存储
- **审计日志**：所有操作记录

### 7.3 权限验证
- **中间件**：统一权限检查
- **Agent 权限**：支持 Agent 作为权限主体
- **操作级权限**：view/comment/edit/operate/spawn

---

## 8. 性能设计

### 8.1 缓存策略
- **Agent 元数据**：Redis 缓存，TTL 5 分钟
- **权限信息**：Redis 缓存，变更时失效
- **CRDT State**：内存 + Redis，定期持久化

### 8.2 并发控制
- **WebSocket 连接**：单 Agent 最多 100 并发
- **Agent 执行**：限流，防止 LLM API 过载
- **数据库连接池**：PostgreSQL 连接池配置

### 8.3 扩展性
- **水平扩展**：服务无状态，支持多实例
- **数据库分片**：按 office_id 分片（未来）
- **CDN**：静态资源、媒体文件

---

## 9. 部署方案

### 9.1 开发环境
```
docker-compose up
- PostgreSQL
- Redis
- 各服务（Node.js/Python）
```

### 9.2 生产环境
```
Kubernetes
- 服务部署：Deployment + Service
- 数据库：StatefulSet
- 配置：ConfigMap + Secret
- 监控：Prometheus + Grafana
```

### 9.3 环境变量
```bash
# 数据库
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# LLM
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...

# 对象存储
S3_ENDPOINT=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

---

## 10. 目录结构（统一 Agent 抽象）

### 10.1 推荐目录结构

```
moss-ai-office/
├── apps/
│   ├── api/                    # 统一 Agent API 服务
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── agents.ts   # GET /agents/{id}, POST /agents/{id}/act
│   │   │   │   └── offices.ts
│   │   │   ├── services/
│   │   │   │   ├── agent-kernel.ts  # Agent 核心逻辑
│   │   │   │   ├── permission.ts   # 权限检查
│   │   │   │   └── hooks.ts        # Hooks 触发
│   │   │   └── middleware/
│   │   └── package.json
│   │
│   ├── chat/                   # MOSS Chat
│   │   └── src/
│   │       ├── routes/
│   │       ├── services/
│   │       │   └── agent-invoker.ts  # 调用 Agent API
│   │       └── package.json
│   │
│   ├── call/                   # MOSS CALL
│   │   └── src/
│   │       ├── webrtc/
│   │       ├── services/
│   │       │   └── agent-renderer.ts  # 调用 Agent render
│   │       └── package.json
│   │
│   └── frontend/               # Next.js 前端
│       └── src/
│           ├── components/
│           │   ├── AgentRenderer/    # 根据 agent_type 渲染
│           │   │   ├── DocAgent.tsx
│           │   │   ├── SheetAgent.tsx
│           │   │   └── SlideAgent.tsx
│           │   └── Office/
│           └── hooks/
│               └── useAgent.ts       # 统一 Agent API 调用
│
├── packages/
│   ├── agent-kernel/           # Agent 抽象、生命周期
│   │   └── src/
│   │       ├── Agent.ts        # Agent 基类
│   │       ├── StateManager.ts # CRDT state 管理
│   │       └── HookEngine.ts   # Hooks 引擎
│   │
│   ├── agent-types/            # 各类型 Agent 定义
│   │   └── src/
│   │       ├── DocAgent.ts
│   │       ├── SheetAgent.ts
│   │       ├── SlideAgent.ts
│   │       └── WorkerAgent.ts
│   │
│   ├── agent-api-client/       # Agent API 客户端（前端用）
│   │   └── src/
│   │       └── client.ts      # GET /agents/{id}, POST /agents/{id}/act
│   │
│   └── shared/                 # 共享类型、工具
│       └── src/
│           ├── types/
│           └── utils/
│
└── docker-compose.yml
```

### 10.2 开发计划

### Phase 1: MVP（2-3 个月）
- [ ] 统一 Agent API 服务（`apps/api`）
- [ ] Agent Kernel（`packages/agent-kernel`）
- [ ] DocAgent 类型实现（`packages/agent-types`）
- [ ] 权限系统（human + agent 双主体）
- [ ] Hooks 引擎
- [ ] 前端 AgentRenderer（DocAgent）
- [ ] MOSS Chat 基础版（调用统一 Agent API）

### Phase 2: 完整功能（3-4 个月）
- [ ] SheetAgent、SlideAgent 实现
- [ ] WorkerAgent + spawn/edit_other 能力
- [ ] 定时任务调度（Cron）
- [ ] MOSS Chat 完整版（Agent 链式调用）
- [ ] MOSS CALL 基础版（Agent render 嵌入）

### Phase 3: 优化与扩展（2-3 个月）
- [ ] MOSS CALL 完整版（实时转录、Agent 更新）
- [ ] 性能优化（Agent state 缓存、批量操作）
- [ ] 监控告警
- [ ] 扩展 Agent 类型（scene、component 等）

---

## 11. 风险与挑战

### 11.1 技术风险
- **CRDT 冲突**：复杂数据结构可能产生意外合并
- **LLM 延迟**：Agent 执行可能较慢，需要优化
- **WebRTC 兼容性**：不同浏览器支持差异

### 11.2 解决方案
- **测试覆盖**：CRDT 操作充分测试
- **异步处理**：Agent 执行异步化，提供进度反馈
- **降级方案**：WebRTC 不支持时降级到音频

---

## 12. 参考资料

- [Agent Manifest Specification v0.2](./AMS_v0.2.md)
- [Appendix A: Agent-to-Agent Authoring](./AMS_appendix_A_agent_to_agent_authoring.md)
- [Appendix B: MOSS AI Office](./AMS_appendix_B_moss_ai_office.md)
- [Yjs Documentation](https://docs.yjs.dev/)
- [LangChain Documentation](https://python.langchain.com/)

---

## 附录

### A. 术语表
- **Office**：协作空间，包含多个 Agent
- **Agent**：平台唯一一等公民，一切资源都是 Agent
- **Agent Type**：Agent 类型（doc/sheet/slide/worker），决定 state 结构和 capabilities
- **Capabilities**：Agent 能力声明（render/edit/spawn 等）
- **Hooks**：事件驱动机制，Agent state 更新时自动触发其他 Agent
- **统一接口**：所有 Agent 使用相同的 `/act` 接口，WorkerAgent 无需区分文件格式
- **CRDT**：无冲突复制数据类型
- **SFU**：Selective Forwarding Unit（WebRTC 架构）

### C. 统一抽象的优势

1. **平台心智最干净**：只有"智能体"这个概念，无双轨制
2. **自动化最好做**：WorkerAgent 不用管文件格式，只认统一 API
3. **协作最一致**：Chat/Call/Office 看到的都是 Agent
4. **扩展性最强**：未来 3D 场景、UE、前端组件都可以是 Agent
5. **权限一刀切**：human 和 agent 两种主体，统一权限模型
6. **事件驱动原生**：hooks 机制，无需应用层轮询

### B. 数据流图
（待补充）

---

**文档状态**: Draft  
**最后更新**: 2025-11-10

