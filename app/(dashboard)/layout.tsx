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
  const user = useAppStore((state) => state.user);
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

  useEffect(() => {
    if (!hasHydrated || !user) {
      return;
    }

    if (user.role === 'faculty') {
      router.replace('/faculty/dashboard');
    } else if (user.role === 'admin') {
      router.replace('/admin/dashboard');
    }
  }, [hasHydrated, router, user]);

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
    <div className="relative flex h-screen overflow-hidden bg-[#040712] text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="student-glow left-[-18rem] top-[-6rem] h-96 w-96 bg-blue-500/35"></div>
        <div className="student-glow right-[-14rem] top-[20%] h-[28rem] w-[28rem] bg-emerald-500/25"></div>
        <div className="student-glow left-[30%] bottom-[-18rem] h-[26rem] w-[26rem] bg-purple-500/20"></div>
      </div>
      <Sidebar />
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="student-portal relative flex-1 overflow-y-auto px-4 pb-10 pt-6 sm:px-8">
          <div className="mx-auto w-full max-w-7xl space-y-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}