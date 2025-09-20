import React, { useEffect } from 'react';
import { Outlet } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import Header from './Header';
import Footer from './Footer';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { useWishlistStore } from '../../stores/wishlistStore';

const Layout: React.FC = () => {
  const { initialize, isAuthenticated } = useAuthStore();
  const { fetchCart } = useCartStore();
  const { fetchWishlist } = useWishlistStore();

  // Initialize auth and cart on app load
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Fetch cart and wishlist when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
      fetchWishlist();
    }
  }, [isAuthenticated, fetchCart, fetchWishlist]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      
      <Footer />
      
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-white border-l-4 border-l-purple-500 shadow-lg',
          duration: 4000,
        }}
      />
    </div>
  );
};

export default Layout;