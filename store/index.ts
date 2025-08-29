import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserSlice, createUserSlice } from './user-slice';
import { UISlice, createUISlice } from './ui-slice';
import { EnrollmentSlice, createEnrollmentSlice } from './enrollment-slice';
import { FeesSlice, createFeesSlice } from './fees-slice';

export type AppStore = UserSlice & UISlice & EnrollmentSlice & FeesSlice;

export const useAppStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...createUserSlice(...a),
      ...createUISlice(...a),
      ...createEnrollmentSlice(...a),
      ...createFeesSlice(...a),
    }),
    {
      name: 'flexpro-storage',
      partialize: (state) => ({
        user: state.user,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);