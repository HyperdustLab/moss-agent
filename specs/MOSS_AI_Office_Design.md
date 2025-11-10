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
actions: ["spawn", "edit_other", "route", "schedule", "dispatch"]
```

### 4.3 WorkerAgent 二级分类体系

#### 4.3.1 问题背景

**核心问题**：LLM 可能说任务"完成"了，但外部世界还没动。需要区分：
- **内部操作**：操作 DocAgent、SheetAgent、SlideAgent（即时完成）
- **外部操作**：调用 Twitter、GitHub、Notion API（需要鉴权、重试、异步）

**解决方案**：WorkerAgent 作为"大脑和调度中心"，外部技能 Agent（ExtSkillAgent）作为"手和工具"。

#### 4.3.2 WorkerAgent 二级分类

```typescript
interface WorkerAgent {
  id: string;
  type: "worker";
  category: "internal" | "external" | "toolset";
  skills?: string[];        // 仅 external/toolset 有
  auth_profiles?: Record<string, AuthProfile>; // 仅 external 有
}

// 1. Internal Worker - 操作内部智能体
{
  "id": "worker-internal-001",
  "type": "worker",
  "category": "internal",
  "capabilities": ["spawn", "edit_other", "route"],
  "description": "生成日报、更新KPI、把doc转成slide"
}

// 2. External Skill Worker (ExtSkillAgent) - 操作外部世界
{
  "id": "worker-twitter-001",
  "type": "worker",
  "category": "external",
  "skills": ["twitter.post", "twitter.reply", "twitter.fetch"],
  "auth_profiles": {
    "marketing": { "token": "...", "oauth_refresh": "..." },
    "founder": { "token": "...", "oauth_refresh": "..." }
  },
  "description": "发推、回推、拉评论"
}

// 3. Toolset Worker (ToolboxAgent) - 封装工具集
{
  "id": "worker-toolbox-001",
  "type": "worker",
  "category": "toolset",
  "skills": ["crawler", "translate", "image_gen", "video_synth"],
  "description": "爬虫、翻译、图像生成、合成视频"
}
```

#### 4.3.3 执行流程（外部任务示例）

**场景**：用户在 MOSS Chat 中说"@worker 帮我用官方号发一条：MOSS AI Office 上线了"

```
1. 用户发送消息
   → Chat Service 解析 mentions → worker-internal-001

2. WorkerAgent 解析任务
   → 任务类型: social.post
   → 目标平台: twitter
   → 内容: "MOSS AI Office 上线了"
   → Profile: marketing（从上下文推断或用户指定）

3. WorkerAgent 查找外部技能 Agent
   → 查询技能注册表: skills["twitter.post"] → worker-twitter-001

4. WorkerAgent 分发任务
   → POST /api/v1/agents/worker-twitter-001/act
   {
     "action": "dispatch",
     "params": {
       "task_id": "task-20251110-0001",
       "skill": "twitter.post",
       "payload": {
         "text": "MOSS AI Office 上线了",
         "profile": "marketing"
       },
       "callback_chat": "chat-xxx"
     },
     "caller": "agent:worker-internal-001"
   }

5. ExtSkillAgent 执行外部操作
   → 调用 Twitter API（带鉴权、重试逻辑）
   → 返回结果: { "tweet_id": "...", "url": "https://x.com/..." }

6. ExtSkillAgent 回调 WorkerAgent
   → POST /api/v1/agents/worker-internal-001/act
   {
     "action": "task_callback",
     "params": {
       "task_id": "task-20251110-0001",
       "status": "success",
       "result": { "tweet_id": "...", "url": "..." }
     }
   }

7. WorkerAgent 更新 Chat
   → 通过 Event Bus 发送任务更新事件到 Chat
   → 前端渲染: "✅ TwitterAgent 已完成任务: [推文链接]"
```

#### 4.3.4 任务状态回流机制

**统一事件格式**：

```typescript
interface TaskUpdateEvent {
  type: "task.update";
  task_id: string;
  status: "pending" | "running" | "success" | "failed";
  agent: string;              // 执行任务的 agent_id
  progress?: number;         // 0-100
  result?: any;              // 成功时的结果
  error?: string;            // 失败时的错误信息
  timestamp: number;
}

