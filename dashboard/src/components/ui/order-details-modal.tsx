import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Package,
  Truck,
  MapPin,
  CreditCard,
  User,
  Printer,
  Mail,
  CheckCircle,
  Clock,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from './button';
import { Badge } from './badge';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Textarea } from './textarea';
import { formatCurrency, formatDate } from '@/lib/utils';
import { adminService } from '@/services/api';
import type { Order, OrderItem } from '@/types';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (orderId: string, status: string, notes?: string) => void;
  onRefund?: (orderId: string, amount: number) => void;
}

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'processing', label: 'Processing', color: 'bg-royal-gold/20 text-royal-black' },
  { value: 'shipped', label: 'Shipped', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

const getStatusBadge = (status: string) => {
  const statusConfig = ORDER_STATUSES.find(s => s.value === status);
  return (
    <Badge className={`${statusConfig?.color || 'bg-gray-100 text-gray-800'} border`}>
      {statusConfig?.label || status}
    </Badge>
  );
};

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  onStatusUpdate,
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState(order?.status || '');
  const [statusNotes, setStatusNotes] = useState('');
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);

  // Fetch detailed order data when modal opens
  const { data: detailedOrder, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['order-details', order?.id],
    queryFn: () => order ? adminService.getOrderDetails(order.id) : null,
    enabled: !!order && isOpen,
  });

  // Use detailed order data if available, fall back to basic order data
  const currentOrder = detailedOrder || order;
  const orderItems: OrderItem[] = currentOrder?.items || [];

  if (!order) return null;

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === order.status) {
      toast.error('Please select a different status');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await onStatusUpdate?.(order.id, newStatus, statusNotes);
      setShowStatusUpdate(false);
      setStatusNotes('');
      toast.success('Order status updated successfully');
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handlePrintInvoice = () => {
    toast.info('Printing invoice...');
    // Implement print functionality
  };

  const handleEmailCustomer = () => {
    toast.info('Opening email client...');
    // Implement email functionality
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">
                Order #{order.order_number}
              </DialogTitle>
              <DialogDescription>
                Placed on {formatDate(order.created_at)}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(order.status)}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStatusUpdate(!showStatusUpdate)}
              >
                Update Status
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Status Update Panel */}
        {showStatusUpdate && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">New Status</label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((status) => (
                        <SelectItem 
                          key={status.value} 
                          value={status.value}
                          disabled={status.value === order.status}
                        >
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                  <Textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Add update notes..."
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleStatusUpdate}
                  disabled={isUpdatingStatus || !newStatus}
                  size="sm"
                >
                  {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowStatusUpdate(false)}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  Order Items ({orderItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingDetails ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center space-x-4 p-4 border rounded-lg">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                          <div className="flex-grow space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                          </div>
                          <div className="w-20 h-4 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : orderItems.length > 0 ? (
                  <div className="space-y-4">
                    {orderItems.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0">
                          <img
                            src={item.product_image || '/placeholder-product.jpg'}
                            alt={item.product_name}
                            className="w-16 h-16 object-cover rounded-lg border"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder-product.jpg';
                            }}
                          />
                        </div>
                        <div className="flex-grow">
                          <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                          <p className="text-sm text-gray-500">SKU: {item.product_sku}</p>
                          <p className="text-sm text-gray-500">
                            {item.quantity} × {formatCurrency(item.unit_price)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(item.total_price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No items found for this order
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Order Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-grow">
                      <p className="font-medium">Order Placed</p>
                      <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                  
                  {order.status !== 'pending' && (
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-grow">
                        <p className="font-medium">Order Confirmed</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(order.updated_at || order.created_at)}
                        </p>
                      </div>
                    </div>
                  )}

                  {['shipped', 'delivered'].includes(order.status) && (
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Truck className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="flex-grow">
                        <p className="font-medium">Order Shipped</p>
                        <p className="text-sm text-gray-500">
                          Tracking: {order.tracking_number || 'TRK123456789'}
                        </p>
                      </div>
                    </div>
                  )}

                  {order.status === 'delivered' && (
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-grow">
                        <p className="font-medium">Order Delivered</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(order.delivered_at || order.updated_at || order.created_at)}
                        </p>
                      </div>
                    </div>
                  )}

                  {order.status === 'cancelled' && (
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                        <X className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="flex-grow">
                        <p className="font-medium">Order Cancelled</p>
                        <p className="text-sm text-gray-500">
                          {order.cancellation_reason || 'No reason provided'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer & Payment Info */}
          <div className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{order.user_name || 'Guest Customer'}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">{order.user_email}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(order.user_email || '', 'Email')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEmailCustomer}
                    className="flex-1"
                  >
                    <Mail className="mr-2 h-3 w-3" />
                    Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintInvoice}
                    className="flex-1"
                  >
                    <Printer className="mr-2 h-3 w-3" />
                    Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  {order.shipping_address ? (
                    typeof order.shipping_address === 'string' ? (
                      <p>{order.shipping_address}</p>
                    ) : (
                      <div>
                        <p>{order.shipping_address.name}</p>
                        <p>{order.shipping_address.street}</p>
                        <p>{order.shipping_address.city}, {order.shipping_address.state}</p>
                        <p>{order.shipping_address.postal_code}</p>
                        <p>{order.shipping_address.country}</p>
                      </div>
                    )
                  ) : (
                    <p className="text-gray-500">No shipping address</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="mr-2 h-5 w-5" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Payment Method:</span>
                  <Badge variant="outline">{order.payment_method || 'Razorpay'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Payment Status:</span>
                  <Badge className={
                    order.payment_status === 'paid' 
                      ? 'bg-green-100 text-green-800'
                      : order.payment_status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }>
                    {order.payment_status}
                  </Badge>
                </div>
                {currentOrder?.payment_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Payment ID:</span>
                    <div className="flex items-center">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {currentOrder.payment_id.substring(0, 12)}...
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(currentOrder.payment_id || '', 'Payment ID')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency((order.total_amount || 0) - (order.tax_amount || 0) - (order.shipping_amount || 0))}</span>
                </div>
                {order.shipping_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Shipping:</span>
                    <span>{formatCurrency(order.shipping_amount)}</span>
                  </div>
                )}
                {order.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>{formatCurrency(order.tax_amount)}</span>
                  </div>
                )}
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}
                <hr className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span>{formatCurrency(order.total_amount)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;