'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { AdminTopbar } from '@/components/layout/admin-topbar';

export default function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const setUser = useAppStore((state) => state.setUser);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
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
    if (!hasHydrated || isCheckingSession) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/');
      return;
    }

    if (user?.role === 'faculty') {
      router.replace('/faculty/dashboard');
      return;
    }

    if (user && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [hasHydrated, isCheckingSession, isAuthenticated, router, user]);

  if (!hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-300">
        Loading admin portal...
      </div>
    );
  }

  if (!isAuthenticated || isCheckingSession || !user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