// 前端渲染示例
{
  "type": "task.update",
  "task_id": "task-20251110-0001",
  "status": "success",
  "agent": "worker-twitter-001",
  "result": {
    "tweet_id": "1234567890",
    "url": "https://x.com/mossai/status/1234567890"
  },
  "timestamp": 1731231231
}
```

前端在 Chat 中渲染为：
- **Pending**: "⏳ TwitterAgent 正在处理任务..."
- **Running**: "🔄 TwitterAgent 正在发布推文... (60%)"
- **Success**: "✅ TwitterAgent 已完成: [推文链接]"
- **Failed**: "❌ TwitterAgent 失败: 认证过期，请重新授权"

#### 4.3.5 外部技能 Agent 接口规范

**统一接口**：

```typescript
// ExtSkillAgent 必须实现的 action
interface ExtSkillAgentActions {
  // 接收任务
  "dispatch": {
    params: {
      task_id: string;
      skill: string;           // "twitter.post" | "github.create_issue" | ...
      payload: Record<string, any>;
      callback_chat?: string;   // 可选：直接回调到 Chat
      callback_agent?: string;   // 可选：回调到 WorkerAgent
    };
    returns: {
      task_id: string;
      status: "accepted" | "rejected";
      estimated_time?: number;   // 预计完成时间（秒）
    };
  };
  
  // 查询任务状态
  "task_status": {
    params: { task_id: string };
    returns: TaskUpdateEvent;
  };
  
  // 取消任务
  "task_cancel": {
    params: { task_id: string };
    returns: { cancelled: boolean };
  };
}
```

**技能注册表**：

```typescript
// 系统维护的技能注册表
interface SkillRegistry {
  "twitter.post": {
    agent_id: "worker-twitter-001",
    required_auth: ["oauth2"],
    required_params: ["text", "profile"]
  };
  "github.create_issue": {
    agent_id: "worker-github-001",
    required_auth: ["token"],
    required_params: ["repo", "title", "body"]
  };
  "notion.create_page": {
    agent_id: "worker-notion-001",
    required_auth: ["api_key"],
    required_params: ["database_id", "properties"]
  };
}
```

#### 4.3.6 安全与多账号支持

**Auth Profile 管理**：

```typescript
interface AuthProfile {
  profile_name: string;      // "marketing" | "founder" | "personal"
  auth_type: "oauth2" | "token" | "api_key";
  credentials: {
    token?: string;
    refresh_token?: string;
    api_key?: string;
    expires_at?: number;
  };
  permissions: string[];     // 该 profile 允许的操作
}

// WorkerAgent 下任务时指定 profile
{
  "action": "dispatch",
  "params": {
    "skill": "twitter.post",
    "payload": {
      "text": "...",
      "profile": "marketing"  // 必须指定，防止乱发
    }
  }
}
```

**权限检查**：

```javascript
// ExtSkillAgent 执行前检查
async function executeExternalTask(task) {
  // 1. 检查 profile 是否存在
  const profile = this.auth_profiles[task.payload.profile];
  if (!profile) {
    throw new Error(`Profile ${task.payload.profile} not found`);
  }
  
  // 2. 检查权限
  if (!profile.permissions.includes(task.skill)) {
    throw new Error(`Profile ${task.payload.profile} cannot ${task.skill}`);
  }
  
  // 3. 检查 token 是否过期（OAuth2）
  if (profile.auth_type === "oauth2" && profile.credentials.expires_at < Date.now()) {
    await this.refreshToken(profile);
  }
  
  // 4. 执行任务
  return await this.callExternalAPI(task, profile);
}
```

#### 4.3.7 目录结构建议

```
/agents
  /worker
    /internal/
      /daily-report-worker.js    # Internal Worker
      /kpi-update-worker.js
    /external/
      /twitter-agent.js          # ExtSkillAgent
      /github-agent.js
      /notion-agent.js
      /discord-agent.js
    /toolbox/
      /browser-agent.js          # ToolboxAgent
      /crawler-agent.js
      /translate-agent.js
```

#### 4.3.8 与 LibreChat 集成

**后端改造**：

```javascript
// WorkerAgent 收到任务后 dispatch
class WorkerAgent {
  async act(action, params, caller) {
    if (action === "dispatch") {
      // 查找外部技能 Agent
      const skillAgent = await this.findSkillAgent(params.skill);
      
      // 分发任务
      const task = await skillAgent.act("dispatch", {
        task_id: generateTaskId(),
        skill: params.skill,
        payload: params.payload,
        callback_chat: params.callback_chat
      }, `agent:${this.id}`);
      
      // 返回任务 ID，前端可以轮询或通过 WebSocket 接收更新
      return { task_id: task.task_id, status: "dispatched" };
    }
  }
}
```

**前端渲染**：

```jsx
// Chat 中渲染任务卡片
<TaskCard 
  taskId={task.task_id}
  agent={task.agent}
  status={task.status}
  progress={task.progress}
  result={task.result}
  onCancel={() => cancelTask(task.task_id)}
