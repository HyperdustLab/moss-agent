# Agent Sync Service

This component provides **real-time collaboration** for AMS-compliant agents.

- accepts OT/CRDT-like ops

- checks `edit_policy` of target agent

- broadcasts accepted ops to all subscribers via WebSocket

- writes audit log (optional on-chain anchoring)

## Endpoints

- `GET /agents/{id}` — get latest manifest (fully merged)

- `GET /agents/{id}/history` — get op history

- `WS /agents/{id}/sync` — subscribe + push ops
