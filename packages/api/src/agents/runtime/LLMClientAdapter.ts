/**
 * LLM Client Adapter
 * 
 * Adapter to interface with existing LLM clients from @librechat/agents
 * Uses a hybrid approach: delegates LLM calls to @librechat/agents Run
 * while managing state with our own engine
 */

import { Run } from '@librechat/agents';
import type { Providers, StandardGraphConfig } from '@librechat/agents';
import type { BaseMessage as Message } from '@langchain/core/messages';
import type { LLMClient, LLMInvokeParams, LLMResponse, ToolCall } from './types';

/**
 * Adapter that uses @librechat/agents Run for LLM calls
 * This ensures compatibility while we build out full LLM integration
 */
export class LLMClientAdapter implements LLMClient {
  private provider: Providers;
  private config: StandardGraphConfig;
  private delegateRun: any | null = null;

  constructor(provider: Providers, config: StandardGraphConfig) {
    this.provider = provider;
    this.config = config;
  }

  async invoke(params: LLMInvokeParams): Promise<LLMResponse> {
    const { messages, instructions, additional_instructions, streamHandler } = params;

    // Create a temporary Run instance for LLM invocation
    // This uses @librechat/agents infrastructure but we manage the state
    if (!this.delegateRun) {
      this.delegateRun = await Run.create({
        graphConfig: {
          ...this.config,
          instructions: instructions || this.config.instructions,
          additional_instructions: additional_instructions || this.config.additional_instructions,
        },
        customHandlers: streamHandler ? {
          // Capture streaming events
        } : undefined,
      });
    }

    // Execute LLM call through the delegate Run
    // We'll use a minimal execution to get the LLM response
    const tempState = { messages };
    
    // Use the Run's internal LLM invocation
    // Note: This is a bridge implementation - in future we'll replace this
    // with direct LLM client calls
    try {
      const result = await (this.delegateRun as any).Graph?.invokeLLM?.(messages, {
        instructions: instructions || this.config.instructions,
        additional_instructions,
        streamHandler,
      });

      if (result) {
        return {
          message: result.message,
          toolCalls: result.toolCalls,
          usage: result.usage || { promptTokens: 0, completionTokens: 0 },
        };
      }
    } catch (e) {
      // Fallback: try to use Run's processStream in a minimal way
    }

    // Fallback: Create a minimal Run execution just for this LLM call
    const minimalRun = await Run.create({
      graphConfig: {
        ...this.config,
        instructions: instructions || this.config.instructions,
        additional_instructions: additional_instructions || this.config.additional_instructions,
        tools: [], // No tools for LLM-only call
      },
    });

    // Execute minimal stream to get response
    const execResult = await minimalRun.processStream(
      { messages },
      {
        configurable: {},
        recursionLimit: 1, // Just one LLM call
        streamMode: 'values',
      },
      {
        keepContent: false,
      }
    );

    // Extract response from the Run
    const runMessages = minimalRun.Graph.getRunMessages();
    const lastMessage = runMessages[runMessages.length - 1];

    // Cleanup
    minimalRun.Graph?.resetValues?.();

    return {
      message: lastMessage || messages[messages.length - 1],
      toolCalls: extractToolCalls(runMessages),
      usage: {
        promptTokens: 0,
        completionTokens: 0,
      },
    };
  }

  async streamInvoke?(params: LLMInvokeParams): Promise<AsyncIterable<any>> {
    // Streaming implementation would go here
    // For now, delegate to invoke
    throw new Error('streamInvoke not yet implemented - use invoke with streamHandler');
  }
}

/**
 * Extract tool calls from messages
 */
function extractToolCalls(messages: Message[]): ToolCall[] | undefined {
  for (const msg of messages.reverse()) {
    if ((msg as any).tool_calls) {
      return (msg as any).tool_calls.map((tc: any) => ({
        id: tc.id || tc.tool_call_id,
        name: tc.name || tc.function?.name,
        args: tc.args || (tc.function?.arguments ? JSON.parse(tc.function.arguments) : {}),
      }));
    }
  }
  return undefined;
}

/**
 * Factory to create LLM clients
 */
export class LLMClientFactory {
  /**
   * Create an LLM client adapter
   * Uses @librechat/agents Run as a bridge for LLM calls
   */
  static create(provider: Providers, config: StandardGraphConfig): LLMClient {
    return new LLMClientAdapter(provider, config);
  }
}

