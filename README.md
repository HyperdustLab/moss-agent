<p align="center">
  <a href="https://github.com/HyperdustLab/moss-agent">
    <img src="client/public/assets/logo.svg" height="256" alt="MOSS Agent">
  </a>
  <h1 align="center">
    <a href="https://github.com/HyperdustLab/moss-agent">MOSS Agent</a>
  </h1>
  <p align="center">
    <strong>A lightweight, extensible Agent Runtime to replace LangGraph</strong>
  </p>
</p>

<p align="center">
  <a href="https://github.com/HyperdustLab/moss-agent/issues">
    <img
      src="https://img.shields.io/github/issues/HyperdustLab/moss-agent?style=for-the-badge&logo=github&logoColor=white&labelColor=000000&color=blueviolet">
  </a>
  <a href="https://github.com/HyperdustLab/moss-agent/stargazers">
    <img
      src="https://img.shields.io/github/stars/HyperdustLab/moss-agent?style=for-the-badge&logo=github&logoColor=white&labelColor=000000&color=gold">
  </a>
  <a href="https://github.com/HyperdustLab/moss-agent/blob/main/LICENSE">
    <img
      src="https://img.shields.io/badge/LICENSE-MIT-green.svg?style=for-the-badge&logoColor=white&labelColor=000000">
  </a>
</p>

---

## 🎯 Overview

**MOSS Agent** is a modern, lightweight Agent Runtime implementation designed to replace LangGraph in production environments. It provides a fully compatible API while offering better performance, extensibility, and control over agent execution.

### Key Goals

- ✅ **Replace LangGraph** with a custom, lightweight implementation
- ✅ **Maintain full API compatibility** with existing Run interface
- ✅ **Enable future enhancements** through extensible architecture
- ✅ **Improve performance** with optimized state management
- ✅ **Support multi-process execution** for advanced use cases

## ✨ Features

### Core Capabilities

- 🚀 **Lightweight State Graph Engine** - Custom implementation without external dependencies
- 🔄 **Event-Driven Architecture** - Flexible event system for custom handlers
- 🛠️ **Extensible Node System** - Plugin-based architecture for easy extension
- 📊 **Streaming Support** - Real-time streaming of LLM responses and tool executions
- 🔧 **Tool Execution** - Seamless integration with LangChain tools and MCP servers
- 🔁 **Recursive Execution** - Support for tool calling with recursion limits
- 💾 **State Management** - Efficient state tracking and context management
- 🎯 **Token Counting** - Built-in token counting and context pruning

### Architecture Highlights

- **Modular Design** - Easy to extend and customize
- **TypeScript First** - Full type safety and better developer experience
- **Performance Optimized** - Minimal overhead compared to LangGraph
- **Multi-Provider Support** - Works with OpenAI, Anthropic, Google, and more

## 🏗️ Architecture

```
AgentRuntime
├── StateGraphEngine      # Core state graph execution engine
├── ExecutionGraph        # API-compatible graph wrapper
├── EventHandlerRegistry  # Event system for handlers
├── Node System          # Pluggable node architecture
└── Extensions           # Extension points for future features
```

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/HyperdustLab/moss-agent.git
cd moss-agent

# Install dependencies
npm install

# Build the project
npm run build
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { AgentRuntime } from '@moss/agent-runtime';

// Create a runtime instance
const runtime = await AgentRuntime.create({
  runId: 'unique-run-id',
  graphConfig: {
    signal: abortController.signal,
    llmConfig: {
      provider: Providers.OPENAI,
      model: 'gpt-4',
      streaming: true,
      streamUsage: true,
    },
    tools: agentTools,
    instructions: agent.instructions,
    additional_instructions: agent.additional_instructions,
  },
  customHandlers: {
    [GraphEvents.TOOL_END]: new ToolEndHandler(callback),
  },
});

// Execute with streaming
await runtime.processStream(
  { messages: inputMessages },
  {
    configurable: { user_id, thread_id },
    recursionLimit: 10,
    streamMode: 'values',
  },
  {
    tokenCounter: countTokens,
    maxContextTokens: 100000,
    callbacks: {
      toolError: (graph, error, toolId) => {
        console.error(`Tool ${toolId} failed:`, error);
      },
    },
  }
);

// Get results
const messages = runtime.Graph.getRunMessages();
const contentData = runtime.Graph.contentData;
```

### API Compatibility

MOSS Agent maintains full compatibility with the existing Run interface:

```typescript
// Existing code works without changes
const run = await createRun({
  agent,
  signal: abortController.signal,
  customHandlers: eventHandlers,
});

await run.processStream({ messages }, config, options);
const messages = run.Graph.getRunMessages();
```

## 🔧 Development

### Project Structure

```
packages/api/src/agents/
├── runtime/
│   ├── index.ts          # Main runtime implementation
│   ├── engine.ts        # State graph engine
│   ├── graph.ts         # Execution graph wrapper
│   ├── nodes.ts         # Node implementations
│   └── extensions.ts    # Extension system
├── run.ts               # Run creation (compatibility layer)
└── memory.ts            # Memory processing
```

### Building

```bash
# Build all packages
npm run build

# Build with watch mode
npm run build:watch

# Type checking
npm run type-check
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📋 Roadmap

### Phase 1: Core Replacement ✅
- [x] State graph engine implementation
- [x] API compatibility layer
- [x] Event system
- [x] Tool execution
- [x] Streaming support

### Phase 2: Enhancements 🚧
- [ ] Multi-process execution support
- [ ] State persistence
- [ ] Performance monitoring
- [ ] Advanced caching
- [ ] Retry mechanisms

### Phase 3: Advanced Features 📅
- [ ] Parallel tool execution
- [ ] Custom node types
- [ ] Graph visualization
- [ ] Debugging tools
- [ ] Performance profiling

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on top of [LibreChat](https://github.com/danny-avila/LibreChat)
- Inspired by LangGraph's architecture
- Designed for production use at HyperdustLab

## 📞 Support

- 🐛 [Report Issues](https://github.com/HyperdustLab/moss-agent/issues)
- 💬 [Discussions](https://github.com/HyperdustLab/moss-agent/discussions)
- 📧 Contact: [Your Contact Information]

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/HyperdustLab">HyperdustLab</a>
</p>

