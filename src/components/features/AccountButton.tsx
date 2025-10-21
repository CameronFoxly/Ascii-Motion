import { useState, useEffect } from 'react';
import { LogIn, Crown, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth, SignUpDialog, SignInDialog, PasswordResetDialog, AccountSettingsDialog } from '@ascii-motion/premium';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function AccountButton() {
  const { user, profile, loading, signOut } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  // Listen for custom event to open signup dialog
  useEffect(() => {
    const handleOpenSignUp = () => {
      setShowSignUp(true);
    };
    
    window.addEventListener('openSignUpDialog', handleOpenSignUp);
    return () => window.removeEventListener('openSignUpDialog', handleOpenSignUp);
  }, []);

  // Handle sign out and reset dialog states
  const handleSignOut = async () => {
    // Close all dialogs first
    setShowSignIn(false);
    setShowSignUp(false);
    setShowPasswordReset(false);
    
    // Then sign out
    await signOut();
  };

  // Show loading state
  if (loading) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="gap-1.5"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  // Signed Out State
  if (!user) {
    return (
      <>
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowSignIn(true)}
          className="h-8 px-3 gap-2"
        >
          <LogIn className="h-4 w-4" />
          <span className="text-sm">Sign in</span>
        </Button>

        <SignUpDialog
          open={showSignUp}
          onOpenChange={setShowSignUp}
          onSwitchToSignIn={() => {
            setShowSignUp(false);
            setShowSignIn(true);
          }}
        />

        <SignInDialog
          open={showSignIn}
          onOpenChange={setShowSignIn}
          onSwitchToSignUp={() => {
            setShowSignIn(false);
            setShowSignUp(true);
          }}
          onForgotPassword={() => {
            setShowSignIn(false);
            setShowPasswordReset(true);
          }}
        />

        <PasswordResetDialog
          open={showPasswordReset}
          onOpenChange={setShowPasswordReset}
        />
      </>
    );
  }

  // Signed In State
  const email = user.email || 'User';
  const firstLetter = email[0].toUpperCase();
  const tierName = profile?.subscription_tier?.display_name || 'Free Plan';

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="h-8 w-8 p-0 text-sm font-medium"
              >
                {firstLetter}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Account settings</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-56 border-border/50">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{email}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Crown className="h-3 w-3" />
                <span>{tierName}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowAccountSettings(true)}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Account Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Account Settings Dialog */}
      <AccountSettingsDialog
        open={showAccountSettings}
        onOpenChange={setShowAccountSettings}
        onPasswordChanged={() => {
          toast.success('Successfully changed password');
        }}
        onAccountDeleted={() => {
          toast.success('Account deleted successfully');
        }}
      />
    </TooltipProvider>
  );
}
