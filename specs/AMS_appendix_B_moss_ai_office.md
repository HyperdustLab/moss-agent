# Appendix B: MOSS AI Office — Agent-as-Document Collaboration Model

## 1. Core Abstraction: Document → Agent Entity

In Google Workspace, everything is a "document" (doc/sheet/slide), and collaboration means multiple people editing the same document simultaneously.

In **MOSS AI Office**, we transform this abstraction: **everything is an Agent entity**, and collaboration means "multiple humans + multiple agents simultaneously editing/driving this Agent."

**Key insight:** Agent = Content + Execution Unit

Unlike static documents, agents are both:
- **Resources** (content that can be viewed, exported, versioned)
- **Execution units** (can be invoked, can create/edit other agents)

---

## 2. Agent Types (Content Templates)

Agents in MOSS AI Office are categorized by their primary content type and capabilities:

### 2.1 DocAgent

**Capabilities:**
- Long-form text generation
- Markdown formatting
- Image-text mixed content
- Knowledge base citation
- Multi-version tracking

**Use Cases:**
- Product requirements documents (PRD)
- Meeting minutes
- Weekly reports
- Proposals and white papers
- Technical documentation

**Manifest Example:**
```json
{
  "$agent": "1.0",
  "id": "agent://moss/doc-20251110-001",
  "name": "Product Launch Plan",
  "type": "doc",
  "capabilities": ["doc.write", "doc.format", "doc.cite"],
  "x-moss-office": {
    "content_type": "doc",
    "template": "product-plan"
  }
}
```

### 2.2 SheetAgent

**Capabilities:**
- Tabular data modeling
- Formula calculation
- Real-time data refresh
- External data fetching
- Structured export (CSV, JSON)

**Use Cases:**
- KPI dashboards
- Financial summaries
- User lists
- Operational reports
- Data aggregation

**Manifest Example:**
```json
{
  "$agent": "1.0",
  "id": "agent://moss/sheet-20251110-002",
  "name": "KPI Dashboard",
  "type": "sheet",
  "capabilities": ["sheet.calculate", "sheet.fetch", "sheet.export"],
  "x-moss-office": {
    "content_type": "sheet",
    "data_sources": ["api://analytics.mossai.com/kpi"]
  }
}
```

### 2.3 SlideAgent

**Capabilities:**
- Structured outline → visual pages
- Layout and design
- Multi-format export (PDF, PPTX, HTML)
- Template-based generation

**Use Cases:**
- Pitch decks
- Product introductions
- Project presentations
- Status updates

**Manifest Example:**
```json
{
  "$agent": "1.0",
  "id": "agent://moss/slide-20251110-003",
  "name": "Q4 Roadmap Presentation",
  "type": "slide",
  "capabilities": ["slide.render", "slide.export"],
  "x-moss-office": {
    "content_type": "slide",
    "template": "roadmap"
  }
}
```

### 2.4 WorkerAgent

**Capabilities:**
- Create other agents (`agent.create`)
- Edit other agents (`agent.edit`)
- Scheduled task execution
- Batch generation
- Event-driven automation

**Use Cases:**
- Daily report generation (creates DocAgent at 9 AM)
- Auto-update SlideAgent when SheetAgent data changes
- Create personalized DocAgent for new users
- Batch document processing

**Manifest Example:**
```json
{
  "$agent": "1.0",
  "id": "agent://moss/worker-20251110-004",
  "name": "Daily Report Generator",
  "type": "worker",
  "capabilities": ["agent.create", "agent.edit", "agent.clone", "scheduler"],
  "x-moss-office": {
    "content_type": "worker",
    "rules": [
      {
        "trigger": "0 9 * * *",
        "action": "create",
        "target_type": "doc",
        "template": "daily-report"
      },
      {
        "trigger": "event:sheet.updated",
        "action": "edit",
        "target_type": "slide",
        "target_id": "agent://moss/slide-20251110-003"
      }
    ]
  }
}
```

---

## 3. Collaboration Space: MOSS AI Office

### 3.1 Structure

```
Organization / Space
  └── Office (workspace)
      ├── Agents (doc/sheet/slide/worker)
      ├── Channels / Threads (MOSS Chat)
      └── Call Sessions (MOSS CALL)
```

**Office** is the primary collaboration unit:
- Contains a collection of agents
- Has associated chat channels
- Has associated call sessions
- Maintains permission model

