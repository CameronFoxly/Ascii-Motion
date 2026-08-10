import type {
  MCPCommand,
  MCPCommandApplied,
  MCPCommandRequest,
  MCPCommandResult,
} from './types';

export type MCPCommandExecutor = (
  command: MCPCommand,
) => Promise<MCPCommandApplied | undefined> | MCPCommandApplied | undefined;

export type MCPCommandResultSender = (result: MCPCommandResult) => void;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  const message = String(error);
  return message === 'undefined' ? 'Unknown browser command error' : message;
}

/**
 * Serializes authoritative server commands so state mutations and their
 * correlated results are observed in exactly the order they were received.
 */
export class MCPCommandDispatcher {
  private queue: Promise<void> = Promise.resolve();
  private readonly execute: MCPCommandExecutor;
  private readonly sendResult: MCPCommandResultSender;

  constructor(
    execute: MCPCommandExecutor,
    sendResult: MCPCommandResultSender,
  ) {
    this.execute = execute;
    this.sendResult = sendResult;
  }

  dispatch(request: MCPCommandRequest): Promise<MCPCommandResult> {
    return this.enqueue(() => this.executeRequest(request));
  }

  reject(requestId: string, error: string): Promise<MCPCommandResult> {
    return this.enqueue(() => {
      const result: MCPCommandResult = {
        type: 'command_result',
        requestId,
        success: false,
        error,
      };
      this.sendResult(result);
      return Promise.resolve(result);
    });
  }

  private enqueue(
    execute: () => Promise<MCPCommandResult>,
  ): Promise<MCPCommandResult> {
    const execution = this.queue.then(execute);
    // Keep later commands moving even if the transport throws while emitting a
    // result. The returned promise still exposes that transport failure.
    this.queue = execution.then(
      () => undefined,
      () => undefined,
    );

    return execution;
  }

  private async executeRequest(request: MCPCommandRequest): Promise<MCPCommandResult> {
    let result: MCPCommandResult;

    try {
      const applied = await this.execute(request.command);
      result = applied
        ? {
            type: 'command_result',
            requestId: request.requestId,
            success: true,
            applied,
          }
        : {
            type: 'command_result',
            requestId: request.requestId,
            success: true,
          };
    } catch (error) {
      result = {
        type: 'command_result',
        requestId: request.requestId,
        success: false,
        error: getErrorMessage(error),
      };
    }

    this.sendResult(result);
    return result;
  }
}
