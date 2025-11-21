'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FacultySidebar } from '@/components/layout/faculty-sidebar';
import { FacultyTopbar } from '@/components/layout/faculty-topbar';
import { useAppStore } from '@/store';

export default function FacultyPortalLayout({
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

    if (user && user.role !== 'faculty') {
      router.replace('/dashboard');
    }
  }, [hasHydrated, isCheckingSession, isAuthenticated, router, user]);

  if (!hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-300">
        Loading faculty portal...
      </div>
    );
  }

  if (!isAuthenticated || isCheckingSession || !user || user.role !== 'faculty') {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <FacultySidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <FacultyTopbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
