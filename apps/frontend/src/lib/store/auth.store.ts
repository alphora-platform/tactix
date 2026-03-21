import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../api/auth.api';

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    { name: 'tactix-auth' }
  )
);
