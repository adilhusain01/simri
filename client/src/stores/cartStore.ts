import { create } from 'zustand';
import { cartService } from '../services/api';
import { toast } from 'sonner';
import type { CartState } from '../types';

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  isLoading: false,
  appliedCoupon: null,

  fetchCart: async () => {
    try {
      set({ isLoading: true });
      const cart = await cartService.getCart();
      set({ cart });
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (productId: string, quantity: number) => {
    try {
      set({ isLoading: true });
      await cartService.addItem({ productId, quantity });
      
      // Fetch updated cart
      const cart = await cartService.getCart();
      set({ cart });
      
      toast.success('Item added to cart');
    } catch (error) {
      console.error('Failed to add item to cart:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateItem: async (itemId: string, quantity: number) => {
    try {
      set({ isLoading: true });
      await cartService.updateItem(itemId, { quantity });
      
      // Fetch updated cart
      const cart = await cartService.getCart();
      set({ cart });
      
      toast.success('Cart updated');
    } catch (error) {
      console.error('Failed to update cart item:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  removeItem: async (itemId: string) => {
    try {
      set({ isLoading: true });
      await cartService.removeItem(itemId);
      
      // Fetch updated cart
      const cart = await cartService.getCart();
      set({ cart });
      
      toast.success('Item removed from cart');
    } catch (error) {
      console.error('Failed to remove cart item:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  clearCart: async () => {
    try {
      set({ isLoading: true });
      await cartService.clearCart();
      set({ cart: null, appliedCoupon: null });
      toast.success('Cart cleared');
    } catch (error) {
      console.error('Failed to clear cart:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  applyCoupon: (coupon) => {
    set({ appliedCoupon: coupon });
  },

  removeCoupon: () => {
    set({ appliedCoupon: null });
  },
}));