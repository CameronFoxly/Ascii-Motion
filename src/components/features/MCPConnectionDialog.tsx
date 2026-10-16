/**
 * MCP Connection Dialog
 * 
 * Dialog for managing MCP server connection.
 * Allows users to enter auth token and connect to the MCP server.
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Unplug, Plug, Terminal, Copy, Check, Info, ChevronDown, ExternalLink } from 'lucide-react';
import { useMCPConnection } from '../../mcp';
import { cn } from '../../lib/utils';

const HOST_CONFIG_SNIPPET = '"ascii-motion": { "command": "npx", "args": ["-y", "ascii-motion-mcp", "--live"] }';

interface MCPConnectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MCPConnectionDialog: React.FC<MCPConnectionDialogProps> = ({
  isOpen,
  onOpenChange
}) => {
  const {
    connectionState,
    isConnected,
    error,
    commandsReceived,
    connect,
    disconnect
  } = useMCPConnection();

  const [token, setToken] = useState('');
  const [port, setPort] = useState('9876');
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedGlobal, setCopiedGlobal] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleConnect = async () => {
    if (!token.trim()) return;

    setIsConnecting(true);
    try {
      await connect(token.trim(), parseInt(port, 10) || 9876);
    } catch (err) {
      console.error('Failed to connect:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setToken('');
  };

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(HOST_CONFIG_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyGlobalInstall = () => {
    navigator.clipboard.writeText('npm install -g ascii-motion-mcp');
    setCopiedGlobal(true);
    setTimeout(() => setCopiedGlobal(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            MCP Connection
          </DialogTitle>
          <DialogDescription>
            Connect to the ASCII Motion MCP server for AI-assisted editing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connection Status */}
          <Card className="border-border/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      connectionState === 'connected' && 'bg-green-500',
                      connectionState === 'connecting' && 'bg-yellow-500 animate-pulse',
                      connectionState === 'error' && 'bg-red-500',
                      connectionState === 'disconnected' && 'bg-zinc-500'
                    )}
                  />
                  <span className={cn(
                    'text-sm font-medium',
                    connectionState === 'connected' && 'text-green-500',
                    connectionState === 'connecting' && 'text-yellow-500',
                    connectionState === 'error' && 'text-red-500',
                    connectionState === 'disconnected' && 'text-muted-foreground'
                  )}>
                    {connectionState === 'connected' && 'Connected'}
                    {connectionState === 'connecting' && 'Connecting...'}
                    {connectionState === 'error' && 'Error'}
                    {connectionState === 'disconnected' && 'Disconnected'}
                  </span>
                </div>
              </div>
              {isConnected && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Commands received</span>
                    <span className="font-mono">{commandsReceived}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {error && (
            <Card className="border-red-500/50 bg-red-500/10">
              <CardContent className="pt-4">
                <p className="text-sm text-red-400">{error}</p>
              </CardContent>
            </Card>
          )}

          {isConnected ? (
            <Button
              onClick={handleDisconnect}
              variant="destructive"
              className="w-full"
            >
              <Unplug className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          ) : (
            <>
              <Separator />

              {/* Instructions */}
              <div className="space-y-3">
                <ol className="list-decimal pl-4 space-y-2 text-sm text-muted-foreground">
                  <li>
                    Add ASCII Motion MCP to your AI host (Copilot, Claude, Cursor…) in live mode. The host starts and owns the server:
                    <div className="flex gap-2 mt-1.5">
                      <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono break-all">
                        {HOST_CONFIG_SNIPPET}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyCommand}
                        className="shrink-0"
                        aria-label="Copy MCP server config"
                      >
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </li>
                  <li>
                    In that same AI session, ask it to call <code className="bg-muted px-1 rounded">get_auth_token</code> and{' '}
                    <code className="bg-muted px-1 rounded">get_connection_status</code> to get the token and port.
                  </li>
                  <li>Paste the token (and port, if not 9876) below and connect.</li>
                </ol>

                {/* Info text */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Don&apos;t start a separate <code className="bg-muted px-1 rounded">ascii-motion-mcp --live</code> in a terminal: that is a different
                    server with its own token, and your AI host won&apos;t see this browser.
                  </span>
                </div>

                {/* Advanced: Global install option */}
                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                  <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronDown className={cn(
                      "h-3 w-3 transition-transform",
                      advancedOpen && "rotate-180"
                    )} />
                    <span>Alternative: Install globally</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="flex gap-2">
                      <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono">
                        npm install -g ascii-motion-mcp
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyGlobalInstall}
                        className="shrink-0"
                      >
                        {copiedGlobal ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Then set your host&apos;s server command to <code className="bg-muted px-1 rounded">ascii-motion-mcp</code> with args{' '}
                      <code className="bg-muted px-1 rounded">--live</code>.
                    </p>
                  </CollapsibleContent>
                </Collapsible>

                {/* Docs link */}
                <a
                  href="https://docs.ascii-motion.com/mcp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View full setup guide
                </a>
              </div>

              <Separator />

              {/* Connection Form */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mcp-token">Auth Token</Label>
                  <Input
                    id="mcp-token"
                    type="text"
                    placeholder="Token from get_auth_token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={isConnecting}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mcp-port">Port</Label>
                  <Input
                    id="mcp-port"
                    type="number"
                    placeholder="9876"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    disabled={isConnecting}
                  />
                </div>

                <Button
                  onClick={handleConnect}
                  disabled={!token.trim() || isConnecting}
                  className="w-full"
                >
                  <Plug className="mr-2 h-4 w-4" />
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
