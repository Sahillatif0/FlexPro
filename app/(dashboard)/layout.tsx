'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { useAppStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const setUser = useAppStore((state) => state.setUser);
  const router = useRouter();
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // Wait until Zustand rehydrates persisted state before checking auth.
    setHasHydrated(useAppStore.persist.hasHydrated());
    const unsub = useAppStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (isAuthenticated) {
      setIsCheckingSession(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadSession() {
      setIsCheckingSession(true);
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const result = await response.json();
        if (!cancelled && result?.user) {
          setUser(result.user);
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          return;
        }
        console.error('Failed to restore session', error);
      } finally {
        if (!cancelled) {
          setIsCheckingSession(false);
        }
      }
    }

    loadSession();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [hasHydrated, isAuthenticated, setUser]);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated && !isCheckingSession) {
      router.replace('/');
    }
  }, [hasHydrated, isAuthenticated, isCheckingSession, router]);

  if (!hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-300">
        Loading dashboard...
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}