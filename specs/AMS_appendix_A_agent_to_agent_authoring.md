# Appendix A: Agent-to-Agent Authoring (AMS v0.3 Draft)

## 1. Motivation

Unlike human-authored documents (e.g. Google Docs), agents in the Agent Web MUST be able to **create, edit, and version other agents** in a controlled and auditable manner.

This appendix defines:

- how an agent is allowed to edit another agent

- how to express edit policies in the manifest

- how to represent edit operations (ops)

- how to audit and (optionally) bill such edits

---

## 2. Edit Policy

An agent manifest MAY contain an `edit_policy` section:

```json
"edit_policy": {
  "owners": ["0xPUBLISHER...", "0xTEAMLEAD..."],
  "allowed_agents": [
    "agent://moss/agent-factory",
    "agent://moss/prompt-optimizer"
  ],
  "rules": [
    {
      "scope": "/prompt_templates",
      "by": "agent://moss/prompt-optimizer",
      "mode": "append-only"
    }
  ]
}
```

* `owners`: ultimate controllers of the manifest

* `allowed_agents`: other agents allowed to submit ops

* `rules`: fine-grained scope control

---

## 3. Operation Format

All updates to a manifest SHOULD be expressed as an operation:

```json
{
  "op_id": "uuid",
  "target_agent": "agent://moss/cashier",
  "actor": "agent://moss/prompt-optimizer",
  "ts": 1731231231,
  "sig": "0xSIGNATURE...",
  "patch": {
    "op": "add",
    "path": "/prompt_templates/1",
    "value": {
      "name": "urge_payment",
      "prompt": "Please remind user to complete x402 payment within 24h."
    }
  }
}
```

A sync service MUST:

1. verify `actor` is allowed by `edit_policy`

2. apply OT/CRDT to converge

3. broadcast to all subscribers

4. append to audit log

---

## 4. Agent Factory

A special agent MAY provide:

```json
{
  "id": "agent://moss/agent-factory",
  "capabilities": ["agent.create", "agent.clone", "agent.scaffold"],
  "endpoints": [
    {
      "rel": "generate-agent",
      "href": "https://factory.mossai.com/generate",
      "method": "POST"
    }
  ]
}
```

This allows **agent-created agents**.

---

## 5. Auditing and Billing

Each accepted op MAY be:

* recorded in an append-only log

* hashed and periodically anchored on-chain

* used as basis for x402 billing (edit = billable action)

---

## 6. Backward Compatibility

If `edit_policy` is absent → only `security.signer` is allowed to update.
