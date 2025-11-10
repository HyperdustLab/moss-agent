# 兼容性说明 (Compatibility Guide)

## 完全兼容 LangGraph 的 Run 接口

MOSS Agent Runtime 设计为完全兼容 `@librechat/agents` 中的 `Run` 接口，确保现有功能正常运行。

## 兼容性检查清单

### ✅ API 兼容性

- [x] `Run.create()` 静态方法 - 完全兼容
- [x] `run.processStream()` 方法 - 完全兼容
- [x] `run.Graph` 属性 - 所有属性都支持
- [x] `run.Graph.getRunMessages()` 方法 - 完全兼容
- [x] `run.Graph.resetValues()` 方法 - 完全兼容
- [x] `run.handlerRegistry` 属性 - 完全兼容
- [x] `run.graphRunnable` 属性 - 兼容（用于清理）

### ✅ 功能兼容性

- [x] 流式处理支持
- [x] 工具调用执行
- [x] 递归执行（recursionLimit）
- [x] 事件系统（所有 GraphEvents）
- [x] Token 计数和上下文管理
- [x] 消息历史管理
- [x] 错误处理和回调

### ✅ 使用场景兼容性

- [x] `createRun()` 函数（从 agent 创建）
- [x] `Run.create()` 直接调用（memory.ts）
- [x] Agent Chain 多智能体协作
- [x] 工具执行和错误处理
- [x] 流式输出和事件处理

## 启用方式

### 方式一：环境变量（推荐）

```bash
export MOSS_AGENT_RUNTIME=true
```

### 方式二：代码中直接使用

```typescript
import { AgentRuntime } from './runtime';

const runtime = await AgentRuntime.create({
  runId: 'xxx',
  graphConfig: { ... },
});
```

## 当前实现状态

### 已实现 ✅

1. **核心引擎**
   - StateGraphEngine - 状态图执行引擎
   - ExecutionGraph - API 兼容层
   - 节点系统（LLM, Tools, Done）

2. **事件系统**
   - EventHandlerRegistry - 事件处理器注册表
   - 支持所有 GraphEvents

3. **工具执行**
   - 工具调用和结果处理
   - 错误回调和处理

4. **多进程支持**
   - Worker threads
   - Child processes

### 待完善 🔧

1. **LLM 客户端集成**
   - 当前使用桥接方式（通过 @librechat/agents Run）
   - 未来需要直接集成 LLM 客户端

2. **流式处理优化**
   - 当前基础实现可用
   - 需要优化性能

3. **测试覆盖**
   - 需要添加完整测试套件

## 迁移建议

### 阶段一：测试验证（当前）

1. 设置 `MOSS_AGENT_RUNTIME=true`
2. 运行现有测试
3. 验证所有功能正常

### 阶段二：逐步替换

1. 在测试环境启用
2. 监控性能指标
3. 修复发现的问题

### 阶段三：完全替换

1. 移除 LangGraph 依赖
2. 完善 LLM 客户端集成
3. 优化性能

## 已知限制

1. **LLM 调用**：当前通过桥接方式使用 @librechat/agents Run，未来会直接集成
2. **性能**：初始版本可能略慢于优化后的 LangGraph，后续会优化
3. **功能**：部分高级功能可能需要后续实现

## 故障排查

如果遇到问题：

1. 检查环境变量 `MOSS_AGENT_RUNTIME` 是否正确设置
2. 查看日志中的错误信息
3. 回退到原始 LangGraph（移除环境变量）
4. 提交 issue 报告问题

## 贡献

欢迎贡献代码和完善实现！