### 3.2 Office Resource Model

```json
{
  "office_id": "moss-office-001",
  "name": "Product Team Workspace",
  "organization": "moss-org-001",
  "agents": [
    {
      "id": "agent://moss/doc-20251110-001",
      "type": "doc",
      "title": "Product Launch Plan",
      "permissions": {
        "view": ["user:alan", "agent:worker-20251110-004"],
        "comment": ["user:alan", "user:bob"],
        "edit": ["user:alan"],
        "operate": ["user:alan", "agent:worker-20251110-004"],
        "spawn": []
      },
      "state": {
        "content": "...",
        "version": "1.2.0"
      }
    },
    {
      "id": "agent://moss/sheet-20251110-002",
      "type": "sheet",
      "title": "KPI Dashboard",
      "permissions": {
        "view": ["user:alan", "user:bob"],
        "operate": ["user:alan", "agent:worker-20251110-004"]
      },
      "state": {
        "cells": []
      }
    },
    {
      "id": "agent://moss/worker-20251110-004",
      "type": "worker",
      "title": "Daily Report Generator",
      "permissions": {
        "operate": ["user:alan"],
        "spawn": ["agent:worker-20251110-004"]
      },
      "rules": [
        {
          "trigger": "0 9 * * *",
          "action": "create",
          "target_type": "doc",
          "template": "daily-report"
        }
      ]
    }
  ],
  "chat": {
    "channel_id": "chat-20251110-001",
    "participants": [
      "human:alan",
      "agent:doc-20251110-001",
      "agent:sheet-20251110-002",
      "agent:worker-20251110-004"
    ]
  },
  "calls": []
}
```

---

## 4. Permission Model

Extended from Google Docs' view/comment/edit to include agent-specific operations:

### 4.1 Permission Levels

| Permission | Description | Example |
|------------|-------------|---------|
| `view` | Read-only access to agent state/content | View DocAgent content, read SheetAgent data |
| `comment` | Can leave annotations (for humans or AI) | Add comments to DocAgent sections |
| `edit` | Can modify agent configuration/prompts/content | Update DocAgent content, change SheetAgent formulas |
| `operate` | Can invoke agent, use as tool, or have agent edit others | Call DocAgent to generate text, trigger WorkerAgent |
| `spawn` | Can create new agent instances | WorkerAgent creates new DocAgent |

### 4.2 Permission Expression in Manifest

```json
{
  "permissions": {
    "view": ["user:alan", "agent:worker-001"],
    "comment": ["user:alan", "user:bob"],
    "edit": ["user:alan"],
    "operate": ["user:alan", "agent:worker-001"],
    "spawn": ["agent:worker-001"]
  }
}
```

### 4.3 Default Behavior

- If `permissions` absent → only `security.signer` has full access
- `spawn` is typically only granted to WorkerAgents
- `operate` allows agents to be used as tools in MOSS Chat

---

## 5. WorkerAgent Operation Model

### 5.1 Trigger Types

1. **Scheduled (Cron)**
   ```json
   {
     "trigger": "0 9 * * *",
     "action": "create",
     "target_type": "doc"
   }
   ```

2. **Event-driven**
   ```json
   {
     "trigger": "event:sheet.updated",
     "source": "agent://moss/sheet-20251110-002",
     "action": "edit",
     "target_type": "slide"
   }
   ```

3. **Human instruction (via MOSS Chat)**
   ```json
   {
     "trigger": "chat:mention",
     "action": "create",
     "target_type": "doc"
   }
   ```

### 5.2 Operation Flow

1. **Trigger fires** → WorkerAgent receives event
2. **Load template** → Fetch target agent template
3. **Instantiate** → Create new agent or edit existing
4. **Notify** → Post result to MOSS Chat or update Office

**Example:**
```
Human: "@worker 明天开会的slide也准备一下，用刚才那份doc"

WorkerAgent:
  1. Receives mention in MOSS Chat
  2. Fetches referenced DocAgent content
  3. Creates new SlideAgent from template
  4. Populates SlideAgent with DocAgent content
  5. Posts SlideAgent link back to chat
```

---

## 6. MOSS Chat: Unified Agent Operation Bus

MOSS Chat is not a simple IM, but a **unified operation bus + collaboration interface**.

### 6.1 Architecture

