/**
 * MOSS Agent Runtime
 * 
 * Main runtime implementation that replaces LangGraph
 */

import type {
  EventHandler,
  GenericTool,
  GraphEvents,
  IState,
  StandardGraphConfig,
} from '@librechat/agents';
import type { BaseMessage as Message } from '@langchain/core/messages';

import { StateGraphEngine } from './StateGraphEngine';
import { ExecutionGraph } from './ExecutionGraph';
import { EventHandlerRegistryImpl } from './EventHandlerRegistry';
import { LLMClientFactory } from './LLMClientAdapter';
import { createLLMNode, createToolsNode, createDoneNode } from './nodes';

import type {
  AgentState,
  RuntimeConfig,
  ExecutionConfig,
  ExecutionOptions,
  NodeContext,
  LLMClient,
} from './types';

/**
 * Agent Runtime - Main class that replaces Run from @librechat/agents
 */
export class AgentRuntime {
  public Graph: ExecutionGraph;
  public handlerRegistry: EventHandlerRegistryImpl;
  public graphRunnable: any | null = null; // For compatibility with cleanup code

  private engine: StateGraphEngine;
  private llmClient: LLMClient;
  private tools: Map<string, GenericTool>;
  private config: RuntimeConfig;

  private constructor(
    engine: StateGraphEngine,
    graph: ExecutionGraph,
    handlers: EventHandlerRegistryImpl,
    llmClient: LLMClient,
    tools: Map<string, GenericTool>,
    config: RuntimeConfig
  ) {
    this.engine = engine;
    this.Graph = graph;
    this.handlerRegistry = handlers;
    this.llmClient = llmClient;
    this.tools = tools;
    this.config = config;
  }

  /**
   * Create a new AgentRuntime instance
   * Compatible with Run.create() from @librechat/agents
   */
  static async create(config: {
    runId?: string;
    graphConfig: StandardGraphConfig;
    customHandlers?: Record<GraphEvents, EventHandler>;
    returnContent?: boolean;
  }): Promise<AgentRuntime> {
    // Create tool map
    const tools = new Map(
      (config.graphConfig.tools || []).map(tool => [tool.name, tool])
    );

    // Create LLM client
    const llmClient = LLMClientFactory.create(
      config.graphConfig.llmConfig.provider,
      config.graphConfig.llmConfig
    );

    // Create event handler registry
    const handlers = new EventHandlerRegistryImpl(config.customHandlers);

    // Create nodes
    const llmNode = createLLMNode(llmClient);
    const toolsNode = createToolsNode();
    const doneNode = createDoneNode();

    const nodes = [llmNode, toolsNode, doneNode];

    // Create initial state
    const initialState: AgentState = {
      messages: [],
      currentStep: 'llm',
      recursionCount: 0,
      contentData: [],
      usage: { promptTokens: 0, completionTokens: 0 },
    };

    // Create node context
    const nodeContext: NodeContext = {
      llmClient,
      tools,
      handlers,
      config,
      signal: config.graphConfig.signal,
    };

    // Create runtime config
    const runtimeConfig: RuntimeConfig = {
      runId: config.runId,
      graphConfig: config.graphConfig,
      customHandlers: config.customHandlers,
      returnContent: config.returnContent,
      recursionLimit: 10,
    };

    // Create state graph engine
    const engine = new StateGraphEngine(
      nodes,
      initialState,
      nodeContext,
      runtimeConfig.recursionLimit || 10
    );

    // Create execution graph
    const graph = new ExecutionGraph(engine, runtimeConfig);
    
    // Store graph instance in config for tool error callbacks (compatibility)
    (runtimeConfig as any).graphInstance = graph;
    
    // Update node context with graph instance
    nodeContext.config = runtimeConfig as any;

    return new AgentRuntime(engine, graph, handlers, llmClient, tools, runtimeConfig);
  }

  /**
   * Process stream - main execution method
   */
  async processStream(
    inputs: { messages: Message[] },
    execConfig: ExecutionConfig,
    options?: ExecutionOptions
  ): Promise<any> {
    // Prepare initial state
    const initialState: AgentState = {
      messages: inputs.messages,
      currentStep: 'llm',
      recursionCount: 0,
      contentData: options?.keepContent ? this.Graph.contentData : [],
      usage: { promptTokens: 0, completionTokens: 0 },
    };

    // Update engine state
    this.engine.updateState(initialState);

    // Update context with execution config and options
    const currentContext = this.engine.getContext();
    this.engine.setContext({
      ...currentContext,
      execConfig,
      options,
    });

    // Set graph properties for compatibility
    if (options?.tokenCounter) {
      this.Graph.tokenCounter = options.tokenCounter;
    }
    if (options?.maxContextTokens) {
      this.Graph.maxContextTokens = options.maxContextTokens;
    }
    if (options?.indexTokenCountMap) {
      this.Graph.indexTokenCountMap = options.indexTokenCountMap;
    }

    // Execute state graph
    const finalState = await this.engine.execute('llm');

    // Sync state to graph
    this.Graph.syncState();

    // Return content if configured
    if (this.config.returnContent) {
      return finalState.messages;
    }

    return undefined;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.Graph.resetValues();
    this.handlerRegistry.clear();
  }
}

// Export types for compatibility
export type { AgentRuntime as Run };
export type { IState };
export type { RuntimeConfig };
export type { ExecutionConfig };
export type { ExecutionOptions };

