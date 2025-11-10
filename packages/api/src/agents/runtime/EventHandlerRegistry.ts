/**
 * Event Handler Registry
 * 
 * Manages event handlers for the runtime system
 */

import type { EventHandler } from '@librechat/agents';
import { GraphEvents } from '@librechat/agents';
import type { EventHandlerRegistry } from './types';

export class EventHandlerRegistryImpl implements EventHandlerRegistry {
  private handlers: Map<GraphEvents | string, EventHandler>;

  constructor(customHandlers?: Record<GraphEvents | string, EventHandler>) {
    this.handlers = new Map();
    
    if (customHandlers) {
      for (const [event, handler] of Object.entries(customHandlers)) {
        this.register(event as GraphEvents, handler);
      }
    }
  }

  register(event: GraphEvents | string, handler: EventHandler): void {
    this.handlers.set(event, handler);
  }

  async emit(event: GraphEvents | string, data: any, metadata?: any): Promise<void> {
    const handler = this.handlers.get(event);
    if (handler) {
      try {
        if (typeof handler === 'function') {
          await (handler as (event: string, data: any, metadata?: any) => void | Promise<void>)(event, data, metadata);
        } else if (handler && typeof (handler as any).handle === 'function') {
          await (handler as any).handle(event, data, metadata);
        }
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
        // Don't throw - allow other handlers to continue
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }

  has(event: GraphEvents | string): boolean {
    return this.handlers.has(event);
  }

  get(event: GraphEvents | string): EventHandler | undefined {
    return this.handlers.get(event);
  }
}

