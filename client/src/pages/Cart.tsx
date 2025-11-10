import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Heart,
  Tag,
  CreditCard,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
import { CouponValidation } from '../components/ui/coupon';
import { useCartStore } from '../stores/cartStore';
import { useWishlistStore } from '../stores/wishlistStore';
import { useAuthStore } from '../stores/authStore';
import type { Coupon } from '../types';
// import { toast } from 'sonner';

// Helper function to extract image URL from Cloudinary object or use string directly
const getImageUrl = (imageData: any, size: 'thumb' | 'medium' | 'large' | 'original' = 'thumb') => {
  if (typeof imageData === 'string') {
    return imageData; // Legacy string format
  }
  if (typeof imageData === 'object' && imageData) {
    return imageData[size] || imageData.original || imageData.large || imageData.medium || imageData.thumb;
  }
  return '/placeholder-product.jpg';
};

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { cart, updateItem, removeItem, clearCart, isLoading, fetchCart, appliedCoupon, applyCoupon, removeCoupon } = useCartStore();
  const { addItem: addToWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();

  // State
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/auth/login', search: { redirect: '/cart' } });
      return;
    }
    fetchCart();
  }, [isAuthenticated, navigate, fetchCart]);


  // Handlers
  const handleQuantityUpdate = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    try {
      await updateItem(itemId, newQuantity);
      // toast.success('Cart updated');
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem(itemId);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const handleMoveToWishlist = async (itemId: string, productId: string, _productName: string) => {
    try {
      await addToWishlist(productId);
      await removeItem(itemId);
    } catch (error) {
      console.error('Failed to move to wishlist:', error);
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart(); // This now clears both cart and coupon
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Failed to clear cart:', error);
    }
  };

  const handleCouponApplied = (coupon: Coupon) => {
    console.log('Cart received coupon:', coupon); // Debug log
    applyCoupon(coupon);
  };

  const handleCouponRemoved = () => {
    removeCoupon();
  };

  // Calculations
  const subtotal = cart?.subtotal || 0;
  const discountAmount = appliedCoupon?.discount_amount || 0;
  const taxAmount = (subtotal - discountAmount) * 0.18; // 18% tax
  const shippingAmount = subtotal > 999 ? 0 : 99; // Free shipping above ₹999
  const total = subtotal - discountAmount + taxAmount + shippingAmount;

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
        <span className="ml-3 text-gray-600">Loading your cart...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">

           <motion.div 
            className="flex items-center gap-4 mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex-1">
              <h1 className="font-heading text-3xl font-bold text-royal-black">
                Shopping Cart
              </h1>
              <p className="text-gray-600 mt-1">
                {(cart?.item_count || cart?.itemCount) ? `${cart.item_count || cart.itemCount} items in your cart` : 'Your cart is empty'}
              </p>
            </div>
          </motion.div> 
          

          {/* Empty Cart */}
          {(!cart?.items || cart.items.length === 0) && (
            <motion.div 
              className="text-center py-16"
              {...fadeInUp}
            >
              <ShoppingBag className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="font-heading text-xl font-semibold text-gray-600 mb-2">
                Your cart is empty
              </h3>
              <p className="text-gray-500 mb-6">
                Start shopping to add items to your cart
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
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Start Shopping
                </Button>
              </Link>
            </motion.div>
          )}

          {/* Cart Items */}
          {cart?.items && cart.items.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Items List */}
              <div className="lg:col-span-2 space-y-4">
                <motion.div 
                  className="flex items-center justify-between mb-4"
                  {...fadeInUp}
                >
                  <h2 className="font-heading text-xl font-semibold">
                    Cart Items ({cart?.item_count || cart?.itemCount || 0})
                  </h2>
                  <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Clear Cart
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Clear Cart</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to remove all items from your cart? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowClearConfirm(false)}>
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleClearCart}>
                          Clear Cart
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </motion.div>

                {cart.items?.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="card-elegant">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Product Image */}
                          <div className="flex-shrink-0 w-20 sm:w-24">
                            <div className="aspect-[3/4] overflow-hidden rounded-md">
                              <img
                              src={(item.images && item.images.length > 0) 
                                ? getImageUrl(item.images[0], 'thumb')
                                : '/placeholder-product.jpg'}
                              alt={item.name || 'Product'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-product.jpg';
                                }}
                              />
                            </div>
                          </div>

                          {/* Product Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-heading text-base font-semibold text-royal-black truncate">
                                  {item.name || 'Unknown Product'}
                                </h3>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Quantity and Price */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuantityUpdate(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1 || isLoading}
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center font-medium">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuantityUpdate(item.id, item.quantity + 1)}
                                  disabled={isLoading || item.quantity >= (item.stock_quantity || 0)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>

                              <div className="text-right">
                                <div className="font-bold text-royal-black">
                                  ₹{(item.price_at_time * item.quantity).toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-500">
                                  ₹{item.price_at_time} each
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveToWishlist(item.id, item.product_id, item.name)}
                                className="text-sm"
                              >
                                <Heart className="h-3 w-3 mr-1" />
                                Move to Wishlist
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="space-y-6">
                
                {/* Coupon Code */}
                <motion.div {...fadeInUp}>
                  <Card className="card-elegant">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Tag className="h-4 w-4" />
                        Coupon Code
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CouponValidation
                        orderAmount={subtotal}
                        onCouponApplied={handleCouponApplied}
                        onCouponRemoved={handleCouponRemoved}
                        appliedCoupon={appliedCoupon}
                      />
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Order Summary */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <Card className="card-elegant">
                    <CardHeader>
                      <CardTitle className="text-base">Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>₹{subtotal.toLocaleString()}</span>
                      </div>
                      
                      {appliedCoupon && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount ({appliedCoupon.code})</span>
                          <span>-₹{discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-sm">
                        <span>Tax (GST 18%)</span>
                        <span>₹{taxAmount.toLocaleString()}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span>Shipping</span>
                        <span>
                          {shippingAmount === 0 ? (
                            <span className="text-green-600">Free</span>
                          ) : (
                            `₹${shippingAmount}`
                          )}
                        </span>
                      </div>
                      
                      {subtotal < 999 && shippingAmount > 0 && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                          Add ₹{(999 - subtotal).toLocaleString()} more for free shipping!
                        </div>
                      )}
                      
                      <hr className="my-2" />
                      
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-royal-black">₹{total.toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Checkout Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <Button 
                    className="w-full btn-primary py-3" 
                    size="lg"
                    onClick={() => navigate({ to: '/checkout' })}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Proceed to Checkout
                  </Button>
                  
                  <p className="text-center text-xs text-gray-500 mt-2">
                    Secure checkout with 256-bit SSL encryption
                  </p>
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;
