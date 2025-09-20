import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  CreditCard,
  MapPin,
  Package,
  Shield,
  CheckCircle,
  Plus,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import LoadingSpinner from '../components/ui/loading';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { orderService, paymentService, userService, couponService } from '../services/api';
import type { Address, CreateOrderRequest } from '../types';
import { toast } from 'sonner';

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

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { cart, clearCart, appliedCoupon, applyCoupon, removeCoupon } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  // State
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<string>('');
  const [selectedBillingAddress, setSelectedBillingAddress] = useState<string>('');
  const [useSameAddress] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [step, setStep] = useState(1); // 1: Address, 2: Payment, 3: Review

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Address form
  const [addressForm, setAddressForm] = useState({
    type: 'shipping' as 'shipping' | 'billing',
    first_name: '',
    last_name: '',
    company: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    country: 'India',
    postal_code: '',
    phone: '',
    is_default: false,
  });

  // Redirect if not authenticated or cart is empty
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/auth/login', search: { redirect: '/checkout' } });
      return;
    }
    if (!cart?.items || cart.items.length === 0) {
      navigate({ to: '/cart' });
      return;
    }
  }, [isAuthenticated, cart, navigate]);

  // Load addresses
  const loadAddresses = async () => {
    try {
      setAddressesLoading(true);
      const userAddresses = await userService.getAddresses();
      setAddresses(userAddresses);
      
      // Auto-select default addresses
      const defaultShipping = userAddresses.find(addr => addr.type === 'shipping' && (addr.is_default || addr.isDefault));
      const defaultBilling = userAddresses.find(addr => addr.type === 'billing' && (addr.is_default || addr.isDefault));
      
      if (defaultShipping) setSelectedShippingAddress(defaultShipping.id);
      if (defaultBilling) setSelectedBillingAddress(defaultBilling.id);
      else if (defaultShipping) setSelectedBillingAddress(defaultShipping.id);
    } catch (error) {
      console.error('Failed to load addresses:', error);
      toast.error('Failed to load addresses');
    } finally {
      setAddressesLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAddresses();
    }
  }, [isAuthenticated]);

  // Calculations
  const subtotal = cart?.subtotal || 0;
  const discountAmount = appliedCoupon?.discount_amount || 0;
  const taxAmount = (subtotal - discountAmount) * 0.18; // 18% tax
  const shippingAmount = subtotal > 999 ? 0 : 99; // Free shipping above ₹999
  const total = subtotal - discountAmount + taxAmount + shippingAmount;

  // Handlers
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    try {
      setCouponLoading(true);
      const response = await couponService.validateCoupon(couponCode, subtotal);
      const couponWithDiscount = {
        ...response.coupon,
        discount_amount: response.discount_amount,
        final_amount: response.final_amount
      };
      applyCoupon(couponWithDiscount);
      toast.success(`Coupon applied! ₹${response.discount_amount?.toFixed(2)} discount`);
      setCouponCode('');
    } catch (error) {
      console.error('Failed to apply coupon:', error);
      toast.error('Invalid or expired coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    toast.success('Coupon removed');
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      if (editingAddress) {
        const updated = await userService.updateAddress(editingAddress.id, addressForm);
        setAddresses(prev => prev.map(addr => addr.id === editingAddress.id ? updated : addr));
        toast.success('Address updated successfully');
      } else {
        const newAddress = await userService.addAddress(addressForm);
        setAddresses(prev => [...prev, newAddress]);
        toast.success('Address added successfully');
      }
      
      setShowAddressDialog(false);
      setEditingAddress(null);
      resetAddressForm();
    } catch (error) {
      console.error('Failed to save address:', error);
      toast.error('Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      type: 'shipping',
      first_name: '',
      last_name: '',
      company: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      country: 'India',
      postal_code: '',
      phone: '',
      is_default: false,
    });
  };

  const handlePlaceOrder = async () => {
    if (!selectedShippingAddress) {
      toast.error('Please select a shipping address');
      return;
    }

    try {
      setLoading(true);
      
      const shippingAddress = addresses.find(addr => addr.id === selectedShippingAddress);
      const billingAddress = useSameAddress 
        ? shippingAddress 
        : addresses.find(addr => addr.id === selectedBillingAddress);

      if (!shippingAddress || (!useSameAddress && !billingAddress)) {
        toast.error('Invalid address selection');
        return;
      }

      const orderRequest: CreateOrderRequest = {
        shipping_address: {
          type: shippingAddress.type,
          first_name: shippingAddress.first_name,
          last_name: shippingAddress.last_name,
          company: shippingAddress.company,
          address_line_1: shippingAddress.address_line_1,
          address_line_2: shippingAddress.address_line_2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          country: shippingAddress.country,
          postal_code: shippingAddress.postal_code,
          phone: shippingAddress.phone,
          is_default: shippingAddress.is_default || shippingAddress.isDefault || false,
        },
        billing_address: billingAddress ? {
          type: billingAddress.type,
          first_name: billingAddress.first_name,
          last_name: billingAddress.last_name,
          company: billingAddress.company,
          address_line_1: billingAddress.address_line_1,
          address_line_2: billingAddress.address_line_2,
          city: billingAddress.city,
          state: billingAddress.state,
          country: billingAddress.country,
          postal_code: billingAddress.postal_code,
          phone: billingAddress.phone,
          is_default: billingAddress.is_default || billingAddress.isDefault || false,
        } : undefined,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon?.code,
      };

      // Create order
      const order = await orderService.createOrder(orderRequest);
      
      if (paymentMethod === 'razorpay') {
        // Create payment intent and handle Razorpay
        const paymentIntent = await paymentService.createPaymentIntent(order.order_id, total);
        
        // Initialize Razorpay payment
        const options = {
          key: paymentIntent.key_id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          order_id: paymentIntent.razorpay_order_id,
          name: 'Simri',
          description: `Order #${order.order_number}`,
          image: '/logo.png',
          handler: async (response: any) => {
            try {
              // Verify payment with backend
              await paymentService.verifyPayment({
                order_id: order.order_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              
              toast.success('Payment successful! Order placed.');
              await clearCart();
              navigate({ to: `/orders` });
            } catch (error) {
              console.error('Payment verification failed:', error);
              toast.error('Payment verification failed. Please contact support.');
            }
          },
          modal: {
            ondismiss: () => {
              toast.error('Payment cancelled');
            }
          },
          notes: {
            order_id: order.order_id,
            order_number: order.order_number,
          },
          theme: {
            color: '#667eea'
          }
        };

        // Load Razorpay script dynamically if not already loaded
        if (!window.Razorpay) {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onerror = () => {
            toast.error('Failed to load payment gateway. Please try again.');
          };
          script.onload = () => {
            const rzp = new window.Razorpay(options);
            rzp.open();
          };
          document.body.appendChild(script);
        } else {
          const rzp = new window.Razorpay(options);
          rzp.open();
        }
      } else {
        // COD or other methods
        toast.success('Order placed successfully!');
        await clearCart();
        navigate({ to: `/orders` });
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      // Error toast will be handled by axios interceptor with more detailed message
    } finally {
      setLoading(false);
    }
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
  };

  if (!isAuthenticated || !cart?.items || cart.items.length === 0) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Progress Steps */}
          <motion.div className="mb-8" {...fadeInUp}>
            <div className="flex items-center justify-center">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      step >= stepNumber
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {step > stepNumber ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      stepNumber
                    )}
                  </div>
                  {stepNumber < 3 && (
                    <div
                      className={`w-16 h-0.5 mx-2 ${
                        step > stepNumber ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-2">
              <div className="grid grid-cols-3 gap-8 text-sm text-center">
                <span className={step >= 1 ? 'text-purple-600 font-medium' : 'text-gray-500'}>
                  Address
                </span>
                <span className={step >= 2 ? 'text-purple-600 font-medium' : 'text-gray-500'}>
                  Payment
                </span>
                <span className={step >= 3 ? 'text-purple-600 font-medium' : 'text-gray-500'}>
                  Review
                </span>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Step 1: Address Selection */}
              {step === 1 && (
                <motion.div {...fadeInUp}>
                  <Card className="card-elegant">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Delivery Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {addressesLoading ? (
                        <div className="flex justify-center py-8">
                          <LoadingSpinner size="md" />
                        </div>
                      ) : addresses.length === 0 ? (
                        <div className="text-center py-8">
                          <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-600 mb-4">No addresses found</p>
                          <Button onClick={() => setShowAddressDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Address
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3">
                            {addresses.filter(addr => addr.type === 'shipping').map((address) => (
                              <Label
                                key={address.id}
                                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:border-purple-300 ${
                                  selectedShippingAddress === address.id
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="shippingAddress"
                                  value={address.id}
                                  checked={selectedShippingAddress === address.id}
                                  onChange={(e) => setSelectedShippingAddress(e.target.value)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{address.first_name} {address.last_name}</span>
                                    {(address.is_default || address.isDefault) && (
                                      <Badge variant="outline">Default</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    {address.address_line_1}, {address.city}, {address.state} {address.postal_code}
                                  </p>
                                  {address.phone && (
                                    <p className="text-sm text-gray-600">{address.phone}</p>
                                  )}
                                </div>
                              </Label>
                            ))}
                          </div>
                          
                          <Button
                            variant="outline"
                            onClick={() => setShowAddressDialog(true)}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Address
                          </Button>

                          <div className="flex justify-end pt-4">
                            <Button
                              onClick={() => setStep(2)}
                              disabled={!selectedShippingAddress}
                              className="btn-primary"
                            >
                              Continue to Payment
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 2: Payment Method */}
              {step === 2 && (
                <motion.div {...fadeInUp}>
                  <Card className="card-elegant">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment Method
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                        <div className="space-y-3">
                          <Label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:border-purple-300">
                            <RadioGroupItem value="razorpay" id="razorpay" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                <span className="font-medium">Credit/Debit Card & UPI</span>
                                <Badge variant="secondary">Recommended</Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Pay securely using Razorpay
                              </p>
                            </div>
                          </Label>
                          
                          <Label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:border-purple-300">
                            <RadioGroupItem value="cod" id="cod" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                <span className="font-medium">Cash on Delivery</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Pay when you receive your order
                              </p>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>

                      <div className="flex items-center gap-2 pt-4">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-600">
                          Your payment information is secure and encrypted
                        </span>
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setStep(1)}
                        >
                          Back to Address
                        </Button>
                        <Button
                          onClick={() => setStep(3)}
                          className="btn-primary"
                        >
                          Review Order
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 3: Order Review */}
              {step === 3 && (
                <motion.div {...fadeInUp}>
                  <Card className="card-elegant">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Review Your Order
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Order Items */}
                      <div>
                        <h4 className="font-medium mb-3">Items ({cart.items.length})</h4>
                        <div className="space-y-3">
                          {cart.items.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              <img
                                src={(item.images && item.images.length > 0) ? getImageUrl(item.images[0], 'thumb') : '/placeholder-product.jpg'}
                                alt={item.name}
                                className="w-12 h-12 object-cover rounded"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-product.jpg';
                                }}
                              />
                              <div className="flex-1">
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                              </div>
                              <span className="font-medium">
                                ₹{(item.quantity * item.price_at_time).toLocaleString()}
                              </span>
                            </div>
                          ))}
                          {cart.items.length > 3 && (
                            <p className="text-sm text-gray-600">
                              +{cart.items.length - 3} more items
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Delivery Address */}
                      <div>
                        <h4 className="font-medium mb-2">Delivery Address</h4>
                        {(() => {
                          const address = addresses.find(addr => addr.id === selectedShippingAddress);
                          return address ? (
                            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                              <p className="font-medium">{address.first_name} {address.last_name}</p>
                              <p>{address.address_line_1}</p>
                              <p>{address.city}, {address.state} {address.postal_code}</p>
                              {address.phone && <p>{address.phone}</p>}
                            </div>
                          ) : null;
                        })()}
                      </div>

                      {/* Payment Method */}
                      <div>
                        <h4 className="font-medium mb-2">Payment Method</h4>
                        <p className="text-sm text-gray-600">
                          {paymentMethod === 'razorpay' ? 'Credit/Debit Card & UPI' : 'Cash on Delivery'}
                        </p>
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setStep(2)}
                        >
                          Back to Payment
                        </Button>
                        <Button
                          onClick={handlePlaceOrder}
                          disabled={loading}
                          className="btn-primary"
                        >
                          {loading ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              Place Order
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="space-y-6">
              {/* Coupon Code */}
              <motion.div {...fadeInUp}>
                <Card className="card-elegant">
                  <CardHeader>
                    <CardTitle className="text-base">Coupon Code</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-md border border-green-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-800">
                            {appliedCoupon.code}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveCoupon}
                          className="text-green-600 hover:text-green-700"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleApplyCoupon} className="flex gap-2">
                        <Input
                          placeholder="Enter coupon code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          type="submit" 
                          disabled={couponLoading || !couponCode.trim()}
                          size="sm"
                        >
                          {couponLoading ? 'Applying...' : 'Apply'}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Order Summary */}
              <motion.div {...fadeInUp}>
                <Card className="card-elegant">
                  <CardHeader>
                    <CardTitle className="text-base">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal ({cart.item_count || cart.itemCount} items)</span>
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
                    
                    <hr className="my-2" />
                    
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-charcoal">₹{total.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* Address Dialog */}
          <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddressSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <select
                      value={addressForm.type}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, type: e.target.value as 'shipping' | 'billing' }))}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="shipping">Shipping</option>
                      <option value="billing">Billing</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name</label>
                    <Input
                      value={addressForm.first_name}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, first_name: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input
                    value={addressForm.last_name}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, last_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company (Optional)</label>
                  <Input
                    value={addressForm.company}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, company: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address Line 1</label>
                  <Input
                    value={addressForm.address_line_1}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, address_line_1: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address Line 2 (Optional)</label>
                  <Input
                    value={addressForm.address_line_2}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, address_line_2: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <Input
                      value={addressForm.city}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">State</label>
                    <Input
                      value={addressForm.state}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Postal Code</label>
                    <Input
                      value={addressForm.postal_code}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, postal_code: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button type="button" variant="ghost" onClick={() => setShowAddressDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="btn-primary">
                    {editingAddress ? 'Update' : 'Add'} Address
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default Checkout;