'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAppStore } from '@/store';
import type { User as StoreUser } from '@/store/user-slice';

interface AppProviderProps {
  initialUser: StoreUser | null;
  children: ReactNode;
}

export function AppProvider({ initialUser, children }: AppProviderProps) {
  const setUser = useAppStore((state) => state.setUser);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser, setUser]);

  return <>{children}</>;
}
