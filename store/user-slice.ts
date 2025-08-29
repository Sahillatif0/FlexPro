import { StateCreator } from 'zustand';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  studentId: string;
  role: string;
  program: string;
  semester: number;
  cgpa: number;
  bio?: string;
  phone?: string;
  address?: string;
  avatar?: string | null;
}

export interface UserSlice {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
}

export const createUserSlice: StateCreator<UserSlice> = (set, get) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  updateUser: (updates) => {
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, ...updates } });
    }
  },
  logout: () => set({ user: null, isAuthenticated: false }),
});