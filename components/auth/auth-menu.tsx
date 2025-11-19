'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';

export function AuthMenu() {
  const { user, logout } = useAppStore();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to sign out');
      }
      logout();
    } catch (error) {
      console.error('Failed to sign out', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="border-gray-700 text-gray-200 hover:bg-gray-800"
      disabled={isSigningOut}
      onClick={handleSignOut}
    >
      {isSigningOut ? 'Signing out...' : 'Logout'}
    </Button>
  );
}
