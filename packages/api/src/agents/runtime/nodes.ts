/**
 * Graph Nodes Implementation
 * 
 * Defines the execution nodes for the agent runtime
 */

import { GraphEvents } from '@librechat/agents';
import type { BaseMessage as Message } from '@langchain/core/messages';
import type { GraphNode, AgentState, NodeContext, ToolCall, ToolResult } from './types';

/**
 * Format tool results into messages
 */
function formatToolMessages(results: ToolResult[]): Message[] {
  // Import LangChain message types as needed
  const { ToolMessage } = require('@langchain/core/messages');
  
  return results.map((result) => {
    return new ToolMessage({
      content: typeof result.result === 'string' 
        ? result.result 
        : JSON.stringify(result.result),
      tool_call_id: result.toolCallId,
    });
  });
}

/**
 * Create LLM node
 */
export function createLLMNode(llmClient: any): GraphNode {
  return {
    name: 'llm',
    async execute(state: AgentState, context: NodeContext) {
      // Emit LLM start event
      await context.handlers.emit(GraphEvents.CHAT_MODEL_START, {
        messages: state.messages,
      });

      // Prepare messages (prune if needed)
      let messages = state.messages;
      if (context.options?.maxContextTokens && context.options?.tokenCounter) {
        messages = pruneMessages(messages, context.options.maxContextTokens, context.options.tokenCounter);
      }

      // Call LLM
      let response;
      try {
        response = await llmClient.invoke({
          messages,
          instructions: context.config.graphConfig.instructions,
          additional_instructions: context.config.graphConfig.additional_instructions,
          streamHandler: async (chunk: any) => {
            await context.handlers.emit(GraphEvents.CHAT_MODEL_STREAM, {
              delta: chunk,
            });
          },
        });
      } catch (error) {
        // If LLM call fails, emit error and rethrow
        await context.handlers.emit(GraphEvents.CHAT_MODEL_END, {
          error,
        });
        throw error;
      }

      // Update state
      return {
        messages: [...state.messages, response.message],
        toolCalls: response.toolCalls,
        currentStep: response.toolCalls && response.toolCalls.length > 0 ? 'tools' : 'done',
        usage: {
          promptTokens: state.usage.promptTokens + (response.usage.promptTokens || 0),
          completionTokens: state.usage.completionTokens + (response.usage.completionTokens || 0),
          totalTokens: (state.usage.promptTokens + (response.usage.promptTokens || 0)) +
                      (state.usage.completionTokens + (response.usage.completionTokens || 0)),
        },
      };
    },
    next: (state) => {
      if (state.toolCalls && state.toolCalls.length > 0) {
        return 'tools';
      }
      return 'done';
    },
  };
}

/**
 * Create Tools node
 */
export function createToolsNode(): GraphNode {
  return {
    name: 'tools',
    async execute(state: AgentState, context: NodeContext) {
      const results: ToolResult[] = [];

      for (const toolCall of state.toolCalls || []) {
        const tool = context.tools.get(toolCall.name);
        if (!tool) {
          const error = new Error(`Tool ${toolCall.name} not found`);
          if (context.options?.callbacks?.toolError) {
            context.options.callbacks.toolError(
              context.config.graphConfig, // Pass config as graph
              error,
              toolCall.id
            );
          }
          throw error;
        }

        try {
          // Emit tool start event
          await context.handlers.emit(GraphEvents.TOOL_START, { toolCall });

          // Execute tool with config (for MCP tools and other tools that need config)
          const toolConfig = {
            configurable: context.execConfig?.configurable || {},
            signal: context.signal,
          };
          
          // Invoke tool - handle both sync and async tools
          // Some tools take config as second param, some don't
          let result;
          try {
            result = await tool.invoke(toolCall.args, toolConfig);
          } catch (e) {
            // If tool doesn't accept config, try without it
            result = await tool.invoke(toolCall.args);
          }
          
          results.push({ toolCallId: toolCall.id, result });

          // Emit tool end event
          await context.handlers.emit(GraphEvents.TOOL_END, {
            toolCall,
            result,
          });
        } catch (error) {
          // Tool error callback
          if (context.options?.callbacks?.toolError) {
            // Pass ExecutionGraph instance as first param (for compatibility with existing code)
            const graphInstance = (context.config as any).graphInstance;
            context.options.callbacks.toolError(
              graphInstance || context.config.graphConfig,
              error as Error,
              toolCall.id
            );
          }
          throw error;
        }
      }

      // Format tool results into messages
      const toolMessages = formatToolMessages(results);

      return {
        toolResults: results,
        messages: [...state.messages, ...toolMessages],
        currentStep: 'llm', // Continue loop
      };
    },
    next: () => 'llm',
  };
}

/**
 * Create Done node
 */
export function createDoneNode(): GraphNode {
  return {
    name: 'done',
    async execute(state: AgentState, context: NodeContext) {
      // Emit completion event
      await context.handlers.emit(GraphEvents.CHAT_MODEL_END, {
        usage: state.usage,
      });

      return { currentStep: 'done' };
    },
    next: () => null,
  };
}

/**
 * Prune messages to fit token limit
 */
function pruneMessages(
  messages: Message[],
  maxTokens: number,
  tokenCounter: (msg: Message) => number
): Message[] {
  // Calculate total tokens
  let totalTokens = 0;
  const tokenCounts = messages.map(msg => {
    const count = tokenCounter(msg);
    totalTokens += count;
    return count;
  });

  // If within limit, return as is
  if (totalTokens <= maxTokens) {
    return messages;
  }

  // Keep system messages and recent messages
  const pruned: Message[] = [];
  let remaining = maxTokens;

  // Always keep the first message (usually system)
  if (messages.length > 0) {
    pruned.push(messages[0]);
    remaining -= tokenCounts[0];
  }

  // Keep messages from the end (most recent)
  for (let i = messages.length - 1; i >= 1; i--) {
    const tokens = tokenCounts[i];
    if (remaining >= tokens) {
      pruned.unshift(messages[i]);
      remaining -= tokens;
    } else {
      break;
    }
  }

  return pruned;
}

