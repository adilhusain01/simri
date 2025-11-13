import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Truck,
  MapPin,
  FileText,
  Printer,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { adminService } from '../services/api';
import { toast } from 'sonner';
import Pagination from '../components/ui/pagination';

// Types
interface ShiprocketOrder {
  id: string;
  order_number: string;
  shiprocket_order_id?: string;
  shiprocket_shipment_id?: string;
  awb_number?: string;
  courier_name?: string;
  shipping_status: string | undefined;
  total_amount: number;
  created_at: string;
  user_email: string;
}

interface Courier {
  id: number;
  name: string;
  nick: string;
  tracking_url: string;
}

const Shiprocket: React.FC = () => {
  // State
  const [orders, setOrders] = useState<ShiprocketOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ShiprocketOrder[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCourier, setSelectedCourier] = useState<string>('');
  const [pickupDate, setPickupDate] = useState('');
  const [serviceabilityData, setServiceabilityData] = useState({
    pickup_postcode: '',
    delivery_postcode: '',
    weight: ''
  });

  // Pagination
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    limit: 20
  });

  // Operations state
  const [creating, setCreating] = useState(false);
  const [generatingAwb, setGeneratingAwb] = useState(false);
  const [schedulingPickup, setSchedulingPickup] = useState(false);
  const [generatingManifest, setGeneratingManifest] = useState(false);
  const [generatingLabels, setGeneratingLabels] = useState(false);
  const [checkingServiceability, setCheckingServiceability] = useState(false);

  // Error recovery state
  const [retryingOrders, setRetryingOrders] = useState<Set<string>>(new Set());
  const [failedOperations, setFailedOperations] = useState<Array<{
    orderId: string;
    operation: string;
    error: string;
    timestamp: string;
  }>>([]);
  const [showErrorRecovery, setShowErrorRecovery] = useState(false);

  // Load data
  useEffect(() => {
    loadOrders();
    loadCouriers();
  }, [pagination.current_page]);

  // Filter orders
  useEffect(() => {
    // Defensive coding: ensure orders is always an array
    const ordersArray = Array.isArray(orders) ? orders : [];
    let filtered = ordersArray;

    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.awb_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'no_shiprocket') {
        filtered = filtered.filter(order => !order.shiprocket_order_id);
      } else if (statusFilter === 'no_awb') {
        filtered = filtered.filter(order => order.shiprocket_order_id && !order.awb_number);
      } else {
        filtered = filtered.filter(order => order.shipping_status === statusFilter);
      }
    }

    setFilteredOrders(filtered);
  }, [orders, searchQuery, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await adminService.getOrders({
        offset: (pagination.current_page - 1) * pagination.limit,
        limit: pagination.limit,
        payment_status: 'paid' // Only show paid orders
      });
      // Defensive coding: ensure we always have an array
      setOrders(Array.isArray(response.data) ? response.data as ShiprocketOrder[] : []);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Failed to load orders');
      // Ensure orders is still an array on error
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCouriers = async () => {
    try {
      const response = await adminService.getShiprocketCouriers();
      setCouriers(response.data.data || []);
    } catch (error) {
      console.error('Failed to load couriers:', error);
    }
  };

  const addFailedOperation = (orderId: string, operation: string, error: string) => {
    setFailedOperations(prev => [...prev, {
      orderId,
      operation,
      error,
      timestamp: new Date().toISOString()
    }]);
  };

  const removeFailedOperation = (orderId: string, operation: string) => {
    setFailedOperations(prev =>
      prev.filter(op => !(op.orderId === orderId && op.operation === operation))
    );
  };

  const handleCreateOrder = async (order: ShiprocketOrder, isRetry = false) => {
    const operation = 'create_order';

    try {
      if (isRetry) {
        setRetryingOrders(prev => new Set(prev.add(order.id)));
      } else {
        setCreating(true);
      }

      await adminService.createShiprocketOrder(order.id);
      toast.success('Shiprocket order created successfully');

      // Remove from failed operations if this was a retry
      if (isRetry) {
        removeFailedOperation(order.id, operation);
      }

      loadOrders();
    } catch (error: any) {
      console.error('Failed to create Shiprocket order:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create Shiprocket order';
      toast.error(errorMessage);

      // Add to failed operations for retry
      addFailedOperation(order.id, operation, errorMessage);
    } finally {
      if (isRetry) {
        setRetryingOrders(prev => {
          const newSet = new Set(prev);
          newSet.delete(order.id);
          return newSet;
        });
      } else {
        setCreating(false);
      }
    }
  };

  const handleGenerateAwb = async (order: ShiprocketOrder, courierId?: string, isRetry = false) => {
    const operation = 'generate_awb';
    const courierToUse = courierId || selectedCourier;

    if (!courierToUse) {
      toast.error('Please select a courier first');
      return;
    }

    try {
      if (isRetry) {
        setRetryingOrders(prev => new Set(prev.add(order.id)));
      } else {
        setGeneratingAwb(true);
      }

      await adminService.generateShiprocketAwb(order.id, courierToUse);
      toast.success('AWB generated successfully');

      // Remove from failed operations if this was a retry
      if (isRetry) {
        removeFailedOperation(order.id, operation);
      }

      setSelectedCourier('');
      loadOrders();
    } catch (error: any) {
      console.error('Failed to generate AWB:', error);
      const errorMessage = error.response?.data?.message || 'Failed to generate AWB';
      toast.error(errorMessage);

      // Add to failed operations for retry
      addFailedOperation(order.id, operation, errorMessage);
    } finally {
      if (isRetry) {
        setRetryingOrders(prev => {
          const newSet = new Set(prev);
          newSet.delete(order.id);
          return newSet;
        });
      } else {
        setGeneratingAwb(false);
      }
    }
  };

  const handleSchedulePickup = async () => {
    const shipmentIds = filteredOrders
      .filter(order => order.shiprocket_shipment_id)
      .map(order => order.shiprocket_shipment_id!);

    if (shipmentIds.length === 0) {
      toast.error('No shipments available for pickup');
      return;
    }

    try {
      setSchedulingPickup(true);
      await adminService.scheduleShiprocketPickup({
        shipment_ids: shipmentIds,
        pickup_date: pickupDate
      });
      toast.success(`Pickup scheduled for ${shipmentIds.length} shipments`);
      setPickupDate('');
    } catch (error: any) {
      console.error('Failed to schedule pickup:', error);
      toast.error(error.response?.data?.message || 'Failed to schedule pickup');
    } finally {
      setSchedulingPickup(false);
    }
  };

  const handleGenerateManifest = async () => {
    const shipmentIds = filteredOrders
      .filter(order => order.awb_number)
      .map(order => order.shiprocket_shipment_id!);

    if (shipmentIds.length === 0) {
      toast.error('No shipments with AWB available');
      return;
    }

    try {
      setGeneratingManifest(true);
      const response = await adminService.generateShiprocketManifest({ shipment_ids: shipmentIds });

      // Handle PDF download if URL is provided
      if (response.data.manifest_url) {
        window.open(response.data.manifest_url, '_blank');
      }

      toast.success(`Manifest generated for ${shipmentIds.length} shipments`);
    } catch (error: any) {
      console.error('Failed to generate manifest:', error);
      toast.error(error.response?.data?.message || 'Failed to generate manifest');
    } finally {
      setGeneratingManifest(false);
    }
  };

  const handleGenerateLabels = async () => {
    const shipmentIds = filteredOrders
      .filter(order => order.awb_number)
      .map(order => order.shiprocket_shipment_id!);

    if (shipmentIds.length === 0) {
      toast.error('No shipments with AWB available');
      return;
    }

    try {
      setGeneratingLabels(true);
      const response = await adminService.generateShiprocketLabels({ shipment_ids: shipmentIds });

      // Handle PDF download if URL is provided
      if (response.data.label_url) {
        window.open(response.data.label_url, '_blank');
      }

      toast.success(`Labels generated for ${shipmentIds.length} shipments`);
    } catch (error: any) {
      console.error('Failed to generate labels:', error);
      toast.error(error.response?.data?.message || 'Failed to generate labels');
    } finally {
      setGeneratingLabels(false);
    }
  };

  const handleCheckServiceability = async () => {
    const { pickup_postcode, delivery_postcode, weight } = serviceabilityData;

    if (!pickup_postcode || !delivery_postcode || !weight) {
      toast.error('Please fill all serviceability fields');
      return;
    }

    try {
      setCheckingServiceability(true);
      const response = await adminService.checkShiprocketServiceability({
        pickup_postcode,
        delivery_postcode,
        weight: parseFloat(weight)
      });

      console.log('Serviceability results:', response.data);
      toast.success('Serviceability check completed - see console for details');
    } catch (error: any) {
      console.error('Failed to check serviceability:', error);
      toast.error(error.response?.data?.message || 'Failed to check serviceability');
    } finally {
      setCheckingServiceability(false);
    }
  };

  // Bulk retry failed operations
  const handleBulkRetry = async () => {
    const ordersArray = Array.isArray(orders) ? orders : [];
    const ordersToRetry = failedOperations.reduce((acc, operation) => {
      const order = ordersArray.find(o => o.id === operation.orderId);
      if (order) {
        acc.push({ order, operation: operation.operation });
      }
      return acc;
    }, [] as Array<{ order: ShiprocketOrder; operation: string }>);

    if (ordersToRetry.length === 0) {
      toast.error('No failed operations to retry');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const { order, operation } of ordersToRetry) {
      try {
        if (operation === 'create_order') {
          await handleCreateOrder(order, true);
          successCount++;
        } else if (operation === 'generate_awb') {
          // For AWB retry, we need to get the courier from the failed operation or use a default
          const defaultCourier = couriers[0]?.id.toString();
          if (defaultCourier) {
            await handleGenerateAwb(order, defaultCourier, true);
            successCount++;
          } else {
            failCount++;
          }
        }
      } catch (error) {
        failCount++;
      }
    }

    toast.success(`Bulk retry completed: ${successCount} successful, ${failCount} failed`);
  };

  // Clear all failed operations
  const handleClearFailedOperations = () => {
    setFailedOperations([]);
    toast.success('Failed operations cleared');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, current_page: page }));
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setPagination(prev => ({
      ...prev,
      limit: newItemsPerPage,
      current_page: 1 // Reset to first page when changing items per page
    }));
  };

  const getShippingStatusBadge = (status: string) => {
    const config = {
      not_shipped: { variant: 'secondary', color: 'bg-gray-100 text-gray-800' },
      processing: { variant: 'secondary', color: 'bg-blue-100 text-blue-800' },
      shipped: { variant: 'default', color: 'bg-green-100 text-green-800' },
      in_transit: { variant: 'default', color: 'bg-yellow-100 text-yellow-800' },
      delivered: { variant: 'default', color: 'bg-green-100 text-green-800' },
    } as const;

    const statusConfig = config[status as keyof typeof config] || config.not_shipped;
    return (
      <Badge className={statusConfig.color}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold font-heading text-royal-black">Shiprocket Management</h1>
        <p className="text-muted-foreground font-body">Manage shipping operations and track orders</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div {...fadeInUp}>
          <Card className="card-elegant hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="h-10 w-10 rounded-full bg-royal-gold/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-royal-gold" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-royal-black">
                    {Array.isArray(orders) ? orders.filter(o => o.shiprocket_order_id).length : 0}
                  </p>
                  <p className="text-sm text-muted-foreground font-body">Shiprocket Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeInUp}>
          <Card className="card-elegant hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="h-10 w-10 rounded-full bg-admin-yellow/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-admin-yellow" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-admin-yellow">
                    {Array.isArray(orders) ? orders.filter(o => !o.shiprocket_order_id).length : 0}
                  </p>
                  <p className="text-sm text-muted-foreground font-body">Pending Creation</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeInUp}>
          <Card className="card-elegant hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="h-10 w-10 rounded-full bg-admin-blue/10 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-admin-blue" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-admin-blue">
                    {Array.isArray(orders) ? orders.filter(o => o.awb_number).length : 0}
                  </p>
                  <p className="text-sm text-muted-foreground font-body">With AWB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeInUp}>
          <Card className="card-elegant hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="h-10 w-10 rounded-full bg-admin-green/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-admin-green" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-admin-green">
                    {Array.isArray(orders) ? orders.filter(o => o.shipping_status === 'shipped').length : 0}
                  </p>
                  <p className="text-sm text-muted-foreground font-body">Shipped</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Error Recovery Panel */}
      {failedOperations.length > 0 && (
        <Card className="card-elegant border-admin-red/20 bg-admin-red/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-admin-red" />
                <CardTitle className="font-heading text-admin-red">Failed Operations ({failedOperations.length})</CardTitle>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkRetry}
                  className="font-body text-admin-red border-admin-red hover:bg-admin-red/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFailedOperations}
                  className="font-body"
                >
                  Clear All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowErrorRecovery(!showErrorRecovery)}
                  className="font-body"
                >
                  {showErrorRecovery ? 'Hide' : 'Show'} Details
                </Button>
              </div>
            </div>
          </CardHeader>
          {showErrorRecovery && (
            <CardContent>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {failedOperations.map((operation, index) => {
                  const ordersArray = Array.isArray(orders) ? orders : [];
                  const order = ordersArray.find(o => o.id === operation.orderId);
                  const isRetrying = retryingOrders.has(operation.orderId);

                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded border border-admin-red/20">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="font-medium font-body text-royal-black">
                              Order #{order?.order_number || operation.orderId}
                            </p>
                            <p className="text-sm text-muted-foreground font-body">
                              Operation: {operation.operation.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-admin-red font-body">
                              Error: {operation.error}
                            </p>
                            <p className="text-xs text-muted-foreground font-body">
                              {formatDate(operation.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (order) {
                              if (operation.operation === 'create_order') {
                                handleCreateOrder(order, true);
                              } else if (operation.operation === 'generate_awb') {
                                const defaultCourier = couriers[0]?.id.toString();
                                if (defaultCourier) {
                                  handleGenerateAwb(order, defaultCourier, true);
                                } else {
                                  toast.error('No couriers available for retry');
                                }
                              }
                            }
                          }}
                          disabled={isRetrying || !order}
                          className="font-body text-admin-red border-admin-red hover:bg-admin-red/10"
                        >
                          {isRetrying ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            'Retry'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFailedOperation(operation.orderId, operation.operation)}
                          className="font-body"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Bulk Operations */}
      <Card className="card-elegant">
        <CardHeader>
          <CardTitle className="font-heading text-royal-black">Bulk Operations</CardTitle>
          <CardDescription className="font-body">Perform operations on multiple shipments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Schedule Pickup */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="font-body">
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule Pickup
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-ivory-white">
                <DialogHeader>
                  <DialogTitle className="font-heading text-royal-black">Schedule Pickup</DialogTitle>
                  <DialogDescription className="font-body">
                    Schedule pickup for all shipments
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="pickup-date" className="font-body text-royal-black">Pickup Date</Label>
                    <Input
                      id="pickup-date"
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="border-gray-300 bg-white font-body focus:border-royal-gold focus:ring-royal-gold/20"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleSchedulePickup}
                    disabled={schedulingPickup || !pickupDate}
                    className="font-body"
                  >
                    {schedulingPickup && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    Schedule Pickup
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Generate Manifest */}
            <Button
              variant="outline"
              onClick={handleGenerateManifest}
              disabled={generatingManifest}
              className="font-body"
            >
              {generatingManifest ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Generate Manifest
            </Button>

            {/* Generate Labels */}
            <Button
              variant="outline"
              onClick={handleGenerateLabels}
              disabled={generatingLabels}
              className="font-body"
            >
              {generatingLabels ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
              Generate Labels
            </Button>

            {/* Serviceability Check */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="font-body">
                  <MapPin className="h-4 w-4 mr-2" />
                  Check Serviceability
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-ivory-white">
                <DialogHeader>
                  <DialogTitle className="font-heading text-royal-black">Check Serviceability</DialogTitle>
                  <DialogDescription className="font-body">
                    Check if shipping is available between pincodes
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="pickup-postcode" className="font-body text-royal-black">Pickup Postcode</Label>
                    <Input
                      id="pickup-postcode"
                      value={serviceabilityData.pickup_postcode}
                      onChange={(e) => setServiceabilityData(prev => ({...prev, pickup_postcode: e.target.value}))}
                      placeholder="110001"
                      className="border-gray-300 bg-white font-body focus:border-royal-gold focus:ring-royal-gold/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="delivery-postcode" className="font-body text-royal-black">Delivery Postcode</Label>
                    <Input
                      id="delivery-postcode"
                      value={serviceabilityData.delivery_postcode}
                      onChange={(e) => setServiceabilityData(prev => ({...prev, delivery_postcode: e.target.value}))}
                      placeholder="400001"
                      className="border-gray-300 bg-white font-body focus:border-royal-gold focus:ring-royal-gold/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight" className="font-body text-royal-black">Weight (kg)</Label>
                    <Input
                      id="weight"
                      value={serviceabilityData.weight}
                      onChange={(e) => setServiceabilityData(prev => ({...prev, weight: e.target.value}))}
                      placeholder="0.5"
                      className="border-gray-300 bg-white font-body focus:border-royal-gold focus:ring-royal-gold/20"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCheckServiceability}
                    disabled={checkingServiceability}
                    className="font-body"
                  >
                    {checkingServiceability && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    Check Serviceability
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card className="card-elegant">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders, emails, or AWB numbers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-300 bg-white font-body focus:border-royal-gold focus:ring-royal-gold/20"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 border-gray-300 bg-white font-body focus:border-royal-gold focus:ring-royal-gold/20">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 shadow-elegant">
                <SelectItem value="all" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">All Orders</SelectItem>
                <SelectItem value="no_shiprocket" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">No Shiprocket Order</SelectItem>
                <SelectItem value="no_awb" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">No AWB</SelectItem>
                <SelectItem value="not_shipped" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">Not Shipped</SelectItem>
                <SelectItem value="processing" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">Processing</SelectItem>
                <SelectItem value="shipped" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">Shipped</SelectItem>
                <SelectItem value="delivered" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">Delivered</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={loadOrders}
              disabled={loading}
              className="font-body"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="card-elegant">
        <CardHeader>
          <CardTitle className="font-heading text-royal-black">Orders</CardTitle>
          <CardDescription className="font-body">
            Manage shipping for {filteredOrders.length} orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <div className="h-16 w-16 rounded-full bg-royal-gold/10 flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-royal-gold" />
              </div>
              <h3 className="text-lg font-heading font-medium text-royal-black mb-2">No orders found</h3>
              <p className="text-muted-foreground font-body">
                {searchQuery ? 'Try adjusting your search terms' : 'No orders match the current filter'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-body text-royal-black">Order #</TableHead>
                    <TableHead className="font-body text-royal-black">Customer</TableHead>
                    <TableHead className="font-body text-royal-black">Amount</TableHead>
                    <TableHead className="font-body text-royal-black">Shiprocket ID</TableHead>
                    <TableHead className="font-body text-royal-black">AWB Number</TableHead>
                    <TableHead className="font-body text-royal-black">Courier</TableHead>
                    <TableHead className="font-body text-royal-black">Status</TableHead>
                    <TableHead className="font-body text-royal-black">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-body">#{order.order_number}</TableCell>
                      <TableCell className="font-body">{order.user_email}</TableCell>
                      <TableCell className="font-body">{formatCurrency(order.total_amount)}</TableCell>
                      <TableCell className="font-body">
                        {order.shiprocket_order_id ? (
                          <span className="text-green-600 font-mono">{order.shiprocket_order_id}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-body">
                        {order.awb_number ? (
                          <span className="text-blue-600 font-mono">{order.awb_number}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-body">
                        {order.courier_name || <span className="text-gray-400">-</span>}
                      </TableCell>
                      <TableCell>
                        {getShippingStatusBadge(order.shipping_status || 'not_shipped')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!order.shiprocket_order_id ? (
                            <Button
                              size="sm"
                              onClick={() => handleCreateOrder(order)}
                              disabled={creating}
                              className="font-body"
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Create
                            </Button>
                          ) : !order.awb_number ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {}}
                                  className="font-body"
                                >
                                  <Truck className="h-3 w-3 mr-1" />
                                  AWB
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-ivory-white">
                                <DialogHeader>
                                  <DialogTitle className="font-heading text-royal-black">Generate AWB</DialogTitle>
                                  <DialogDescription className="font-body">
                                    Select a courier for order #{order.order_number}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="courier" className="font-body text-royal-black">Courier</Label>
                                    <Select value={selectedCourier} onValueChange={setSelectedCourier}>
                                      <SelectTrigger className="border-gray-300 bg-white font-body focus:border-royal-gold focus:ring-royal-gold/20">
                                        <SelectValue placeholder="Select courier" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white border-gray-200 shadow-elegant">
                                        {couriers.map((courier) => (
                                          <SelectItem
                                            key={courier.id}
                                            value={courier.id.toString()}
                                            className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10"
                                          >
                                            {courier.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    onClick={() => handleGenerateAwb(order)}
                                    disabled={generatingAwb || !selectedCourier}
                                    className="font-body"
                                  >
                                    {generatingAwb && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                                    Generate AWB
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`https://shiprocket.com/tracking/${order.awb_number}`, '_blank')}
                              className="font-body"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Track
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination.total_count > 0 && (
            <div className="border-t pt-4">
              <Pagination
                currentPage={pagination.current_page}
                totalPages={pagination.total_pages}
                totalItems={pagination.total_count}
                itemsPerPage={pagination.limit}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Shiprocket;