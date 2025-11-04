/**
 * State Graph Engine
 * 
 * Core execution engine for agent state graphs
 * Replaces LangGraph's StateGraph functionality
 */

import type { AgentState, GraphNode, NodeContext } from './types';

export class StateGraphEngine {
  private nodes: Map<string, GraphNode>;
  private state: AgentState;
  private recursionLimit: number;
  private context: NodeContext;

  constructor(
    nodes: GraphNode[],
    initialState: AgentState,
    context: NodeContext,
    recursionLimit = 10
  ) {
    this.nodes = new Map(nodes.map(n => [n.name, n]));
    this.state = { ...initialState };
    this.context = context;
    this.recursionLimit = recursionLimit;
  }

  async execute(startNode: string = 'llm'): Promise<AgentState> {
    let currentNode = startNode;
    let recursionCount = 0;

    while (currentNode && recursionCount < this.recursionLimit) {
      // Check abort signal
      if (this.context.signal?.aborted) {
        break;
      }

      const node = this.nodes.get(currentNode);
      if (!node) {
        throw new Error(`Node ${currentNode} not found`);
      }

      // Check if node should execute
      if (node.shouldExecute && !node.shouldExecute(this.state)) {
        currentNode = node.next ? node.next(this.state) : null;
        continue;
      }

      try {
        // Execute node
        const updates = await node.execute(this.state, this.context);

        // Update state
        this.state = {
          ...this.state,
          ...updates,
          recursionCount: recursionCount + 1,
        };

        // Determine next node
        if (node.next) {
          currentNode = node.next(this.state) || null;
        } else {
          currentNode = this.determineNextNode(this.state);
        }

        recursionCount++;
      } catch (error) {
        // Handle errors
        if (this.context.options?.callbacks?.error) {
          this.context.options.callbacks.error(error, currentNode, this.state);
        }
        throw error;
      }
    }

    if (recursionCount >= this.recursionLimit) {
      throw new Error(`Recursion limit (${this.recursionLimit}) exceeded`);
    }

    return this.state;
  }

  private determineNextNode(state: AgentState): string | null {
    if (state.currentStep === 'done') {
      return null;
    }

    if (state.toolCalls && state.toolCalls.length > 0) {
      return 'tools';
    }

    if (state.toolResults && state.toolResults.length > 0) {
      return 'llm'; // Continue loop
    }

    return 'done';
  }

  getState(): AgentState {
    return { ...this.state };
  }

  updateState(updates: Partial<AgentState>): void {
    this.state = { ...this.state, ...updates };
  }

  setContext(context: Partial<NodeContext>): void {
    this.context = { ...this.context, ...context } as NodeContext;
  }
  
  getContext(): NodeContext {
    return this.context;
  }
}