/>
```

### 4.4 事件驱动自动化（Hooks）

#### 4.4.1 Hooks 触发流程

```
1. Agent state 更新
2. 检查该 Agent 的 hooks
3. 匹配 hook.on 事件类型
4. 验证 hook.call 目标 Agent 的权限
5. 调用目标 Agent: POST /agents/{hook.call}/act
6. 传递 hook.with 参数
```

#### 4.4.2 示例：自动更新 SlideAgent

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

#### 4.4.3 WorkerAgent 的定时任务

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

### 4.5 MOSS Chat（统一 Agent 调用）

#### 4.5.1 消息模型
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

#### 4.5.2 Agent 调用流程（统一接口）

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

#### 4.5.3 Agent 链式调用

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

## 11. 快速实现路径：基于 LibreChat 改造

### 11.1 为什么选择 LibreChat

**LibreChat** 是一个开源的 ChatGPT 替代方案，基于 React + Node.js + Express，MIT 协议。选择它作为起点可以**大幅加速 MOSS AI Office 的原型开发**。

| 特性 | LibreChat 提供 | 对 MOSS 的价值 |
|------|---------------|---------------|
| ✅ 前端 UI | ChatGPT 式多会话界面，React + Tailwind | 直接改成三栏式 MOSS Chat（少量改动） |
| ✅ 后端 | Node.js + Express + WebSocket | 可扩展为多 Agent 消息总线 |
| ✅ 对话上下文 | 支持多轮、记忆 | 可改为智能体上下文存储（Agent Memory） |
| ✅ 插件/工具系统 | 已支持 OpenAI 插件与函数调用 | 可扩展为 WorkerAgent / MCP 工具系统 |
| ✅ 开源协议 | MIT | 可自由改造、二次分发 |
| ✅ 部署简便 | Docker + Local run | 快速验证多 Agent 协作原型 |

**总结**：LibreChat = ChatGPT 的可改版骨架，只需在它之上装上"智能体系统"和"Workspace 概念"。

### 11.2 架构映射

#### 原版 LibreChat 架构
```
Frontend (React)
    ↓
Backend (Node.js + Express)
    ↓
LLM Provider (OpenAI API)
```

#### 改造成 MOSS 架构
```
Frontend (MOSS Chat - 三栏布局)
    ↓
MOSS Server (Agent Runtime)
    ├── Chat Context → Agent Memory
    ├── Agent Registry (统一 Agent API)
    ├── Event Bus (WebSocket)
    ├── Worker Orchestrator (任务分配)
    └── Storage (Agent State / Workspace)
```

**关键变化**：Chat 不再直接打到 OpenAI API，而是通过 MOSS Server 分发给对应的智能体。

### 11.3 前端层改造重点

#### 11.3.1 改 UI 布局为「三栏」

**原本：**
```
Sidebar（会话） + ChatWindow
```

**改为：**
```
Sidebar（Spaces/Agents） + ChatWindow（消息流） + AgentPanel（右侧实时视图）
```

**具体实现：**
- 在 `Chat.jsx` 中增加右侧容器 `<AgentPanel />`
- 在 `Sidebar.jsx` 增加"Agents"、"Worker Center"、"Offices"分区
- 用 `useState(activeAgent)` 控制右侧展示哪个 Agent

#### 11.3.2 改消息结构

**原消息：**
```json
{
  "id": "...",
  "role": "assistant",
  "content": "text..."
}
```

**新结构：**
```json
{
  "id": "...",
  "type": "event" | "text" | "agent_ref" | "task_update",
  "agent_id": "worker-001",
  "content": "WorkerAgent 创建了 DocAgent: WeeklyReport",
  "metadata": {
    "agent_state": {...},
    "hooks_triggered": [...]
  }
}
```

前端在 `<Message />` 组件里判断类型，渲染不同卡片（文本消息、Agent 事件、任务进度等）。

#### 11.3.3 增加右侧 Agent 视图

新建 `AgentPanel.jsx`：
```jsx
<Tabs>
  <Tab label="Live">
    <DocAgentView data={agentState} />
  </Tab>
  <Tab label="History">
    <AgentHistoryView data={agentEvents} />
  </Tab>