- **Multi-participant**: Humans + Agents in same conversation
- **Agent mentions**: `@DocAgent`, `@SheetAgent`, `@WorkerAgent`
- **Operation routing**: Chat messages trigger agent operations
- **Context binding**: Chat is bound to current Office

### 6.2 Message Format

```json
{
  "message_id": "msg-001",
  "channel_id": "chat-20251110-001",
  "sender": "human:alan",
  "content": "@worker 明天开会的slide也准备一下，用刚才那份doc",
  "mentions": [
    {
      "type": "agent",
      "id": "agent://moss/worker-20251110-004"
    }
  ],
  "context": {
    "office_id": "moss-office-001",
    "referenced_agents": ["agent://moss/doc-20251110-001"]
  },
  "ts": 1731231231
}
```

### 6.3 Agent Response Format

```json
{
  "message_id": "msg-002",
  "channel_id": "chat-20251110-001",
  "sender": "agent:worker-20251110-004",
  "content": "已创建 SlideAgent: agent://moss/slide-20251110-005",
  "actions": [
    {
      "type": "agent.created",
      "agent_id": "agent://moss/slide-20251110-005",
      "link": "https://office.mossai.com/agents/slide-20251110-005"
    }
  ],
  "ts": 1731231232
}
```

### 6.4 Capabilities

- **Agent invocation**: `@DocAgent write a summary of Q4`
- **Agent chaining**: `@worker use @DocAgent to create @SlideAgent`
- **Context sharing**: Agents can reference previous messages
- **Operation feedback**: Agents post results back to chat

---

## 7. MOSS CALL: Real-time Multimodal Collaboration

MOSS CALL extends MOSS Chat to real-time audio/video with agent participation.

### 7.1 Session Model

```json
{
  "call_id": "call-20251110-001",
  "office_id": "moss-office-001",
  "participants": [
    "human:alan",
    "human:bob",
    "agent:doc-20251110-001",
    "agent:slide-20251110-003"
  ],
  "focus_agent": "agent://moss/slide-20251110-003",
  "state": {
    "audio": true,
    "video": true,
    "screen_share": "agent://moss/slide-20251110-003"
  }
}
```

### 7.2 Features

1. **Real-time transcription**: Human speech → text → routed to focus agent
2. **Agent screen sharing**: Agents can "present" their content (doc/sheet/slide state)
3. **Background operations**: WorkerAgents continue creating/editing, results appear in sidebar
4. **Context binding**: Call session inherits Office context

### 7.3 Operation Flow

```
Human (voice): "Update the slide with today's metrics"

System:
  1. Transcribes speech → text
  2. Routes to focus agent (SlideAgent)
  3. SlideAgent fetches data from SheetAgent
  4. SlideAgent updates content
  5. Updates displayed slide in CALL
  6. WorkerAgent (background) creates backup DocAgent
```

### 7.4 Integration with MOSS Chat

- CALL sessions have associated chat thread
- Chat messages appear in CALL sidebar
- Agent operations in CALL are logged to chat
- CALL can be converted to chat transcript

---

## 8. Key Differences from Google Docs

| Aspect | Google Docs | MOSS AI Office |
|--------|-------------|----------------|
| **Core Unit** | Document (static) | Agent (content + execution) |
| **Collaboration** | Human ↔ Human | Human + Agent ↔ Agent |
| **Content Creation** | Human-authored | Agent-created + Human-edited |
| **Automation** | Manual workflows | WorkerAgents create/edit agents |
| **Interaction** | Edit document | Operate agent, agent operates other agents |
| **Export** | File formats | Agent manifests (JSON/HTML) |

**One-liner:** Google = "humans collaborate on content"; MOSS = "humans + agents collaborate on agents (= content + execution)"

---

## 9. Import/Export

Agents can be exported as AMS manifests and imported into other Offices or repositories.

### 9.1 Export Format

```json
{
  "office_id": "moss-office-001",
  "exported_at": "2025-11-10T09:00:00Z",
  "agents": [
    {
      "$agent": "1.0",
      "id": "agent://moss/doc-20251110-001",
      "type": "doc",
      "name": "Product Launch Plan",
      "state": { "content": "..." },
      "permissions": { ... },
      "x-moss-office": { ... }
    }
  ]
}
```

### 9.2 Import Process

1. Validate manifest against AMS schema
2. Check permissions (spawn required for WorkerAgents)
3. Create agents in target Office
4. Preserve relationships (references to other agents)

---

## 10. License

MIT

