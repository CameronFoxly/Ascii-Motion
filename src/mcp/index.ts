/**
 * MCP Client Module
 * 
 * This module provides a WebSocket client that connects to the ascii-motion-mcp
 * server running in --live mode. It receives commands from the MCP server and
 * applies them to the local Zustand stores.
 * 
 * Usage:
 * 1. Start the MCP server: npx ascii-motion-mcp --live
 * 2. Copy the auth token from stdout
 * 3. In the app, call: mcpClient.connect(token)
 * 
 * @example
 * ```tsx
 * import { useMCPConnection } from '@/mcp';
 * 
 * function MyComponent() {
 *   const { connect, disconnect, isConnected } = useMCPConnection();
 *   
 *   return (
 *     <button onClick={() => connect('your-token')}>
 *       {isConnected ? 'Disconnect' : 'Connect'}
 *     </button>
 *   );
 * }
 * ```
 */

export { MCPClient, createMCPClient } from './client';
export { MCPCommandDispatcher } from './commandDispatcher';
export { useMCPStore, type MCPConnectionState } from './store';
export { useMCPConnection } from './useMCPConnection';
export type {
  MCPCommand,
  MCPCommandApplied,
  MCPCommandRequest,
  MCPCommandResult,
  MCPStateUpdate,
  MCPMessage,
} from './types';
