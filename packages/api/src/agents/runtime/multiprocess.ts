/**
 * Multi-Process Support
 * 
 * Enables agent execution in separate processes/threads
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fork } from 'child_process';
import type {
  AgentState,
  RuntimeConfig,
  ExecutionConfig,
  ExecutionOptions,
  ProcessMessage,
  MultiProcessConfig,
} from './types';
import { AgentRuntime } from './index';

/**
 * Execute runtime in a worker thread
 */
export async function executeInWorker(
  config: RuntimeConfig,
  execConfig: ExecutionConfig,
  options?: ExecutionOptions,
  inputs?: { messages: any[] }
): Promise<AgentState> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      workerData: {
        config,
        execConfig,
        options,
        inputs,
      },
    });

    worker.on('message', (message: ProcessMessage) => {
      if (message.type === 'result') {
        resolve(message.data);
      } else if (message.type === 'error') {
        reject(new Error(message.data));
      }
    });

    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

/**
 * Execute runtime in a child process
 */
export async function executeInProcess(
  config: RuntimeConfig,
  execConfig: ExecutionConfig,
  options?: ExecutionOptions,
  inputs?: { messages: any[] }
): Promise<AgentState> {
  return new Promise((resolve, reject) => {
    const child = fork(__filename, [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    child.send({
      type: 'execute',
      config,
      execConfig,
      options,
      inputs,
    });

    child.on('message', (message: ProcessMessage) => {
      if (message.type === 'result') {
        resolve(message.data);
      } else if (message.type === 'error') {
        reject(new Error(message.data));
      }
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

/**
 * Worker/Process entry point
 */
if (!isMainThread && workerData) {
  (async () => {
    try {
      const { config, execConfig, options, inputs } = workerData;
      const runtime = await AgentRuntime.create(config);
      const result = await runtime.processStream(inputs || { messages: [] }, execConfig, options);
      
      if (parentPort) {
        parentPort.postMessage({
          type: 'result',
          runId: config.runId,
          data: runtime.Graph.getRunMessages(),
        } as ProcessMessage);
      }
    } catch (error) {
      if (parentPort) {
        parentPort.postMessage({
          type: 'error',
          runId: workerData.config?.runId,
          data: error instanceof Error ? error.message : String(error),
        } as ProcessMessage);
      }
    }
  })();
}

/**
 * Multi-process runtime wrapper
 */
export class MultiProcessRuntime {
  private config: MultiProcessConfig;

  constructor(config: MultiProcessConfig = { enabled: false }) {
    this.config = config;
  }

  async execute(
    config: RuntimeConfig,
    execConfig: ExecutionConfig,
    options?: ExecutionOptions,
    inputs?: { messages: any[] }
  ): Promise<AgentState> {
    if (!this.config.enabled) {
      // Execute in current process
      const runtime = await AgentRuntime.create(config);
      await runtime.processStream(inputs || { messages: [] }, execConfig, options);
      return runtime.Graph.getState();
    }

    // Execute in separate process/thread
    if (this.config.workerType === 'process') {
      return executeInProcess(config, execConfig, options, inputs);
    } else {
      return executeInWorker(config, execConfig, options, inputs);
    }
  }
}

