# Agent Manifest Specification (AMS)

This repository defines the **Agent Manifest Specification (AMS)** — a descriptive, verifiable, and extensible format for autonomous agents in the *Agent Web*.

AMS tries to play for agents the role that **HTML** played for the early web: give everyone a **common, self-describing document** so agents can be **discovered, indexed, rendered, and called** across runtimes.

## Contents

- [`specs/AMS_v0.2.md`](./specs/AMS_v0.2.md) — core spec (identity, endpoints, payment, prompt, sync)

- [`specs/AMS_appendix_A_agent_to_agent_authoring.md`](./specs/AMS_appendix_A_agent_to_agent_authoring.md) — how agents can create/edit other agents (Google Docs–style, but for agents)

- [`specs/AMS_appendix_B_moss_ai_office.md`](./specs/AMS_appendix_B_moss_ai_office.md) — MOSS AI Office collaboration model (Agent-as-Document, MOSS Chat, MOSS CALL)

- [`specs/MOSS_AI_Office_Design.md`](./specs/MOSS_AI_Office_Design.md) — MOSS AI Office 概要设计文档（技术栈、架构、接口设计）

- [`specs/schema/agent.schema.json`](./specs/schema/agent.schema.json) — JSON Schema for validation

- [`examples/`](./examples) — ready-to-use manifest examples (DocAgent, SheetAgent, SlideAgent, WorkerAgent)

- [`sync-service/`](./sync-service) — reference for real-time collaboration service

## Related standards

- ERC-8004 — agent registry on EVM chains

- x402 — billing / settlement layer (e.g. Base Sepolia → Solana USDC)

- AMS — this repo (descriptive layer)

## License

MIT
