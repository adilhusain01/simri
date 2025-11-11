import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  Heart,
  ShoppingBag,
  Trash2,
  Package,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { LoadingSpinner } from '../components/ui/loading';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { useWishlistStore } from '../stores/wishlistStore';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { wishlistService } from '../services/api';
import type { WishlistItem } from '../types';
import { toast } from 'sonner';

// Helper function to extract image URL from Cloudinary object or use string directly
const getImageUrl = (imageData: any, size: 'thumb' | 'medium' | 'large' | 'original' = 'medium') => {
  if (typeof imageData === 'string') {
    return imageData; // Legacy string format
  }
  if (typeof imageData === 'object' && imageData) {
    return imageData[size] || imageData.original || imageData.large || imageData.medium || imageData.thumb;
  }
  return '/placeholder-product.jpg';
};

const Wishlist: React.FC = () => {
  const navigate = useNavigate();
  const { wishlist, removeItem, clearWishlist, isLoading, fetchWishlist } = useWishlistStore();
  const { addItem: addToCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  // State
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/auth/login', search: { redirect: '/wishlist' } });
      return;
    }
    fetchWishlist();
  }, [isAuthenticated, navigate, fetchWishlist]);

  // Handlers
  const handleRemoveItem = async (item: WishlistItem) => {
    try {
      await removeItem(item.product.id);
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
    }
  };

  const handleAddToCart = async (item: WishlistItem) => {
    try {
      await addToCart(item.product.id, 1);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  const handleMoveToCart = async (item: WishlistItem) => {
    try {
      // Use the dedicated moveToCart API that handles both operations
      await wishlistService.moveToCart(item.id, 1);
      
      // Refresh wishlist to show updated state
      await fetchWishlist();
      
      toast.success(`${item.product.name} moved to cart!`);
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    } catch (error) {
      console.error('Failed to move to cart:', error);
      toast.error('Failed to move item to cart');
    }
  };

  const handleClearWishlist = async () => {
    try {
      await clearWishlist();
      setShowClearConfirm(false);
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Failed to clear wishlist:', error);
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === wishlist?.items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(wishlist?.items.map(item => item.id) || []));
    }
  };

  const handleMoveSelectedToCart = async () => {
    if (!wishlist?.items || selectedItems.size === 0) return;

    try {
      const itemsToMove = wishlist.items.filter(item => selectedItems.has(item.id));
      const productIds = itemsToMove.map(item => item.product.id);
      
      // Use the bulk move API that handles both operations
      await wishlistService.moveMultipleToCart(productIds);
      
      // Refresh wishlist to show updated state
      await fetchWishlist();
      
      setSelectedItems(new Set());
      toast.success(`${itemsToMove.length} items moved to cart!`);
    } catch (error) {
      console.error('Failed to move selected items to cart:', error);
      toast.error('Failed to move items to cart');
    }
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
  };

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading your wishlist...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <motion.div
            className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 lg:mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex-1">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-royal-black">
                My Wishlist
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {wishlist?.items?.length ? `${wishlist.items.length} items saved for later` : 'Your wishlist is empty'}
              </p>
            </div>

          </motion.div>

          {/* Empty Wishlist */}
          {(!wishlist?.items || wishlist.items.length === 0) && (
            <motion.div
              className="text-center py-12 lg:py-16"
              {...fadeInUp}
            >
              <Heart className="h-12 lg:h-16 w-12 lg:w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="font-heading text-lg lg:text-xl font-semibold text-gray-600 mb-2">
                Your wishlist is empty
              </h3>
              <p className="text-sm lg:text-base text-gray-500 mb-6 max-w-md mx-auto">
                Save items you love for later by clicking the heart icon
              </p>
              <Link to="/products" search={{
                category: '',
                q: '',
                sortBy: 'relevance',
                minPrice: undefined,
                maxPrice: undefined,
                inStock: false,
                featured: false
              }}>
                <Button className="btn-primary">
                  <Package className="h-4 w-4 mr-2" />
                  Explore Products
                </Button>
              </Link>
            </motion.div>
          )}

          {/* Wishlist Items */}
          {wishlist?.items && wishlist.items.length > 0 && (
            <>
              {/* Bulk Actions */}
              <motion.div 
                className="flex items-center justify-between mb-6 p-4 bg-white rounded-lg shadow-sm border"
                {...fadeInUp}
              >
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === wishlist.items.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-royal-gold border-gray-300 rounded focus:ring-royal-gold"
                    />
                    <span className="text-sm text-gray-600">
                      Select All ({wishlist.items.length} items)
                    </span>
                  </label>
                  
                  {selectedItems.size > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMoveSelectedToCart}
                      >
                        <ShoppingBag className="h-4 w-4 mr-1" />
                        Move to Cart ({selectedItems.size})
                      </Button>
                    </div>
                  )}
                </div>

                <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Clear Wishlist</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to remove all items from your wishlist? This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setShowClearConfirm(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleClearWishlist}>
                        Clear Wishlist
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </motion.div>

              {/* Items Grid/List */}
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                {wishlist.items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <WishlistItemCard
                      item={item}
                      isSelected={selectedItems.has(item.id)}
                      onSelect={() => handleSelectItem(item.id)}
                      onRemove={() => handleRemoveItem(item)}
                      onAddToCart={() => handleAddToCart(item)}
                      onMoveToCart={() => handleMoveToCart(item)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Wishlist Item Card Component
const WishlistItemCard: React.FC<{
  item: WishlistItem;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onAddToCart: () => void;
  onMoveToCart: () => void;
}> = ({ item, isSelected, onSelect, onRemove, onAddToCart, onMoveToCart }) => {
  const { product } = item;

  return (
    <Card className="card-elegant group hover-lift overflow-hidden relative p-0 h-full flex flex-col">
      <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-royal-gold border-white bg-white/80 rounded focus:ring-royal-gold shadow-sm"
        />
      </div>
      
      <div className="relative">
        <div className="aspect-[3/4] overflow-hidden">
          <img
            src={product.images?.[0] ? getImageUrl(product.images[0], 'medium') : '/placeholder-product.jpg'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-product.jpg';
            }}
          />
        </div>
        {product.discount_price && (
          <Badge className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-red-500 text-white text-xs px-1 sm:px-2 py-0.5">
            {Math.round((1 - parseFloat(product.discount_price) / parseFloat(product.price)) * 100)}% OFF
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 bg-white/80 hover:bg-white p-1.5 sm:p-2"
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
        </Button>
      </div>
      
      <CardContent className="p-2 sm:p-3 lg:p-4 flex flex-col flex-grow">
        <Badge variant="secondary" className="text-xs mb-2 w-fit">
          {product.category_name}
        </Badge>
        <h3 className="font-heading text-xs sm:text-sm lg:text-base font-semibold text-royal-black mb-2 line-clamp-2 flex-grow">
          <Link to="/products/$productId" params={{ productId: product.id }} className="hover:text-royal-gold transition-colors">
            {product.name}
          </Link>
        </h3>
        
        {(product.averageRating || product.totalReviews) && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-600">
              {product.averageRating || 'N/A'} ({product.totalReviews || 0})
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-2 mb-3">
          {product.discount_price ? (
            <>
              <span className="text-sm sm:text-base lg:text-lg font-bold text-royal-black">
                ₹{parseFloat(product.discount_price).toLocaleString()}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 line-through">
                ₹{parseFloat(product.price).toLocaleString()}
              </span>
            </>
          ) : (
            <span className="text-sm sm:text-base lg:text-lg font-bold text-royal-black">
              ₹{parseFloat(product.price).toLocaleString()}
            </span>
          )}
        </div>

        <div className="space-y-1 sm:space-y-2 mt-auto">
          <Button
            className="w-full btn-primary text-xs sm:text-sm"
            size="sm"
            onClick={onMoveToCart}
            disabled={product.stock_quantity === 0}
          >
            {product.stock_quantity === 0 ? (
              'Out of Stock'
            ) : (
              <>
                <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Move to Cart</span>
                <span className="sm:hidden">Move</span>
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full text-xs sm:text-sm"
            size="sm"
            onClick={onAddToCart}
            disabled={product.stock_quantity === 0}
          >
            <span className="hidden sm:inline">Add to Cart</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Wishlist;
