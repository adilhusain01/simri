import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  RefreshCw,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  ArrowDownLeft,
  Clock,
  Ban,
  Undo
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
interface PaymentTransaction {
  id: string;
  order_number: string;
  total_amount: number;
  payment_status: string;
  refund_status: string;
  refund_amount: number;
  razorpay_payment_id: string;
  razorpay_refund_id?: string;
  razorpay_order_id: string;
  created_at: string;
  refunded_at?: string;
  user_email: string;
  first_name: string;
  last_name: string;
}

interface PaymentAnalytics {
  overview: {
    total_payments: number;
    successful_payments: number;
    failed_payments: number;
    pending_payments: number;
    success_rate: number;
    total_revenue: number;
    total_refunds: number;
    refund_count: number;
    avg_order_value: number;
    net_revenue: number;
  };
  daily_trends: Array<{
    date: string;
    payment_count: number;
    successful_count: number;
    revenue: number;
    refunds: number;
    success_rate: number;
  }>;
  payment_methods: Array<{
    method: string;
    count: number;
    revenue: number;
  }>;
}

const Payments: React.FC = () => {
  // State
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [refundStatusFilter, setRefundStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('7d');
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundForm, setRefundForm] = useState({
    amount: '',
    reason: '',
    refund_type: 'manual'
  });
  const [refundLoading, setRefundLoading] = useState(false);

  // Pagination
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    limit: 20
  });

  // Load data
  useEffect(() => {
    loadTransactions();
  }, [searchQuery, paymentStatusFilter, refundStatusFilter, pagination.current_page]);

  useEffect(() => {
    loadAnalytics();
  }, [periodFilter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await adminService.getPaymentTransactions({
        page: pagination.current_page,
        limit: pagination.limit,
        payment_status: paymentStatusFilter === 'all' ? undefined : paymentStatusFilter,
        refund_status: refundStatusFilter === 'all' ? undefined : refundStatusFilter,
        search: searchQuery || undefined
      });

      setTransactions(response.data.transactions);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast.error('Failed to load payment transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await adminService.getPaymentAnalytics(periodFilter);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load payment analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedTransaction) return;

    try {
      setRefundLoading(true);
      await adminService.processRefund(selectedTransaction.id, {
        amount: refundForm.amount ? parseFloat(refundForm.amount) : undefined,
        reason: refundForm.reason || 'Manual refund by admin',
        refund_type: refundForm.refund_type
      });

      toast.success('Refund processed successfully');
      setShowRefundDialog(false);
      setRefundForm({ amount: '', reason: '', refund_type: 'manual' });
      loadTransactions();
    } catch (error: any) {
      console.error('Refund error:', error);
      toast.error(error.response?.data?.message || 'Failed to process refund');
    } finally {
      setRefundLoading(false);
    }
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

  const getPaymentStatusBadge = (status: string) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      paid: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
      refunded: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Undo },
    } as const;

    const statusConfig = config[status as keyof typeof config] || config.pending;
    const Icon = statusConfig.icon;

    return (
      <Badge className={`${statusConfig.color} border`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRefundStatusBadge = (status: string) => {
    const config = {
      none: { color: 'bg-gray-100 text-gray-600', icon: Ban },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle },
    } as const;

    const statusConfig = config[status as keyof typeof config] || config.none;
    const Icon = statusConfig.icon;

    return (
      <Badge className={statusConfig.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold font-heading text-royal-black">Payment Management</h1>
        <p className="text-muted-foreground font-body">Manage payments, refunds, and transaction analytics</p>
      </div>

      {/* Analytics Cards */}
      {analyticsLoading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div {...fadeInUp}>
            <Card className="card-elegant hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="h-10 w-10 rounded-full bg-royal-gold/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-royal-gold" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-heading text-royal-black">
                      {formatCurrency(analytics.overview.total_revenue)}
                    </p>
                    <p className="text-sm text-muted-foreground font-body">Total Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeInUp}>
            <Card className="card-elegant hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-heading text-royal-black">
                      {analytics.overview.success_rate}%
                    </p>
                    <p className="text-sm text-muted-foreground font-body">Success Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeInUp}>
            <Card className="card-elegant hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <ArrowDownLeft className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-heading text-royal-black">
                      {formatCurrency(analytics.overview.total_refunds)}
                    </p>
                    <p className="text-sm text-muted-foreground font-body">Total Refunds</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeInUp}>
            <Card className="card-elegant hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-heading text-royal-black">
                      {formatCurrency(analytics.overview.avg_order_value)}
                    </p>
                    <p className="text-sm text-muted-foreground font-body">Avg Order Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <Card className="card-elegant">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders, emails, payment IDs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-300 bg-white font-body focus:border-royal-gold focus:ring-royal-gold/20"
                />
              </div>
            </div>

            {/* Payment Status Filter */}
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="border-gray-300 bg-white font-body focus:border-royal-gold focus:ring-royal-gold/20">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 shadow-elegant">
                <SelectItem value="all" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">All Payments</SelectItem>
                <SelectItem value="pending" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">Pending</SelectItem>
                <SelectItem value="paid" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">Paid</SelectItem>
                <SelectItem value="failed" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">Failed</SelectItem>
              </SelectContent>
            </Select>

            {/* Refund Status Filter */}
            <Select value={refundStatusFilter} onValueChange={setRefundStatusFilter}>
              <SelectTrigger className="border-gray-300 bg-white font-body focus:border-royal-gold focus:ring-royal-gold/20">
                <SelectValue placeholder="Refund Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 shadow-elegant">
                <SelectItem value="all" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">All Refunds</SelectItem>
                <SelectItem value="none" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">No Refunds</SelectItem>
                <SelectItem value="pending" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">Pending</SelectItem>
                <SelectItem value="completed" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">Completed</SelectItem>
                <SelectItem value="failed" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">Failed</SelectItem>
              </SelectContent>
            </Select>

            {/* Period Filter for Analytics */}
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="border-gray-300 bg-white font-body focus:border-royal-gold focus:ring-royal-gold/20">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 shadow-elegant">
                <SelectItem value="24h" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">Last 24 hours</SelectItem>
                <SelectItem value="7d" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">Last 7 days</SelectItem>
                <SelectItem value="30d" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">Last 30 days</SelectItem>
                <SelectItem value="90d" className="font-body hover:bg-royal-gold/10 focus:bg-royal-gold/10">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="card-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading text-royal-black">Payment Transactions</CardTitle>
              <CardDescription className="font-body">
                Manage payment transactions and process refunds ({pagination.total_count} total)
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={loadTransactions}
              disabled={loading}
              className="font-body"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="h-16 w-16 rounded-full bg-royal-gold/10 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-royal-gold" />
              </div>
              <h3 className="text-lg font-heading font-medium text-royal-black mb-2">No transactions found</h3>
              <p className="text-muted-foreground font-body">
                {searchQuery ? 'Try adjusting your search terms' : 'No transactions match the current filter'}
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
                    <TableHead className="font-body text-royal-black">Payment Status</TableHead>
                    <TableHead className="font-body text-royal-black">Refund Status</TableHead>
                    <TableHead className="font-body text-royal-black">Date</TableHead>
                    <TableHead className="font-body text-royal-black">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono font-body">#{transaction.order_number}</TableCell>
                      <TableCell className="font-body">
                        <div>
                          <p className="font-medium">{transaction.first_name} {transaction.last_name}</p>
                          <p className="text-xs text-muted-foreground">{transaction.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-body">{formatCurrency(transaction.total_amount)}</TableCell>
                      <TableCell>{getPaymentStatusBadge(transaction.payment_status)}</TableCell>
                      <TableCell>{getRefundStatusBadge(transaction.refund_status)}</TableCell>
                      <TableCell className="font-body text-xs">{formatDate(transaction.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              setShowTransactionDialog(true);
                            }}
                            className="font-body"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          {transaction.payment_status === 'paid' && transaction.refund_status === 'none' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setRefundForm({
                                  amount: transaction.total_amount.toString(),
                                  reason: '',
                                  refund_type: 'manual'
                                });
                                setShowRefundDialog(true);
                              }}
                              className="font-body text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <Undo className="h-3 w-3 mr-1" />
                              Refund
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

      {/* Transaction Details Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="max-w-2xl bg-ivory-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-royal-black">Transaction Details</DialogTitle>
            <DialogDescription className="font-body">
              Detailed information for transaction {selectedTransaction?.razorpay_payment_id}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-body text-royal-black font-medium">Order Number</Label>
                  <p className="font-mono text-sm">{selectedTransaction.order_number}</p>
                </div>
                <div>
                  <Label className="font-body text-royal-black font-medium">Customer</Label>
                  <p className="text-sm">{selectedTransaction.first_name} {selectedTransaction.last_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedTransaction.user_email}</p>
                </div>
                <div>
                  <Label className="font-body text-royal-black font-medium">Amount</Label>
                  <p className="text-sm font-medium">{formatCurrency(selectedTransaction.total_amount)}</p>
                </div>
                <div>
                  <Label className="font-body text-royal-black font-medium">Payment Status</Label>
                  <div className="mt-1">
                    {getPaymentStatusBadge(selectedTransaction.payment_status)}
                  </div>
                </div>
                <div>
                  <Label className="font-body text-royal-black font-medium">Refund Status</Label>
                  <div className="mt-1">
                    {getRefundStatusBadge(selectedTransaction.refund_status)}
                  </div>
                </div>
                <div>
                  <Label className="font-body text-royal-black font-medium">Transaction Date</Label>
                  <p className="text-sm">{formatDate(selectedTransaction.created_at)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="font-body text-royal-black font-medium">Payment IDs</Label>
                <div className="mt-2 space-y-2">
                  <div className="text-xs">
                    <span className="font-medium">Razorpay Payment ID:</span>
                    <code className="ml-2 bg-gray-100 px-2 py-1 rounded">{selectedTransaction.razorpay_payment_id}</code>
                  </div>
                  <div className="text-xs">
                    <span className="font-medium">Razorpay Order ID:</span>
                    <code className="ml-2 bg-gray-100 px-2 py-1 rounded">{selectedTransaction.razorpay_order_id}</code>
                  </div>
                  {selectedTransaction.razorpay_refund_id && (
                    <div className="text-xs">
                      <span className="font-medium">Refund ID:</span>
                      <code className="ml-2 bg-gray-100 px-2 py-1 rounded">{selectedTransaction.razorpay_refund_id}</code>
                    </div>
                  )}
                </div>
              </div>

              {selectedTransaction.refund_amount > 0 && (
                <div className="border-t pt-4">
                  <Label className="font-body text-royal-black font-medium">Refund Information</Label>
                  <div className="mt-2 space-y-1">
                    <div className="text-sm">
                      <span className="font-medium">Refund Amount:</span>
                      <span className="ml-2 text-red-600">{formatCurrency(selectedTransaction.refund_amount)}</span>
                    </div>
                    {selectedTransaction.refunded_at && (
                      <div className="text-sm">
                        <span className="font-medium">Refunded At:</span>
                        <span className="ml-2">{formatDate(selectedTransaction.refunded_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="bg-ivory-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-royal-black">Process Refund</DialogTitle>
            <DialogDescription className="font-body">
              Process a refund for order #{selectedTransaction?.order_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="refund-amount" className="font-body text-royal-black">Refund Amount (Optional - leave blank for full refund)</Label>
              <Input
                id="refund-amount"
                type="number"
                placeholder={selectedTransaction ? selectedTransaction.total_amount.toString() : '0'}
                value={refundForm.amount}
                onChange={(e) => setRefundForm(prev => ({ ...prev, amount: e.target.value }))}
                className="border-gray-300 bg-white font-body focus:border-royal-gold focus:ring-royal-gold/20"
              />
            </div>
            <div>
              <Label htmlFor="refund-reason" className="font-body text-royal-black">Reason for Refund</Label>
              <Input
                id="refund-reason"
                placeholder="Enter refund reason..."
                value={refundForm.reason}
                onChange={(e) => setRefundForm(prev => ({ ...prev, reason: e.target.value }))}
                className="border-gray-300 bg-white font-body focus:border-royal-gold focus:ring-royal-gold/20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRefundDialog(false)}
              className="font-body"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRefund}
              disabled={refundLoading}
              className="font-body bg-red-600 hover:bg-red-700 text-white"
            >
              {refundLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;