</Tabs>
```

Agent 状态通过 WebSocket 从服务器推送过来。

#### 11.3.4 输入框改造

替换 `<InputBox />` 为智能输入框：
```jsx
<SmartInput
  onSubmit={handleSend}
  onCreateAgent={handleCreateAgent}
  onMentionAgent={handleMentionAgent}
  onAttachFile={handleAttachFile}
/>
```

加上 `@` 自动补全智能体（agent name），`+` 打开创建弹窗。

#### 11.3.5 任务流渲染

WorkerAgent 输出可用独立组件：
```jsx
<TaskCard 
  status="running" 
  progress={60}
  agentId="worker-001"
  steps={[...]}
/>
```

自动出现在聊天流中，连接后端任务状态。

### 11.4 后端层改造重点

#### 11.4.1 新增 Agent Registry

```javascript
// services/AgentRegistry.js
class AgentRegistry {
  constructor() {
    this.agents = new Map(); // 内存缓存
    this.db = new Database(); // PostgreSQL/MongoDB
  }
  
  async get(agentId) {
    // 从数据库加载 Agent
    const agent = await this.db.agents.findOne({ id: agentId });
    return {
      id: agent.id,
      type: agent.agent_type,
      state: agent.state,
      capabilities: agent.capabilities,
      permissions: agent.permissions,
      hooks: agent.hooks
    };
  }
  
  async act(agentId, action, params, caller) {
    // 1. 权限检查
    const agent = await this.get(agentId);
    if (!this.checkPermission(agent, caller, action)) {
      throw new Error('Permission denied');
    }
    
    // 2. 执行 action
    const result = await this.executeAction(agent, action, params);
    
    // 3. 触发 hooks
    const hooksTriggered = await this.triggerHooks(agent, action);
    
    // 4. 广播 state 更新
    this.eventBus.broadcast(`agent:${agentId}`, {
      state: agent.state,
      action,
      result
    });
    
    return { result, hooksTriggered };
  }
}
```

#### 11.4.2 改造消息路由

**原 LibreChat：**
```javascript
// 直接调用 OpenAI
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: conversationHistory
});
```

**改造为 MOSS：**
```javascript
// 路由到 Agent
app.post('/api/chat', async (req, res) => {
  const { message, agentId, officeId } = req.body;
  
  // 解析 mentions (@agent-xxx)
  const mentions = parseMentions(message);
  
  if (mentions.length > 0) {
    // 调用被 @ 的 Agent
    const agent = await agentRegistry.get(mentions[0]);
    const response = await agentRegistry.act(agent.id, 'chat', {
      message,
      context: { officeId }
    }, `human:${req.user.id}`);
    
    res.json(response);
  } else {
    // 默认路由到 Office 的默认 Agent
    const defaultAgent = await getDefaultAgent(officeId);
    const response = await agentRegistry.act(defaultAgent.id, 'chat', {
      message
    }, `human:${req.user.id}`);
    
    res.json(response);
  }
});
```

#### 11.4.3 新增 Event Bus（WebSocket）

```javascript
// services/EventBus.js
class EventBus {
  constructor(io) {
    this.io = io; // Socket.io instance
  }
  
  // 订阅 Agent state 变更
  subscribeAgent(agentId, socketId) {
    this.io.to(socketId).join(`agent:${agentId}`);
  }
  
  // 广播 Agent 更新
  broadcastAgentUpdate(agentId, data) {
    this.io.to(`agent:${agentId}`).emit('agent:update', data);
  }
  
  // 广播 Office 事件
  broadcastOfficeEvent(officeId, event) {
    this.io.to(`office:${officeId}`).emit('office:event', event);
  }
}
```

#### 11.4.4 任务调度中心（Worker Orchestrator）

```javascript
// services/WorkerOrchestrator.js
class WorkerOrchestrator {
  constructor(agentRegistry, queue) {
    this.agentRegistry = agentRegistry;
    this.queue = queue; // BullMQ
  }
  
  // 定时任务
  scheduleCron(workerAgentId, cron, action, params) {
    this.queue.add('worker:cron', {
      workerAgentId,
      action,
      params
    }, {
      repeat: { pattern: cron }
    });
  }
  
