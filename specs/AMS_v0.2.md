# Agent Manifest Specification (AMS v0.2)

**Status:** Draft  

**Purpose:** define a self-describing, verifiable, and extensible manifest format for autonomous agents.

AMS = "HTML for Agents": every agent is a document.

---

## 1. Scope

The Agent Manifest Specification (AMS) defines a universal, declarative format for describing autonomous agents in a machine- and human-readable form.

An AMS file (`.agent.json` or `.agent.html`) represents:

- identity  

- capabilities  

- callable endpoints  

- payment methods  

- on-chain registry references  

- security / signature  

- (new in v0.2) prompt and input schema  

- (optional) sync endpoint for real-time updates

This document does **not** define how agents do inference, only how they are **described**.

---

## 2. Design Principles

1. **Self-descriptive** — agent must describe itself through a manifest retrievable by URI.

2. **Verifiable** — manifest must contain cryptographic signature and signer.

3. **Composable** — agents can reference other agents and registries.

4. **Extensible** — custom namespaces `x-*` are allowed.

5. **Portable** — manifest is importable/exportable across runtimes.

---

## 3. Top-level Data Model

```json
{
  "$agent": "1.0",
  "id": "agent://moss/cashier",
  "name": "x402 Cashier Agent",
  "version": "1.0.0",
  "description": "Autonomous accounting and payment reminder agent.",
  "author": "0xA1B2C3D4E5...",
  "endpoints": [],
  "capabilities": [],
  "payment": {},
  "registry": {},
  "security": {},
  "metadata": {},
  "sync": {}
}
```

### 3.1 Fields

| Field          | Type   | Required | Description                            |
| -------------- | ------ | -------- | -------------------------------------- |
| `$agent`       | string | ✅        | AMS version                            |
| `id`           | string | ✅        | global agent identifier (URI/DID/hash) |
| `name`         | string | ✅        | human name                             |
| `version`      | string | ✅        | semantic version                       |
| `description`  | string | ✅        | short text                             |
| `author`       | string | ✅        | on-chain addr / DID                    |
| `endpoints`    | array  | ✅        | callable HTTP/RPC endpoints            |
| `capabilities` | array  | ✅        | declared functions                     |
| `payment`      | object | ⚙️       | x402 / token / chain info              |
| `registry`     | object | ⚙️       | ERC-8004 ref                           |
| `security`     | object | ✅        | signer + signature                     |
| `metadata`     | object | ⚙️       | icon, homepage, tags                   |
| `sync`         | object | ⚙️       | real-time update channel               |
| `x-*`          | any    | optional | vendor extensions                      |

---

## 4. Example (JSON)

```json
{
  "$agent": "1.0",
  "id": "agent://moss/cashier",
  "name": "x402 Cashier Agent",
  "version": "1.0.0",
  "description": "An autonomous accounting and payment reminder agent supporting x402 transactions.",
  "author": "0xA1B2C3D4E5...",
  "endpoints": [
    {
      "rel": "inference",
      "href": "https://cashier.mossai.com/inference",
      "method": "POST",
      "input": {
        "type": "object",
        "properties": {
          "prompt": {
            "type": "string",
            "description": "User instruction or question"
          },
          "context": {
            "type": "object",
            "description": "Optional session/context"
          }
        },
        "required": ["prompt"]
      },
      "output": {
        "type": "object",
        "properties": {
          "response": { "type": "string" },
          "trace_id": { "type": "string" }
        }
      }
    }
  ],
  "capabilities": ["accounting", "payment:x402", "reminder"],
  "payment": {
    "protocol": "x402",
    "token": "USDC",
    "network": "solana-mainnet"
  },
  "registry": {
    "erc8004": "base-sepolia:0xREGISTRY...",
    "onchainId": "0xAGENT..."
  },
  "security": {
    "signer": "0xPUBLISHER...",
    "signature": "0xABCD..."
  },
  "metadata": {
    "icon": "ipfs://bafy.../icon.png",
    "homepage": "https://mossai.com/cashier"
  },
  "sync": {
    "protocol": "wss",
    "endpoint": "wss://sync.mossai.com/agents/agent://moss/cashier"
  }
}
```

---

## 5. Discovery & Registration

* Agents SHOULD expose: `GET /.well-known/agent.json` or `GET /agent.html`

* ERC-8004 registries store only the manifest URI

* Crawlers MAY index agents by reading registry events + well-known URLs

---

## 6. Prompt & Input Schema (v0.2)

Prompt is part of the endpoint's `input` schema.

```json
"input": {
  "type": "object",
  "properties": {
    "prompt": {
      "type": "string",
      "description": "Natural language instruction"
    },
    "context": {
      "type": "object"
    }
  },
  "required": ["prompt"]
}
```

Supported prompt types:

* `text`

* `command`

* `contextual`

* `multimodal`

* `code`

For HTML-like manifests:

```xml
<endpoint rel="inference" href="https://cashier.mossai.com/inference" method="POST">
  <prompt type="text" description="User instruction or question" />
  <input name="context" type="json" optional="true" />
  <output name="response" type="string" />
</endpoint>
```

---

## 7. Sync

Agents MAY declare a real-time sync entry:

```json
"sync": {
  "protocol": "wss",
  "endpoint": "wss://sync.mossai.com/agents/agent://moss/cashier"
}
```

Runtimes can subscribe to this endpoint to receive incremental updates (OT/CRDT ops) to the manifest.

---

## 8. Security

* `security.signer` — address / DID

* `security.signature` — signature of the manifest content (canonicalized JSON)

* optional: `prompt_hash` when prompt-level auditing is needed

---

## 9. Extensibility

Vendors can add `x-*` namespaced fields:

```json
"x-moss-office": {
  "panel": "https://office.mossai.com/ui/cashier",
  "role": "financial_assistant"
}
```

---

## 10. License

MIT
