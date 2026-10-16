import type { BridgeErrorCode } from '../contract/operations';

export class BridgeError extends Error {
  readonly code: BridgeErrorCode;
  readonly details?: unknown;

  constructor(code: BridgeErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'BridgeError';
    this.code = code;
    this.details = details;
  }
}

export function toBridgeError(error: unknown): BridgeError {
  if (error instanceof BridgeError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (/not found|does not exist|unknown (layer|group|block|frame)/i.test(message)) {
    return new BridgeError('NOT_FOUND', message);
  }
  if (/locked/i.test(message)) return new BridgeError('LOCKED', message);
  if (/limit/i.test(message)) return new BridgeError('LIMIT_REACHED', message);
  if (/invalid|must be|expected|out of range|unsupported generator|unknown generator/i.test(message)) {
    return new BridgeError('INVALID_INPUT', message);
  }
  return new BridgeError('INTERNAL', message);
}

export const notFound = (what: string, id: unknown) => new BridgeError('NOT_FOUND', `${what} not found: ${String(id)}`);
export const invalid = (message: string, details?: unknown) => new BridgeError('INVALID_INPUT', message, details);
