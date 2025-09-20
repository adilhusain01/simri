import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService } from '../services/api';
import type { AuthState, User } from '../types';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true });
          const response = await authService.login({ email, password });
          set({ user: response.user, isAuthenticated: true });
          return response;
        } catch (error) {
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (userData: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        password: string;
      }) => {
        try {
          set({ isLoading: true });
          // Pass userData directly to match backend expectations
          const response = await authService.register(userData);
          // Don't set user or isAuthenticated - user needs to verify email first
          return response;
        } catch (error) {
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      handleOAuthCallback: async (params: { code: string; state?: string | null }) => {
        try {
          set({ isLoading: true });
          const response = await authService.googleCallback(params);
          set({ user: response.user, isAuthenticated: true });
          return response;
        } catch (error) {
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({ user: null, isAuthenticated: false });
        }
      },

      updateUser: (updatedUser: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updatedUser } });
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Initialize auth state on app load
      initialize: async () => {
        try {
          set({ isLoading: true });
          const user = await authService.me();
          set({ user, isAuthenticated: true });
        } catch (error) {
          // User not authenticated
          set({ user: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Add initialize method to the store interface
declare module '../types' {
  interface AuthState {
    initialize: () => Promise<void>;
  }
}