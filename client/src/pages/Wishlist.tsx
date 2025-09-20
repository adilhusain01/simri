import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  Heart,
  ShoppingBag,
  Trash2,
  Grid,
  List,
  Star,
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <motion.div 
            className="flex items-center gap-4 mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex-1">
              <h1 className="font-heading text-3xl font-bold text-charcoal">
                My Wishlist
              </h1>
              <p className="text-gray-600 mt-1">
                {wishlist?.items?.length ? `${wishlist.items.length} items saved for later` : 'Your wishlist is empty'}
              </p>
            </div>
            
            {wishlist?.items && wishlist.items.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}
          </motion.div>

          {/* Empty Wishlist */}
          {(!wishlist?.items || wishlist.items.length === 0) && (
            <motion.div 
              className="text-center py-16"
              {...fadeInUp}
            >
              <Heart className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="font-heading text-xl font-semibold text-gray-600 mb-2">
                Your wishlist is empty
              </h3>
              <p className="text-gray-500 mb-6">
                Save items you love for later by clicking the heart icon
              </p>
              <Link to="/products">
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
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
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
                className={viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                  : "space-y-4"
                }
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
                      viewMode={viewMode}
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
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onAddToCart: () => void;
  onMoveToCart: () => void;
}> = ({ item, viewMode, isSelected, onSelect, onRemove, onAddToCart, onMoveToCart }) => {
  const { product } = item;

  if (viewMode === 'list') {
    return (
      <Card className="card-elegant overflow-hidden">
        <div className="flex">
          <div className="flex-shrink-0 w-4 flex items-center justify-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
          </div>
          <div className="flex-shrink-0 w-48 h-32 ml-4">
            <img
              src={(product.images && product.images.length > 0) 
                ? getImageUrl(product.images[0], 'medium')
                : product.imageUrl || '/placeholder-product.jpg'}
              alt={product.name}
              className="w-full h-full object-cover rounded-md"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-product.jpg';
              }}
            />
          </div>
          <CardContent className="flex-1 p-6">
            <div className="flex justify-between h-full">
              <div className="flex-1">
                <h3 className="font-heading text-lg font-semibold text-charcoal mb-2">
                  {product.name}
                </h3>
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-gray-600 ml-1">
                      {product.averageRating || 'N/A'} ({product.totalReviews || 0})
                    </span>
                  </div>
                  <Badge variant="secondary">{product.category_name}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  {product.discount_price ? (
                    <>
                      <span className="text-lg font-bold text-charcoal">
                        ₹{parseFloat(product.discount_price).toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500 line-through">
                        ₹{parseFloat(product.price).toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-charcoal">
                      ₹{parseFloat(product.price).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={onMoveToCart}
                    disabled={product.stock_quantity === 0}
                    className="btn-primary"
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Move to Cart
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddToCart}
                    disabled={product.stock_quantity === 0}
                  >
                    Add to Cart
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRemove}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    );
  }

  return (
    <Card className="card-elegant group hover-lift overflow-hidden relative">
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 text-purple-600 border-white bg-white/80 rounded focus:ring-purple-500 shadow-sm"
        />
      </div>
      
      <div className="relative">
        <div className="aspect-square overflow-hidden">
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
          <Badge className="absolute top-2 right-2 bg-red-500 text-white">
            {Math.round((1 - parseFloat(product.discount_price) / parseFloat(product.price)) * 100)}% OFF
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="absolute bottom-2 right-2 bg-white/80 hover:bg-white"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </div>
      
      <CardContent className="p-4">
        <Badge variant="secondary" className="text-xs mb-2">
          {product.category_name}
        </Badge>
        <h3 className="font-heading text-base font-semibold text-charcoal mb-2 line-clamp-2">
          {product.name}
        </h3>
        
        {(product.averageRating || product.totalReviews) && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-600">
              {product.averageRating || 'N/A'} ({product.totalReviews || 0})
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          {product.discount_price ? (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-charcoal">
                ₹{parseFloat(product.discount_price).toLocaleString()}
              </span>
              <span className="text-sm text-gray-500 line-through">
                ₹{parseFloat(product.price).toLocaleString()}
              </span>
            </div>
          ) : (
            <span className="text-lg font-bold text-charcoal">
              ₹{parseFloat(product.price).toLocaleString()}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <Button
            className="w-full btn-primary"
            size="sm"
            onClick={onMoveToCart}
            disabled={product.stock_quantity === 0}
          >
            {product.stock_quantity === 0 ? (
              'Out of Stock'
            ) : (
              <>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Move to Cart
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            size="sm"
            onClick={onAddToCart}
            disabled={product.stock_quantity === 0}
          >
            Add to Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Wishlist;
