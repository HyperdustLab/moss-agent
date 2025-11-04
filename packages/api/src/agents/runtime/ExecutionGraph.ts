/**
 * Execution Graph
 * 
 * API-compatible wrapper for the state graph
 * Maintains compatibility with existing run.Graph interface
 */

import type { BaseMessage as Message } from '@langchain/core/messages';
import type { GenericTool } from '@librechat/agents';
import type { StateGraphEngine } from './StateGraphEngine';
import type { RuntimeConfig, ContentData, TokenUsage } from './types';

/**
 * ExecutionGraph - Compatible with existing run.Graph API
 */
export class ExecutionGraph {
  private engine: StateGraphEngine;
  private config: RuntimeConfig;

  // All properties that existing code might access
  public runId: string | null = null;
  public tools: Map<string, GenericTool> | null = null;
  public signal: AbortSignal | null = null;
  public config: any | null = null;
  public toolEnd: boolean | null = null;
  public toolMap: Map<string, GenericTool> | null = null;
  public provider: string | null = null;
  public streamBuffer: number | null = null;
  public clientOptions: any | null = null;
  public graphState: any | null = null;
  public boundModel: any | null = null;
  public systemMessage: string | null = null;
  public reasoningKey: string | null = null;
  public messages: Message[] | null = null;
  public contentData: ContentData[] = [];
  public stepKeyIds: string[] | null = null;
  public contentIndexMap: Map<any, any> | null = null;
  public toolCallStepIds: string[] | null = null;
  public messageIdsByStepKey: Map<string, string> | null = null;
  public messageStepHasToolCalls: Map<string, boolean> | null = null;
  public prelimMessageIdsByStepKey: Map<string, string> | null = null;
  public currentTokenType: string | null = null;
  public lastToken: string | null = null;
  public tokenTypeSwitch: boolean | null = null;
  public indexTokenCountMap: Record<number, number> | null = null;
  public currentUsage: TokenUsage | null = null;
  public tokenCounter: ((msg: Message) => number) | null = null;
  public maxContextTokens: number | null = null;
  public pruneMessages: ((msgs: Message[]) => Message[]) | null = null;
  public lastStreamCall: any | null = null;
  public startIndex: number | null = null;
  public handlerRegistry: any | null = null;

  constructor(engine: StateGraphEngine, config: RuntimeConfig) {
    this.engine = engine;
    this.config = config;

    // Initialize compatible properties
    this.runId = config.runId || null;
    this.signal = config.graphConfig.signal || null;
    this.tools = new Map((config.graphConfig.tools || []).map(t => [t.name, t]));
    this.toolMap = this.tools;
    this.provider = config.graphConfig.llmConfig.provider;
    this.streamBuffer = config.graphConfig.streamBuffer || null;
    this.reasoningKey = config.graphConfig.reasoningKey || null;
    this.contentData = [];
    this.config = config.graphConfig;
  }

  /**
   * Get messages from the run
   */
  getRunMessages(): Message[] {
    const state = this.engine.getState();
    return state.messages || [];
  }

  /**
   * Reset all values (for cleanup)
   */
  resetValues(): void {
    this.contentData = [];
    this.messages = null;
    this.graphState = null;
    this.currentUsage = null;
    this.stepKeyIds = null;
    this.toolCallStepIds = null;
    this.messageIdsByStepKey = null;
    this.messageStepHasToolCalls = null;
    this.prelimMessageIdsByStepKey = null;
    this.currentTokenType = null;
    this.lastToken = null;
    this.tokenTypeSwitch = null;
    this.indexTokenCountMap = null;
    this.lastStreamCall = null;
    this.startIndex = null;
  }

  /**
   * Sync state from engine to compatible properties
   */
  syncState(): void {
    const state = this.engine.getState();
    this.messages = state.messages;
    this.contentData = state.contentData;
    this.currentUsage = state.usage;
    this.graphState = state;
  }
}

