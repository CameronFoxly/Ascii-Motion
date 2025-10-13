import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth, SignUpDialog, SignInDialog, PasswordResetDialog, UserMenu } from '@ascii-motion/premium';
import { LogIn, UserPlus } from 'lucide-react';

export function AuthButtons() {
  const { user, loading } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  // Don't render anything while loading
  if (loading) {
    return null;
  }

  // Show UserMenu if logged in
  if (user) {
    return <UserMenu />;
  }

  // Show Sign Up / Sign In buttons if logged out
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowSignIn(true)}
        className="gap-1.5"
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Sign In</span>
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={() => setShowSignUp(true)}
        className="gap-1.5"
      >
        <UserPlus className="h-4 w-4" />
        <span className="hidden sm:inline">Sign Up</span>
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
