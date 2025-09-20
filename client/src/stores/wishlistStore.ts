import { create } from 'zustand';
import { wishlistService } from '../services/api';
import { toast } from 'sonner';
import type { WishlistState, Wishlist } from '../types';

export const useWishlistStore = create<WishlistState>((set, get) => ({
  wishlist: null,
  isLoading: false,

  fetchWishlist: async () => {
    try {
      set({ isLoading: true });
      const wishlist = await wishlistService.getWishlist();
      set({ wishlist });
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (productId: string) => {
    try {
      set({ isLoading: true });
      await wishlistService.addItem(productId);
      
      // Fetch updated wishlist
      const wishlist = await wishlistService.getWishlist();
      set({ wishlist });
      
      toast.success('Added to wishlist');
    } catch (error) {
      console.error('Failed to add item to wishlist:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  removeItem: async (productId: string) => {
    try {
      set({ isLoading: true });
      await wishlistService.removeItem(productId);
      
      // Fetch updated wishlist
      const wishlist = await wishlistService.getWishlist();
      set({ wishlist });
      
      toast.success('Removed from wishlist');
    } catch (error) {
      console.error('Failed to remove item from wishlist:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  clearWishlist: async () => {
    try {
      set({ isLoading: true });
      await wishlistService.clearWishlist();
      set({ wishlist: null });
      toast.success('Wishlist cleared');
    } catch (error) {
      console.error('Failed to clear wishlist:', error);
      toast.error('Failed to clear wishlist');
    } finally {
      set({ isLoading: false });
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));