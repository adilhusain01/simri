import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService } from '../services/api';
import type { AuthState } from '../types';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true });
          console.log('🏪 Auth Store: Starting login process');
          const user = await authService.login({ email, password });
          console.log('📤 Auth Store: Received user data:', user);
          
          // Only allow admin users
          if (user.role !== 'admin') {
            console.error('🚫 Auth Store: User is not admin, role:', user.role);
            throw new Error('Access denied. Admin privileges required.');
          }
          
          console.log('✅ Auth Store: Admin user authenticated, setting state');
          set({ user, isAuthenticated: true });
        } catch (error: any) {
          console.error('❌ Auth Store: Login error:', error);
          throw new Error(error.message || 'Login failed');
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

      checkAuth: async () => {
        try {
          set({ isLoading: true });
          const user = await authService.me();
          
          // Only allow admin users
          if (user.role !== 'admin') {
            set({ user: null, isAuthenticated: false });
            return;
          }
          
          set({ user, isAuthenticated: true });
        } catch (error) {
          set({ user: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);