  // 事件触发
  onAgentEvent(agentId, event) {
    // 查找订阅该事件的 WorkerAgent
    const workers = this.findWorkersByHook(agentId, event);
    
    workers.forEach(worker => {
      this.queue.add('worker:event', {
        workerId: worker.id,
        triggerAgent: agentId,
        event
      });
    });
  }
}
```

### 11.5 技术栈建议

| 模块 | 技术选型 | 说明 |
|------|---------|------|
| **前端** | React + Zustand + Tailwind + Shadcn/ui | LibreChat 已有 React + Tailwind，只需添加状态管理 |
| **后端** | Node.js + Express + Socket.io | LibreChat 已有，只需扩展 |
| **Agent 通信** | 内部事件总线（Redis pub/sub 或本地事件） | 新增模块 |
| **长任务执行** | BullMQ / Agenda.js | 配合 WorkerAgent |
| **AI 调用** | LangChain / MCP-Adapter + OpenAI / Ollama | 替换原 LibreChat 的 OpenAI 直接调用 |
| **CRDT 同步** | Yjs | 新增，用于 Agent state 实时同步 |
| **数据存储** | MongoDB / PostgreSQL + Redis | LibreChat 已有数据库，扩展 schema |

### 11.6 开发路线（最短实现路径）

| 阶段 | 目标 | 时间 | 关键任务 |
|------|------|------|---------|
| **阶段 1** | 改 LibreChat UI → 三栏布局 + AgentPanel | 2~3 天 | 修改布局组件、添加 AgentPanel、改造 Sidebar |
| **阶段 2** | 增加 Agent Registry + WebSocket 实时更新 | 3~5 天 | 实现 AgentRegistry、改造消息路由、集成 WebSocket |
| **阶段 3** | 实现 WorkerAgent → 能自动生成/编辑文档 | 5~7 天 | WorkerOrchestrator、任务队列、spawn/edit 能力 |
| **阶段 4** | 增加 Workspace 结构 + 多 Agent 协作 | 1~2 周 | Office 模型、权限系统、Hooks 机制 |
| **阶段 5** | 接入 MOSS Call（WebRTC + 语音识别） | 后续阶段 | mediasoup、Whisper 集成 |

### 11.7 与统一 Agent API 的集成

LibreChat 改造后的架构完全兼容统一 Agent API：

```javascript
// 在 LibreChat 后端中实现统一 Agent API
app.get('/api/v1/agents/:id', async (req, res) => {
  const agent = await agentRegistry.get(req.params.id);
  res.json(agent);
});

app.post('/api/v1/agents/:id/act', async (req, res) => {
  const { action, params } = req.body;
  const caller = req.headers['x-caller'] || `human:${req.user.id}`;
  
  const result = await agentRegistry.act(
    req.params.id,
    action,
    params,
    caller
  );
  
  res.json(result);
});
```

这样 LibreChat 改造版就能无缝对接设计文档中定义的统一 Agent API。

### 11.8 优势与注意事项

**优势：**
- ✅ **快速启动**：2-3 天即可看到三栏布局原型
- ✅ **成熟基础**：LibreChat 已有完善的聊天界面和消息流
- ✅ **技术栈匹配**：React + Node.js，与设计文档一致
- ✅ **开源可改**：MIT 协议，可自由改造

**注意事项：**
- ⚠️ **CRDT 同步需新增**：LibreChat 没有实时协作，需要集成 Yjs
- ⚠️ **Agent 系统需从零实现**：核心的 Agent Registry、统一 API 需要新建
- ⚠️ **状态管理需重构**：从单会话上下文改为多 Agent 状态管理

### 11.9 结论

> 💬 **基于 LibreChat 改造是完全可行、而且是最快路径。**

- 前端：UI + 消息流改造（2-3 天）
- 后端：事件总线 + 智能体注册（3-5 天）
- ChatGPT → MOSS 的架构差距小，只要补上 **Agent 生命周期与任务调度**，LibreChat 就能演化为完整的 **MOSS Chat 原型**。

**推荐策略**：
1. **MVP 阶段**：使用 LibreChat 改造，快速验证核心概念
2. **生产阶段**：根据需求逐步重构，采用设计文档中的完整架构

---

## 12. 风险与挑战

### 12.1 技术风险
- **CRDT 冲突**：复杂数据结构可能产生意外合并
- **LLM 延迟**：Agent 执行可能较慢，需要优化
- **WebRTC 兼容性**：不同浏览器支持差异

### 12.2 解决方案
- **测试覆盖**：CRDT 操作充分测试
- **异步处理**：Agent 执行异步化，提供进度反馈
- **降级方案**：WebRTC 不支持时降级到音频

---

## 13. 参考资料

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

