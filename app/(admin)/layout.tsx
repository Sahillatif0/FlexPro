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
    <div className="relative flex min-h-screen bg-slate-950 text-slate-100">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-purple-600/25 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <AdminSidebar />

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden admin-portal">
        <AdminTopbar />
        <main className="relative flex-1 overflow-y-auto px-4 pb-10 pt-6 sm:px-6 lg:px-10">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-6 mx-auto h-[540px] w-full max-w-6xl rounded-3xl bg-gradient-to-br from-purple-500/10 via-slate-900/40 to-transparent blur-3xl" />
          <div className="relative z-10 mx-auto w-full max-w-6xl animate-fade-in space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
