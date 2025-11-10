# MOSS Agent Runtime

## Overview

This directory contains the new Agent Runtime implementation designed to replace LangGraph. It provides:

- ✅ Full API compatibility with existing Run interface
- ✅ Lightweight state graph engine
- ✅ Event-driven architecture
- ✅ Multi-process execution support
- ✅ Extensible node system

## Architecture

```
runtime/
├── index.ts              # Main AgentRuntime class
├── types.ts              # Type definitions
├── StateGraphEngine.ts   # Core state graph execution
├── ExecutionGraph.ts      # API compatibility wrapper
├── EventHandlerRegistry.ts # Event system
├── nodes.ts              # Graph node implementations
├── LLMClientAdapter.ts   # LLM client adapter
├── multiprocess.ts       # Multi-process support
└── README.md            # This file
```

## Usage

### Basic Usage

```typescript
import { AgentRuntime } from './runtime';

const runtime = await AgentRuntime.create({
  runId: 'unique-id',
  graphConfig: {
    signal: abortController.signal,
    llmConfig: {
      provider: Providers.OPENAI,
      model: 'gpt-4',
      streaming: true,
    },
    tools: agentTools,
    instructions: agent.instructions,
  },
  customHandlers: {
    [GraphEvents.TOOL_END]: handler,
  },
});

await runtime.processStream(
  { messages },
  config,
  options
);
```

### Enabling in Production

Set the environment variable:

```bash
MOSS_AGENT_RUNTIME=true
```

Or modify `packages/api/src/agents/run.ts` to use `AgentRuntime` by default.

## Multi-Process Support

The runtime supports execution in separate processes/threads:

```typescript
import { MultiProcessRuntime } from './runtime/multiprocess';

const mpRuntime = new MultiProcessRuntime({
  enabled: true,
  workerType: 'process', // or 'thread'
  maxWorkers: 4,
});

const result = await mpRuntime.execute(
  config,
  execConfig,
  options,
  inputs
);
```

## TODO

- [ ] Complete LLM client integration
- [ ] Implement streaming support
- [ ] Add comprehensive tests
- [ ] Performance optimization
- [ ] Documentation

