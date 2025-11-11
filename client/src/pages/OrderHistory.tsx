import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  Package,
  Calendar,
  MapPin,
  CreditCard,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  Download,
  AlertTriangle,
  MapIcon,
  RefreshCw,
  Ban,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import LoadingSpinner from '../components/ui/loading';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { useAuthStore } from '../stores/authStore';
import { orderService } from '../services/api';
import type { Order } from '../types';
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

const OrderHistory: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<string>('DESC');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<any>(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/auth/login', search: { redirect: '/orders' } });
      return;
    }
  }, [isAuthenticated, navigate]);

  // Load orders
  const loadOrders = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await orderService.getOrders({ 
        page, 
        limit: pagination.limit,
        sortBy,
        sortOrder
      });
      setOrders(response.data.orders);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    }
  }, [isAuthenticated, sortBy, sortOrder]);

  // Filter orders based on search and status
  const filteredOrders = (orders || []).filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.items?.some(item => item.product.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get status color and icon
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case 'confirmed':
      case 'processing':
        return { color: 'bg-blue-100 text-blue-800', icon: Package };
      case 'shipped':
        return { color: 'bg-royal-gold text-royal-black', icon: Truck };
      case 'delivered':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'cancelled':
        return { color: 'bg-red-100 text-red-800', icon: XCircle };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: Clock };
    }
  };

  // Get shipping status color and text
  const getShippingStatusConfig = (shippingStatus?: string) => {
    switch (shippingStatus?.toLowerCase()) {
      case 'not_shipped':
        return { color: 'bg-gray-100 text-gray-800', text: 'Not Shipped' };
      case 'processing':
        return { color: 'bg-blue-100 text-blue-800', text: 'Processing' };
      case 'shipped':
        return { color: 'bg-royal-gold text-royal-black', text: 'Shipped' };
      case 'in_transit':
        return { color: 'bg-orange-100 text-orange-800', text: 'In Transit' };
      case 'delivered':
        return { color: 'bg-green-100 text-green-800', text: 'Delivered' };
      default:
        return { color: 'bg-gray-100 text-gray-800', text: 'Unknown' };
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadOrders(newPage);
    }
  };

  // Cancel order function
  const handleCancelOrder = async () => {
    if (!cancelOrder || !cancellationReason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    try {
      setCancelling(true);
      await orderService.cancelOrder(cancelOrder.id, cancellationReason);
      toast.success('Order cancelled successfully');
      
      // Refresh orders list
      loadOrders(pagination.page);
      
      // Reset states
      setCancelOrder(null);
      setCancellationReason('');
    } catch (error) {
      console.error('Failed to cancel order:', error);
      toast.error('Failed to cancel order. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  // Load tracking information
  const handleTrackOrder = async (order: Order) => {
    setTrackingOrder(order);
    setLoadingTracking(true);
    
    try {
      const tracking = await orderService.getOrderTracking(order.id);
      setTrackingInfo(tracking);
    } catch (error) {
      console.error('Failed to load tracking info:', error);
      toast.error('Failed to load tracking information');
      setTrackingInfo(null);
    } finally {
      setLoadingTracking(false);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <motion.div
            className="flex items-center gap-4 mb-6 lg:mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex-1">
              <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold text-royal-black">
                Order History
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Track and manage your orders
              </p>
            </div>
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4"
            {...fadeInUp}
          >
            <div className="flex-1 relative">
              <Search className="h-3 w-3 sm:h-4 sm:w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by order number or product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 text-sm sm:text-base"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              {/* Sort By Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 text-xs sm:text-sm">
                    <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Sort:</span>
                    {sortBy === 'created_at' ? 'Date' : sortBy === 'total_amount' ? 'Amount' : sortBy === 'status' ? 'Status' : 'Date'} ({sortOrder === 'DESC' ? '↓' : '↑'})
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => { setSortBy('created_at'); setSortOrder('DESC'); }}>
                  Date (Newest First)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('created_at'); setSortOrder('ASC'); }}>
                  Date (Oldest First)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('total_amount'); setSortOrder('DESC'); }}>
                  Amount (Highest First)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('total_amount'); setSortOrder('ASC'); }}>
                  Amount (Lowest First)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('order_number'); setSortOrder('DESC'); }}>
                  Order Number (Newest First)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('order_number'); setSortOrder('ASC'); }}>
                  Order Number (Oldest First)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('status'); setSortOrder('ASC'); }}>
                  Status (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('status'); setSortOrder('DESC'); }}>
                  Status (Z-A)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

              {/* Status Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 text-xs sm:text-sm">
                    <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Status:</span>
                    {statusFilter === 'all' ? 'All' : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                  All Orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('pending')}>
                  Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('confirmed')}>
                  Confirmed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('shipped')}>
                  Shipped
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('delivered')}>
                  Delivered
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>
                  Cancelled
                </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600">Loading your orders...</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredOrders.length === 0 && (
            <motion.div 
              className="text-center py-16"
              {...fadeInUp}
            >
              <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="font-heading text-xl font-semibold text-gray-600 mb-2">
                {searchQuery || statusFilter !== 'all' ? 'No matching orders' : 'No orders yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Start shopping to create your first order'
                }
              </p>
              {!searchQuery && statusFilter === 'all' && (
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
                    Start Shopping
                  </Button>
                </Link>
              )}
            </motion.div>
          )}

          {/* Orders List */}
          {!loading && filteredOrders.length > 0 && (
            <>
              <div className="space-y-3 sm:space-y-4">
                {filteredOrders.map((order, index) => {
                  const statusConfig = getStatusConfig(order.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="card-elegant hover:shadow-md transition-shadow">
                        <CardContent className="p-3 sm:p-4 lg:p-6">
                          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                            
                            {/* Order Info */}
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-heading text-sm sm:text-base lg:text-lg font-semibold text-royal-black truncate">
                                    Order #{order.orderNumber}
                                  </h3>
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600 mt-1">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3 flex-shrink-0" />
                                      <span>{formatDate(order.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <CreditCard className="h-3 w-3 flex-shrink-0" />
                                      <span>₹{order.totalAmount.toLocaleString()}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Payment, Shipping and Refund Status */}
                                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-2">
                                    <Badge
                                      className={`text-xs ${order.paymentStatus === 'paid'
                                        ? 'bg-green-100 text-green-800'
                                        : order.paymentStatus === 'failed'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                      }`}
                                    >
                                      Payment: {order.paymentStatus}
                                    </Badge>
                                    
                                    {/* Shipping Status */}
                                    {order.shippingStatus && (
                                      <Badge className={`text-xs ${getShippingStatusConfig(order.shippingStatus).color}`}>
                                        <Truck className="h-3 w-3 mr-1" />
                                        {getShippingStatusConfig(order.shippingStatus).text}
                                      </Badge>
                                    )}

                                    {/* Courier Info */}
                                    {order.courierName && (
                                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                                        📦 {order.courierName}
                                      </Badge>
                                    )}
                                    
                                    {/* Refund Status */}
                                    {order.status === 'cancelled' && order.refundStatus && order.refundStatus !== 'none' && (
                                      <Badge
                                        className={`text-xs ${order.refundStatus === 'completed'
                                          ? 'bg-green-100 text-green-800'
                                          : order.refundStatus === 'pending'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : order.refundStatus === 'failed'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-blue-100 text-blue-800'
                                        }`}
                                      >
                                        Refund: {order.refundStatus}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <Badge className={`${statusConfig.color} text-xs self-start sm:self-center`}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {order.status}
                                </Badge>
                              </div>

                              {/* Order Items Preview */}
                              <div className="mb-3 sm:mb-4">
                                <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                  Items ({order.items.length})
                                </h4>
                                <div className="flex flex-wrap gap-1 sm:gap-2">
                                  {order.items.slice(0, 3).map((item) => (
                                    <div key={item.id} className="flex items-center gap-1 sm:gap-2 text-xs bg-gray-50 px-1.5 sm:px-2 py-1 rounded">
                                      <img
                                        src={item.product.images?.[0]
                                          ? getImageUrl(item.product.images[0], 'thumb')
                                          : item.product.imageUrl || '/placeholder-product.jpg'
                                        }
                                        alt={item.product.name}
                                        className="w-5 h-5 sm:w-6 sm:h-6 object-cover rounded"
                                        onError={(e) => {
                                          e.currentTarget.src = '/placeholder-product.jpg';
                                        }}
                                      />
                                      <span className="truncate max-w-16 sm:max-w-24 text-xs">
                                        {item.product.name}
                                      </span>
                                      <span className="text-gray-500 text-xs flex-shrink-0">
                                        ×{item.quantity}
                                      </span>
                                    </div>
                                  ))}
                                  {order.items.length > 3 && (
                                    <span className="text-xs text-gray-500 px-1.5 sm:px-2 py-1">
                                      +{order.items.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Shipping Address */}
                              {order.shippingAddress && (
                                <div className="text-xs sm:text-sm text-gray-600">
                                  <div className="flex items-center gap-1 mb-1">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    <span className="font-medium">Shipping to:</span>
                                  </div>
                                  <p className="text-xs ml-4 line-clamp-2">
                                    {order.shippingAddress.first_name} {order.shippingAddress.last_name}, {order.shippingAddress.address_line_1}, {order.shippingAddress.city}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 mt-3 lg:mt-0 min-h-0">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedOrder(order)}
                                    className="flex-1 lg:flex-none text-xs sm:text-sm py-3 sm:py-2"
                                  >
                                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                    <span className="hidden sm:inline">View Details</span>
                                    <span className="sm:hidden">Details</span>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-sm sm:max-w-2xl max-h-[80vh] overflow-y-auto mx-4">
                                  <DialogHeader>
                                    <DialogTitle className="text-base sm:text-lg">Order Details</DialogTitle>
                                  </DialogHeader>
                                  {selectedOrder && (
                                    <div className="space-y-3 sm:space-y-4">
                                      {/* Order Summary */}
                                      <div className="border-b pb-3 sm:pb-4">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0 mb-2">
                                          <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-sm sm:text-base truncate">Order #{selectedOrder.orderNumber}</h3>
                                            <p className="text-xs sm:text-sm text-gray-600">
                                              Placed on {formatDate(selectedOrder.createdAt)}
                                            </p>
                                          </div>
                                          <Badge className={`${getStatusConfig(selectedOrder.status).color} text-xs self-start sm:self-center flex-shrink-0`}>
                                            {selectedOrder.status}
                                          </Badge>
                                        </div>
                                      </div>

                                      {/* Items */}
                                      <div>
                                        <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base">Items</h4>
                                        <div className="space-y-2">
                                          {selectedOrder.items.map((item) => (
                                            <div key={item.id} className="flex items-center gap-2 sm:gap-3 p-2 border rounded">
                                              <img
                                                src={item.product.imageUrl}
                                                alt={item.product.name}
                                                className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded flex-shrink-0"
                                                onError={(e) => {
                                                  e.currentTarget.src = '/placeholder-product.jpg';
                                                }}
                                              />
                                              <div className="flex-1 min-w-0">
                                                <p className="font-medium text-xs sm:text-sm line-clamp-2">{item.product.name}</p>
                                                <p className="text-xs text-gray-600">
                                                  Qty: {item.quantity} × ₹{item.priceAtTime}
                                                </p>
                                              </div>
                                              <div className="text-right flex-shrink-0">
                                                <p className="font-medium text-xs sm:text-sm">
                                                  ₹{(item.quantity * item.priceAtTime).toLocaleString()}
                                                </p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Order Total */}
                                      <div className="border-t pt-3 sm:pt-4">
                                        <div className="flex justify-between items-center font-bold text-base sm:text-lg">
                                          <span>Total</span>
                                          <span>₹{selectedOrder.totalAmount.toLocaleString()}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>

                              {/* Track Order Button */}
                              {(order.status === 'shipped' || order.status === 'delivered') && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 lg:flex-none text-xs sm:text-sm py-3 sm:py-2"
                                      onClick={() => handleTrackOrder(order)}
                                    >
                                      <MapIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                      Track
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-sm sm:max-w-md mx-4">
                                    <DialogHeader>
                                      <DialogTitle>Order Tracking</DialogTitle>
                                    </DialogHeader>
                                    {trackingOrder && (
                                      <div className="space-y-4">
                                        <div className="text-center">
                                          <h3 className="font-semibold">Order #{trackingOrder.orderNumber}</h3>
                                          <Badge className={getStatusConfig(trackingOrder.status).color}>
                                            {trackingOrder.status}
                                          </Badge>
                                        </div>

                                        {loadingTracking ? (
                                          <div className="flex items-center justify-center py-8">
                                            <LoadingSpinner size="sm" />
                                            <span className="ml-2">Loading tracking info...</span>
                                          </div>
                                        ) : trackingInfo ? (
                                          <div className="space-y-3">
                                            {/* Shipping Status */}
                                            {trackingInfo.shipping_status && (
                                              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                                <p className="text-sm font-medium">Current Status</p>
                                                <Badge className={getShippingStatusConfig(trackingInfo.shipping_status).color}>
                                                  {getShippingStatusConfig(trackingInfo.shipping_status).text}
                                                </Badge>
                                              </div>
                                            )}
                                            
                                            {/* Tracking Number & AWB */}
                                            <div className="grid grid-cols-1 gap-3">
                                              {trackingInfo.tracking_number && (
                                                <div className="bg-gray-50 p-3 rounded">
                                                  <p className="text-sm font-medium">Tracking Number</p>
                                                  <p className="text-xs text-gray-600 font-mono">{trackingInfo.tracking_number}</p>
                                                </div>
                                              )}
                                              {trackingInfo.awb_number && (
                                                <div className="bg-gray-50 p-3 rounded">
                                                  <p className="text-sm font-medium">AWB Number</p>
                                                  <p className="text-xs text-gray-600 font-mono">{trackingInfo.awb_number}</p>
                                                </div>
                                              )}
                                            </div>
                                            
                                            {/* Courier Information */}
                                            {trackingInfo.courier_name && (
                                              <div className="bg-gray-50 p-3 rounded">
                                                <p className="text-sm font-medium">Courier Partner</p>
                                                <p className="text-xs text-gray-600">📦 {trackingInfo.courier_name}</p>
                                              </div>
                                            )}
                                            
                                            {/* Timeline */}
                                            <div className="space-y-2">
                                              {trackingInfo.shipped_at && (
                                                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                                  <p className="text-sm font-medium text-royal-black">🚚 Shipped</p>
                                                  <p className="text-xs text-gray-600">{formatDate(trackingInfo.shipped_at)}</p>
                                                </div>
                                              )}
                                              {trackingInfo.delivered_at && (
                                                <div className="bg-green-50 p-3 rounded border border-green-200">
                                                  <p className="text-sm font-medium text-green-800">✅ Delivered</p>
                                                  <p className="text-xs text-green-600">{formatDate(trackingInfo.delivered_at)}</p>
                                                </div>
                                              )}
                                            </div>
                                            
                                            {/* Live Tracking from Shiprocket */}
                                            {trackingInfo.tracking_info && (
                                              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                                <p className="text-sm font-medium">Live Status</p>
                                                <p className="text-xs text-gray-600">
                                                  {trackingInfo.tracking_info.status || 'In transit'}
                                                </p>
                                                {trackingInfo.tracking_info.location && (
                                                  <p className="text-xs text-gray-500 mt-1">
                                                    📍 {trackingInfo.tracking_info.location}
                                                  </p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="text-center py-4">
                                            <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                                            <p className="text-sm text-gray-600">
                                              Tracking information not available yet
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                              Check back once your order has been shipped
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                              )}

                              {/* Cancel Order Button */}
                              {['pending', 'confirmed', 'processing', 'shipped'].includes(order.status) && 
                               order.status !== 'delivered' && order.status !== 'cancelled' && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 lg:flex-none text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm py-3 sm:py-2"
                                      onClick={() => setCancelOrder(order)}
                                    >
                                      <Ban className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                      Cancel
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-sm sm:max-w-md mx-4">
                                    <DialogHeader>
                                      <DialogTitle>Cancel Order</DialogTitle>
                                    </DialogHeader>
                                    {cancelOrder && (
                                      <div className="space-y-4">
                                        <div className="bg-red-50 p-4 rounded border border-red-200">
                                          <div className="flex items-start gap-3">
                                            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                                            <div>
                                              <h4 className="font-medium text-red-900">Cancel Order #{cancelOrder.orderNumber}?</h4>
                                              <p className="text-sm text-red-700 mt-1">
                                                {cancelOrder.status === 'shipped' || cancelOrder.shippingStatus === 'shipped' ? 
                                                  'This will initiate a return pickup from your address. Once the package is returned to our warehouse, your refund will be processed.' :
                                                  'This action cannot be undone. If payment was made, a refund will be processed immediately.'
                                                }
                                              </p>
                                            </div>
                                          </div>
                                        </div>

                                        <div>
                                          <label htmlFor="cancellation-reason" className="block text-sm font-medium text-gray-700 mb-2">
                                            Reason for Cancellation *
                                          </label>
                                          <Textarea
                                            id="cancellation-reason"
                                            placeholder="Please provide a reason for cancelling this order..."
                                            value={cancellationReason}
                                            onChange={(e) => setCancellationReason(e.target.value)}
                                            rows={3}
                                            className="w-full"
                                          />
                                        </div>

                                        <div className="flex gap-3">
                                          <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => {
                                              setCancelOrder(null);
                                              setCancellationReason('');
                                            }}
                                          >
                                            Keep Order
                                          </Button>
                                          <Button
                                            variant="destructive"
                                            className="flex-1"
                                            onClick={handleCancelOrder}
                                            disabled={cancelling || !cancellationReason.trim()}
                                          >
                                            {cancelling ? (
                                              <>
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                Cancelling...
                                              </>
                                            ) : (
                                              <>
                                                <Ban className="h-4 w-4 mr-2" />
                                                Cancel Order
                                              </>
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                              )}

                              {order.status === 'delivered' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 lg:flex-none text-xs sm:text-sm py-3 sm:py-2"
                                  onClick={() => toast.success('Invoice download feature coming soon!')}
                                >
                                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                  <span className="hidden sm:inline">Invoice</span>
                                  <span className="sm:hidden">PDF</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <motion.div 
                  className="flex justify-center items-center gap-2 mt-8"
                  {...fadeInUp}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNumber;
                      if (pagination.totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNumber = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNumber = pagination.totalPages - 4 + i;
                      } else {
                        pageNumber = pagination.page - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNumber}
                          variant={pagination.page === pageNumber ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNumber)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNumber}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderHistory;