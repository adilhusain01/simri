import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Percent,
  DollarSign,
  Users,
  TrendingUp,
  Gift,
  Clock,
  CheckCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { couponService } from '@/services/api';

interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  minimum_order_amount?: number;
  maximum_discount_amount?: number;
  usage_limit?: number;
  used_count: number;
  is_active: boolean;
  valid_from?: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
}

interface CouponStats {
  total_coupons: number;
  active_coupons: number;
  total_discount_given: number;
  total_orders_with_coupons: number;
}

interface CouponForm {
  code: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  minimum_order_amount: number;
  maximum_discount_amount: number;
  usage_limit: number;
  valid_from: string;
  valid_until: string;
}

const Coupons: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [viewingStats, setViewingStats] = useState<any>(null);

  const [form, setForm] = useState<CouponForm>({
    code: '',
    name: '',
    description: '',
    type: 'percentage',
    value: 0,
    minimum_order_amount: 0,
    maximum_discount_amount: 0,
    usage_limit: 0,
    valid_from: '',
    valid_until: ''
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch coupons when filters change
  useEffect(() => {
    fetchCoupons();
  }, [debouncedSearch, filterType, filterStatus, sortBy, sortOrder, currentPage, itemsPerPage]);

  // Fetch initial data
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const stats = await couponService.getStats();
      setStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch || undefined,
        type: filterType !== 'all' ? filterType : undefined,
        active: filterStatus !== 'all' ? filterStatus : undefined,
        sortBy,
        sortOrder,
      };

      const data = await couponService.getAll(params);
      setCoupons(data.coupons);
      setTotalCount(data.pagination.total);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async () => {
    try {
      // Validate required fields
      if (!form.code.trim() || form.code.trim().length < 3) {
        toast.error('Coupon code must be at least 3 characters long');
        return;
      }
      if (!form.name.trim() || form.name.trim().length < 3) {
        toast.error('Coupon name must be at least 3 characters long');
        return;
      }
      if (!form.value || form.value <= 0) {
        toast.error('Coupon value must be greater than 0');
        return;
      }

      const couponData = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        value: Number(form.value),
        minimum_order_amount: form.minimum_order_amount > 0 ? form.minimum_order_amount : undefined,
        maximum_discount_amount: form.maximum_discount_amount > 0 ? form.maximum_discount_amount : undefined,
        usage_limit: form.usage_limit > 0 ? form.usage_limit : undefined,
        valid_from: form.valid_from || undefined,
        valid_until: form.valid_until || undefined
      };

      await couponService.create(couponData);
      toast.success('Coupon created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchCoupons();
      fetchStats();
    } catch (error) {
      console.error('Error creating coupon:', error);
      toast.error('Failed to create coupon');
    }
  };

  const handleUpdateCoupon = async () => {
    if (!editingCoupon) return;

    try {
      // Validate required fields
      if (!form.name.trim() || form.name.trim().length < 3) {
        toast.error('Coupon name must be at least 3 characters long');
        return;
      }
      if (!form.value || form.value <= 0) {
        toast.error('Coupon value must be greater than 0');
        return;
      }

      const updateData = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        value: Number(form.value),
        minimum_order_amount: form.minimum_order_amount > 0 ? form.minimum_order_amount : undefined,
        maximum_discount_amount: form.maximum_discount_amount > 0 ? form.maximum_discount_amount : undefined,
        usage_limit: form.usage_limit > 0 ? form.usage_limit : undefined,
        valid_from: form.valid_from || undefined,
        valid_until: form.valid_until || undefined
      };

      await couponService.update(editingCoupon.id, updateData);
      toast.success('Coupon updated successfully');
      setIsEditDialogOpen(false);
      setEditingCoupon(null);
      resetForm();
      fetchCoupons();
    } catch (error) {
      console.error('Error updating coupon:', error);
      toast.error('Failed to update coupon');
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    try {
      await couponService.update(coupon.id, { is_active: !coupon.is_active });
      toast.success(`Coupon ${!coupon.is_active ? 'activated' : 'deactivated'} successfully`);
      fetchCoupons();
      fetchStats();
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      toast.error('Failed to update coupon status');
    }
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    const action = confirm(`Choose deletion type for coupon "${coupon.code}":\n\nClick OK for SOFT DELETE (deactivate, preserve all data)\nClick Cancel to choose PERMANENT DELETE`);
    
    let hardDelete = false;
    if (!action) {
      const confirmHard = confirm(`⚠️ PERMANENT DELETE for coupon "${coupon.code}"?\n\nThis will:\n✅ Remove coupon and all user usage records\n✅ Preserve all order data (amounts, discounts remain intact)\n❌ Cannot be undone\n\nProceed with permanent deletion?`);
      if (!confirmHard) return;
      hardDelete = true;
    }

    try {
      await couponService.delete(coupon.id, hardDelete);
      toast.success(hardDelete ? 'Coupon permanently deleted (orders preserved)' : 'Coupon deactivated successfully');
      fetchCoupons();
      fetchStats();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Failed to delete coupon');
    }
  };

  const handleViewStats = async (coupon: Coupon) => {
    try {
      const stats = await couponService.getCouponStats(coupon.id);
      setViewingStats(stats);
      setIsStatsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching coupon stats:', error);
      toast.error('Failed to fetch coupon statistics');
    }
  };

  const handleBulkStatusChange = async (isActive: boolean) => {
    if (selectedCoupons.length === 0) return;
    
    const action = isActive ? 'activate' : 'deactivate';
    const confirmMessage = `Are you sure you want to ${action} ${selectedCoupons.length} coupons?`;
    
    if (!confirm(confirmMessage)) return;

    try {
      await couponService.bulkUpdateStatus(selectedCoupons, isActive);
      toast.success(`Successfully ${action}d ${selectedCoupons.length} coupons`);
      setSelectedCoupons([]);
      fetchCoupons();
      fetchStats();
    } catch (error) {
      console.error('Bulk update error:', error);
      toast.error(`Failed to ${action} coupons`);
    }
  };

  const resetForm = () => {
    setForm({
      code: '',
      name: '',
      description: '',
      type: 'percentage',
      value: 0,
      minimum_order_amount: 0,
      maximum_discount_amount: 0,
      usage_limit: 0,
      valid_from: '',
      valid_until: ''
    });
  };

  const handleSelectAll = () => {
    if (selectedCoupons.length === coupons.length) {
      setSelectedCoupons([]);
    } else {
      setSelectedCoupons(coupons.map(c => c.id));
    }
  };

  const handleSelectCoupon = (couponId: string) => {
    if (selectedCoupons.includes(couponId)) {
      setSelectedCoupons(selectedCoupons.filter(id => id !== couponId));
    } else {
      setSelectedCoupons([...selectedCoupons, couponId]);
    }
  };

  const openEditDialog = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      type: coupon.type,
      value: coupon.value,
      minimum_order_amount: coupon.minimum_order_amount || 0,
      maximum_discount_amount: coupon.maximum_discount_amount || 0,
      usage_limit: coupon.usage_limit || 0,
      valid_from: coupon.valid_from ? new Date(coupon.valid_from).toISOString().split('T')[0] : '',
      valid_until: coupon.valid_until ? new Date(coupon.valid_until).toISOString().split('T')[0] : ''
    });
    setIsEditDialogOpen(true);
  };

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.is_active) return 'inactive';
    
    const now = new Date();
    if (coupon.valid_until && new Date(coupon.valid_until) < now) return 'expired';
    if (coupon.valid_from && new Date(coupon.valid_from) > now) return 'scheduled';
    // Note: Coupons are no longer globally exhausted since usage_limit is per-user
    
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Scheduled</Badge>;
      case 'exhausted':
        return <Badge variant="outline" className="border-orange-500 text-orange-600">Exhausted</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading text-royal-black">Coupons</h1>
          <p className="text-muted-foreground font-body">Manage discount coupons and promotional offers</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Coupon
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="card-elegant hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-body text-royal-black">Total Coupons</CardTitle>
              <div className="h-10 w-10 rounded-full bg-royal-gold/10 flex items-center justify-center">
                <Gift className="h-4 w-4 text-royal-gold" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading text-royal-black">{stats.total_coupons}</div>
            </CardContent>
          </Card>

          <Card className="card-elegant hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-body text-royal-black">Active Coupons</CardTitle>
              <div className="h-10 w-10 rounded-full bg-admin-green/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-admin-green" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading text-admin-green">{stats.active_coupons}</div>
            </CardContent>
          </Card>

          <Card className="card-elegant hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-body text-royal-black">Total Discount Given</CardTitle>
              <div className="h-10 w-10 rounded-full bg-admin-blue/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-admin-blue" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading text-royal-black">{formatCurrency(stats.total_discount_given)}</div>
            </CardContent>
          </Card>

          <Card className="card-elegant hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-body text-royal-black">Orders with Coupons</CardTitle>
              <div className="h-10 w-10 rounded-full bg-royal-black/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-royal-black" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading text-royal-black">{stats.total_orders_with_coupons}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card className="card-elegant hover-lift">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search coupons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at-desc">Newest First</SelectItem>
                  <SelectItem value="created_at-asc">Oldest First</SelectItem>
                  <SelectItem value="code-asc">Code (A-Z)</SelectItem>
                  <SelectItem value="code-desc">Code (Z-A)</SelectItem>
                  <SelectItem value="used_count-desc">Most Used</SelectItem>
                  <SelectItem value="used_count-asc">Least Used</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedCoupons.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{selectedCoupons.length}</span>
                <span className="text-muted-foreground">coupons selected</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const activeCoupons = coupons.filter(c => selectedCoupons.includes(c.id) && c.is_active);
                    if (activeCoupons.length > 0) {
                      handleBulkStatusChange(false);
                    }
                  }}
                  disabled={!coupons.some(c => selectedCoupons.includes(c.id) && c.is_active)}
                  className="gap-2"
                >
                  <ToggleLeft className="h-4 w-4" />
                  Deactivate Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const inactiveCoupons = coupons.filter(c => selectedCoupons.includes(c.id) && !c.is_active);
                    if (inactiveCoupons.length > 0) {
                      handleBulkStatusChange(true);
                    }
                  }}
                  disabled={!coupons.some(c => selectedCoupons.includes(c.id) && !c.is_active)}
                  className="gap-2"
                >
                  <ToggleRight className="h-4 w-4" />
                  Activate Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCoupons([])}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coupons Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No coupons found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-4 w-12">
                      <Checkbox
                        checked={selectedCoupons.length === coupons.length && coupons.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all coupons"
                      />
                    </th>
                    <th className="p-4 font-medium">Code</th>
                    <th className="p-4 font-medium">Name</th>
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 font-medium">Value</th>
                    <th className="p-4 font-medium">Usage</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Validity</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => (
                    <motion.tr
                      key={coupon.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b hover:bg-muted/50"
                    >
                      <td className="p-4">
                        <Checkbox
                          checked={selectedCoupons.includes(coupon.id)}
                          onCheckedChange={() => handleSelectCoupon(coupon.id)}
                          aria-label={`Select coupon ${coupon.code}`}
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-mono font-medium">{coupon.code}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{coupon.name}</div>
                        {coupon.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {coupon.description}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {coupon.type === 'percentage' ? (
                            <Percent className="h-3 w-3" />
                          ) : (
                            <DollarSign className="h-3 w-3" />
                          )}
                          <span className="capitalize">{coupon.type}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">
                          {coupon.type === 'percentage' 
                            ? `${coupon.value}%`
                            : formatCurrency(coupon.value)
                          }
                        </div>
                        {coupon.maximum_discount_amount && coupon.type === 'percentage' && (
                          <div className="text-xs text-muted-foreground">
                            Max: {formatCurrency(coupon.maximum_discount_amount)}
                          </div>
                        )}
                        {coupon.minimum_order_amount && (
                          <div className="text-xs text-muted-foreground">
                            Min: {formatCurrency(coupon.minimum_order_amount)}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          {coupon.used_count} total uses
                          {coupon.usage_limit && (
                            <div className="text-xs text-muted-foreground">
                              {coupon.usage_limit} uses per user
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(getCouponStatus(coupon))}
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          {coupon.valid_from && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              From {formatDate(coupon.valid_from)}
                            </div>
                          )}
                          {coupon.valid_until && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Until {formatDate(coupon.valid_until)}
                            </div>
                          )}
                          {!coupon.valid_from && !coupon.valid_until && (
                            <span className="text-muted-foreground">No expiry</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewStats(coupon)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Stats
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(coupon)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(coupon)}>
                              {coupon.is_active ? (
                                <>
                                  <ToggleLeft className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteCoupon(coupon)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Items per page:</span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} items
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                if (totalPages <= 5) {
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8"
                    >
                      {pageNum}
                    </Button>
                  );
                }
                return null;
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Coupon Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Coupon</DialogTitle>
            <DialogDescription>
              Create a new discount coupon for your store
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Coupon Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g. WELCOME10"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Use uppercase letters and numbers only
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Coupon Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Welcome Discount"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the coupon..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Discount Configuration */}
            <div className="space-y-4">
              <Label>Discount Type *</Label>
              <RadioGroup 
                value={form.type} 
                onValueChange={(value) => setForm({ ...form, type: value as 'percentage' | 'fixed', value: 0 })}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percentage" id="percentage" />
                  <Label htmlFor="percentage" className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Percentage
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Fixed Amount
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">
                  {form.type === 'percentage' ? 'Percentage Value *' : 'Fixed Amount *'}
                </Label>
                <div className="relative">
                  <Input
                    id="value"
                    type="number"
                    placeholder={form.type === 'percentage' ? '10' : '100'}
                    value={form.value || ''}
                    onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max={form.type === 'percentage' ? "100" : undefined}
                    step={form.type === 'percentage' ? "0.01" : "1"}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {form.type === 'percentage' ? '%' : '₹'}
                  </div>
                </div>
              </div>

              {form.type === 'percentage' && (
                <div className="space-y-2">
                  <Label htmlFor="max_discount">Maximum Discount Amount</Label>
                  <div className="relative">
                    <Input
                      id="max_discount"
                      type="number"
                      placeholder="500"
                      value={form.maximum_discount_amount || ''}
                      onChange={(e) => setForm({ ...form, maximum_discount_amount: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="1"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₹
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cap the maximum discount amount
                  </p>
                </div>
              )}
            </div>

            {/* Usage Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_order">Minimum Order Amount</Label>
                <div className="relative">
                  <Input
                    id="min_order"
                    type="number"
                    placeholder="500"
                    value={form.minimum_order_amount || ''}
                    onChange={(e) => setForm({ ...form, minimum_order_amount: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="1"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ₹
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="usage_limit">Usage Limit (Per User)</Label>
                <Input
                  id="usage_limit"
                  type="number"
                  placeholder="2"
                  value={form.usage_limit || ''}
                  onChange={(e) => setForm({ ...form, usage_limit: parseInt(e.target.value) || 0 })}
                  min="1"
                  step="1"
                />
                <p className="text-xs text-muted-foreground">
                  Number of times each user can use this coupon
                </p>
              </div>
            </div>

            {/* Validity Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valid_from">Valid From</Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for immediate activation
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valid_until">Valid Until</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  min={form.valid_from || new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for no expiry
                </p>
              </div>
            </div>

            {/* Preview */}
            {form.code && form.name && form.value > 0 && (
              <div className="bg-muted p-4 rounded-lg">
                <Label className="text-sm font-medium">Preview</Label>
                <div className="mt-2 space-y-1">
                  <div className="font-mono font-bold text-lg">{form.code}</div>
                  <div className="font-medium">{form.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {form.type === 'percentage' 
                      ? `${form.value}% discount` 
                      : `₹${form.value} off`
                    }
                    {form.minimum_order_amount > 0 && ` on orders above ₹${form.minimum_order_amount}`}
                    {form.maximum_discount_amount > 0 && form.type === 'percentage' && ` (max ₹${form.maximum_discount_amount})`}
                  </div>
                  {form.usage_limit > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Limited to {form.usage_limit} uses per user
                    </div>
                  )}
                  {(form.valid_from || form.valid_until) && (
                    <div className="text-xs text-muted-foreground">
                      Valid {form.valid_from && `from ${formatDate(form.valid_from)}`}
                      {form.valid_from && form.valid_until && ' '}
                      {form.valid_until && `until ${formatDate(form.valid_until)}`}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCoupon}
              disabled={!form.code || !form.name || !form.value}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Coupon
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Coupon Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Coupon</DialogTitle>
            <DialogDescription>
              Edit coupon details. Note: Coupon code cannot be changed.
            </DialogDescription>
          </DialogHeader>
          
          {editingCoupon && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_code">Coupon Code</Label>
                  <Input
                    id="edit_code"
                    value={form.code}
                    disabled
                    className="font-mono bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Coupon code cannot be changed after creation
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Coupon Name *</Label>
                  <Input
                    id="edit_name"
                    placeholder="e.g. Welcome Discount"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea
                  id="edit_description"
                  placeholder="Brief description of the coupon..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Discount Configuration - Type cannot be changed */}
              <div className="space-y-4">
                <Label>Discount Type</Label>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded">
                  {form.type === 'percentage' ? (
                    <>
                      <Percent className="h-4 w-4" />
                      Percentage Discount
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4" />
                      Fixed Amount Discount
                    </>
                  )}
                  <span className="ml-auto">Cannot be changed</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_value">
                    {form.type === 'percentage' ? 'Percentage Value *' : 'Fixed Amount *'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="edit_value"
                      type="number"
                      placeholder={form.type === 'percentage' ? '10' : '100'}
                      value={form.value || ''}
                      onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max={form.type === 'percentage' ? "100" : undefined}
                      step={form.type === 'percentage' ? "0.01" : "1"}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {form.type === 'percentage' ? '%' : '₹'}
                    </div>
                  </div>
                </div>

                {form.type === 'percentage' && (
                  <div className="space-y-2">
                    <Label htmlFor="edit_max_discount">Maximum Discount Amount</Label>
                    <div className="relative">
                      <Input
                        id="edit_max_discount"
                        type="number"
                        placeholder="500"
                        value={form.maximum_discount_amount || ''}
                        onChange={(e) => setForm({ ...form, maximum_discount_amount: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="1"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        ₹
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cap the maximum discount amount
                    </p>
                  </div>
                )}
              </div>

              {/* Usage Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_min_order">Minimum Order Amount</Label>
                  <div className="relative">
                    <Input
                      id="edit_min_order"
                      type="number"
                      placeholder="500"
                      value={form.minimum_order_amount || ''}
                      onChange={(e) => setForm({ ...form, minimum_order_amount: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="1"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₹
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_usage_limit">Usage Limit (Per User)</Label>
                  <Input
                    id="edit_usage_limit"
                    type="number"
                    placeholder="2"
                    value={form.usage_limit || ''}
                    onChange={(e) => setForm({ ...form, usage_limit: parseInt(e.target.value) || 0 })}
                    min="1"
                    step="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of times each user can use this coupon. Currently used by {editingCoupon.used_count} users.
                  </p>
                </div>
              </div>

              {/* Validity Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_valid_from">Valid From</Label>
                  <Input
                    id="edit_valid_from"
                    type="date"
                    value={form.valid_from}
                    onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for immediate activation
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_valid_until">Valid Until</Label>
                  <Input
                    id="edit_valid_until"
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                    min={form.valid_from || new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for no expiry
                  </p>
                </div>
              </div>

              {/* Current Status */}
              <div className="bg-muted p-4 rounded-lg">
                <Label className="text-sm font-medium">Current Status</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status:</span>
                    {getStatusBadge(getCouponStatus(editingCoupon))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Usage:</span>
                    <span className="text-sm font-medium">
                      {editingCoupon.used_count} uses
                    </span>
                  </div>
                  {editingCoupon.usage_limit && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Per User Limit:</span>
                      <span className="text-sm font-medium">
                        {editingCoupon.usage_limit} uses
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              {form.name && form.value > 0 && (
                <div className="bg-muted p-4 rounded-lg">
                  <Label className="text-sm font-medium">Updated Preview</Label>
                  <div className="mt-2 space-y-1">
                    <div className="font-mono font-bold text-lg">{form.code}</div>
                    <div className="font-medium">{form.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {form.type === 'percentage' 
                        ? `${form.value}% discount` 
                        : `₹${form.value} off`
                      }
                      {form.minimum_order_amount > 0 && ` on orders above ₹${form.minimum_order_amount}`}
                      {form.maximum_discount_amount > 0 && form.type === 'percentage' && ` (max ₹${form.maximum_discount_amount})`}
                    </div>
                    {form.usage_limit > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Limited to {form.usage_limit} uses per user
                      </div>
                    )}
                    {(form.valid_from || form.valid_until) && (
                      <div className="text-xs text-muted-foreground">
                        Valid {form.valid_from && `from ${formatDate(form.valid_from)}`}
                        {form.valid_from && form.valid_until && ' '}
                        {form.valid_until && `until ${formatDate(form.valid_until)}`}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setEditingCoupon(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateCoupon}
              disabled={!form.name || !form.value}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Update Coupon
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Coupon Statistics</DialogTitle>
            <DialogDescription>
              Detailed usage analytics and performance metrics
            </DialogDescription>
          </DialogHeader>
          
          {viewingStats && (
            <div className="space-y-6">
              {/* Coupon Overview */}
              <div className="bg-muted p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="font-mono font-bold text-xl">{viewingStats.code}</div>
                    <div className="font-medium text-lg">{viewingStats.name}</div>
                    {viewingStats.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {viewingStats.description}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {getStatusBadge(getCouponStatus(viewingStats))}
                    <div className="text-sm text-muted-foreground mt-2">
                      {viewingStats.type === 'percentage' 
                        ? `${viewingStats.value}% discount` 
                        : `₹${viewingStats.value} off`
                      }
                      {viewingStats.minimum_order_amount > 0 && (
                        <div>Min order: ₹{viewingStats.minimum_order_amount}</div>
                      )}
                      {viewingStats.maximum_discount_amount > 0 && viewingStats.type === 'percentage' && (
                        <div>Max discount: ₹{viewingStats.maximum_discount_amount}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{viewingStats.total_orders_with_coupon || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Orders using this coupon
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Times Used</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{viewingStats.used_count}</div>
                    <p className="text-xs text-muted-foreground">
                      {viewingStats.usage_limit 
                        ? `total uses (${viewingStats.usage_limit} per user limit)`
                        : 'No usage limit per user'
                      }
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Discount</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(viewingStats.total_discount_given || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total discount provided
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Order Value</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(viewingStats.total_order_value || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total value of orders
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Per-User Usage Info */}
              {viewingStats.usage_limit && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Per-User Usage Limit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Each user can use:</span>
                        <span className="font-medium">{viewingStats.usage_limit} times</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Total uses so far:</span>
                        <span className="font-medium">{viewingStats.used_count}</span>
                      </div>
                      <div className="text-center text-sm text-muted-foreground">
                        💡 This coupon is available for all users up to {viewingStats.usage_limit} uses each
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Performance Metrics */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Average Order Value</span>
                        <span className="font-medium">
                          {viewingStats.total_orders_with_coupon > 0 
                            ? formatCurrency(viewingStats.total_order_value / viewingStats.total_orders_with_coupon)
                            : formatCurrency(0)
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Average Discount</span>
                        <span className="font-medium">
                          {viewingStats.used_count > 0 
                            ? formatCurrency(viewingStats.total_discount_given / viewingStats.used_count)
                            : formatCurrency(0)
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Revenue Impact</span>
                        <span className="font-medium">
                          {viewingStats.total_order_value > 0 
                            ? `${Math.round((viewingStats.total_discount_given / viewingStats.total_order_value) * 100)}%`
                            : '0%'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Validity Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Created</span>
                        <span className="font-medium">{formatDate(viewingStats.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Valid From</span>
                        <span className="font-medium">
                          {viewingStats.valid_from ? formatDate(viewingStats.valid_from) : 'Immediate'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Valid Until</span>
                        <span className="font-medium">
                          {viewingStats.valid_until ? formatDate(viewingStats.valid_until) : 'No expiry'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Status</span>
                        {getStatusBadge(getCouponStatus(viewingStats))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Information */}
              {(viewingStats.total_orders_with_coupon > 0 || viewingStats.used_count > 0) ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      This coupon has been successfully used <strong>{viewingStats.used_count}</strong> times 
                      across <strong>{viewingStats.total_orders_with_coupon}</strong> orders, 
                      providing a total discount of <strong>{formatCurrency(viewingStats.total_discount_given)}</strong> 
                      on orders worth <strong>{formatCurrency(viewingStats.total_order_value)}</strong>.
                      
                      {viewingStats.usage_limit && (
                        <span className="block mt-2 text-blue-600">
                          💡 Each user can use this coupon up to {viewingStats.usage_limit} times.
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <div className="text-muted-foreground">
                      <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>This coupon hasn't been used yet.</p>
                      <p className="text-sm mt-2">Statistics will appear once customers start using this coupon.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => {
              setIsStatsDialogOpen(false);
              setViewingStats(null);
            }}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Coupons;