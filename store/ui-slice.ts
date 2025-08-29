import { StateCreator } from 'zustand';

export interface UISlice {
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  loading: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setLoading: (loading: boolean) => void;
}

export const createUISlice: StateCreator<UISlice> = (set, get) => ({
  theme: 'dark',
  sidebarCollapsed: false,
  loading: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
  setTheme: (theme) => set({ theme }),
  setLoading: (loading) => set({ loading }),
});