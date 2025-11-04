/**
 * MOSS Agent Runtime - Type Definitions
 * 
 * Core types for the Agent Runtime system that replaces LangGraph
 */

import type {
  EventHandler,
  GenericTool,
  GraphEvents,
  IState,
  StandardGraphConfig,
} from '@librechat/agents';
import type { BaseMessage as Message } from '@langchain/core/messages';

/**
 * Agent execution state
 */
export interface AgentState {
  messages: Message[];
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  currentStep: 'llm' | 'tools' | 'done';
  recursionCount: number;
  contentData: ContentData[];
  usage: TokenUsage;
  
  // Extension fields for future enhancements
  [key: string]: any;
}

/**
 * Tool call information
 */
export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  toolCallId: string;
  result: any;
  error?: Error;
}

/**
 * Content data for streaming
 */
export interface ContentData {
  type: string;
  [key: string]: any;
}

/**
 * Token usage information
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
}

/**
 * Graph node interface
 */
export interface GraphNode {
  name: string;
  execute: (state: AgentState, context: NodeContext) => Promise<Partial<AgentState>>;
  shouldExecute?: (state: AgentState) => boolean;
  next?: (state: AgentState) => string | null;
}

/**
 * Node execution context
 */
export interface NodeContext {
  llmClient: LLMClient;
  tools: Map<string, GenericTool>;
  handlers: EventHandlerRegistry;
  config: RuntimeConfig;
  signal?: AbortSignal;
  execConfig?: ExecutionConfig;
  options?: ExecutionOptions;
}

/**
 * Runtime configuration
 */
export interface RuntimeConfig {
  runId?: string;
  graphConfig: StandardGraphConfig;
  customHandlers?: Record<GraphEvents, EventHandler>;
  returnContent?: boolean;
  recursionLimit?: number;
}

/**
 * Execution configuration
 */
export interface ExecutionConfig {
  runName?: string;
  configurable: Record<string, any>;
  streamMode?: 'values' | 'updates';
  recursionLimit?: number;
  version?: 'v1' | 'v2';
}

/**
 * Execution options
 */
export interface ExecutionOptions {
  keepContent?: boolean;
  tokenCounter?: (message: Message) => number;
  indexTokenCountMap?: Record<number, number>;
  maxContextTokens?: number;
  callbacks?: Record<string, Function>;
}

/**
 * LLM client interface
 */
export interface LLMClient {
  invoke(params: LLMInvokeParams): Promise<LLMResponse>;
  streamInvoke?(params: LLMInvokeParams): Promise<AsyncIterable<LLMChunk>>;
}

/**
 * LLM invocation parameters
 */
export interface LLMInvokeParams {
  messages: Message[];
  instructions?: string;
  additional_instructions?: string;
  streamHandler?: (chunk: any) => void | Promise<void>;
}

/**
 * LLM response
 */
export interface LLMResponse {
  message: Message;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
}

/**
 * LLM streaming chunk
 */
export interface LLMChunk {
  delta: any;
  usage?: TokenUsage;
}

/**
 * Event handler registry interface
 */
export interface EventHandlerRegistry {
  emit(event: GraphEvents | string, data: any, metadata?: any): Promise<void>;
  register(event: GraphEvents | string, handler: EventHandler): void;
  clear(): void;
}

/**
 * Multi-process configuration
 */
export interface MultiProcessConfig {
  enabled: boolean;
  maxWorkers?: number;
  workerType?: 'thread' | 'process';
  serialization?: 'json' | 'structured-clone';
}

/**
 * Process message for inter-process communication
 */
export interface ProcessMessage {
  type: 'state' | 'command' | 'result' | 'error';
  runId: string;
  data: any;
}

