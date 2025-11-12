import React, { useState, useEffect} from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  UserX,
  Search,
  MoreHorizontal,
  Mail,
  Calendar,
  Shield,
  Download
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { LoadingSpinner } from '../components/ui/loading';
import Pagination from '../components/ui/pagination';
import { adminService } from '../services/api';
import type { User } from '../types';
import { toast } from 'sonner';

const Customers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'admin'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch customers with filters
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers', currentPage, pageLimit, roleFilter, debouncedSearch],
    queryFn: () => adminService.getUsers({
      limit: pageLimit,
      offset: (currentPage - 1) * pageLimit,
      role: roleFilter === 'all' ? undefined : roleFilter,
      search: debouncedSearch || undefined
    }),
  });

  const customers = customersData?.data || [];
  const pagination = customersData?.pagination;

  // Fetch total stats separately for accurate counts (not affected by pagination/filters)
  const { data: allStatsData } = useQuery({
    queryKey: ['customer-stats'],
    queryFn: () => adminService.getUsers({ limit: 1000, offset: 0 }), // Get a large sample for stats
  });

  // Customer stats
  const allCustomers = allStatsData?.data || [];
  const customerStats = {
    total: allCustomers.length,
    verified: allCustomers.filter(c => c.is_verified).length,
    unverified: allCustomers.filter(c => !c.is_verified).length,
    admins: allCustomers.filter(c => c.role === 'admin').length
  };

  // Handle customer actions
  const handleViewDetails = (customer: User) => {
    setSelectedCustomer(customer);
    setShowDetailsModal(true);
  };

  const handleExportCustomer = (customer: User) => {
    const data = {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      role: customer.role,
      is_verified: customer.is_verified,
      created_at: customer.created_at,
      updated_at: customer.updated_at
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_${customer.email}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('Customer data exported');
  };

  const handleExportAll = () => {
    const data = customers.map(customer => ({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      role: customer.role,
      is_verified: customer.is_verified,
      created_at: customer.created_at,
      updated_at: customer.updated_at
    }));
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_export.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('All customers exported');
  };

  // Use customers directly since filtering is now done server-side
  const filteredCustomers = customers;

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
  };

  const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (customersLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-heading text-royal-black">Customer Management</h1>
          <p className="text-muted-foreground font-body">Manage customer accounts and information</p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-heading text-royal-black">Customer Management</h1>
          <p className="text-muted-foreground font-body">Manage customer accounts and information</p>
        </div>
        <Button variant="outline" onClick={handleExportAll}>
          <Download className="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>

      {/* Statistics Cards */}
      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div variants={fadeInUp}>
          <Card className="card-elegant hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="h-10 w-10 rounded-full bg-royal-gold/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-royal-gold" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-royal-black">{customerStats.total}</p>
                  <p className="text-sm text-muted-foreground font-body">Total Customers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card className="card-elegant hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="h-10 w-10 rounded-full bg-admin-green/10 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-admin-green" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-royal-black">{customerStats.verified}</p>
                  <p className="text-sm text-muted-foreground font-body">Verified</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card className="card-elegant hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="h-10 w-10 rounded-full bg-admin-yellow/10 flex items-center justify-center">
                  <UserX className="h-5 w-5 text-admin-yellow" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-royal-black">{customerStats.unverified}</p>
                  <p className="text-sm text-muted-foreground font-body">Unverified</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card className="card-elegant hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="h-10 w-10 rounded-full bg-royal-black/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-royal-black" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-royal-black">{customerStats.admins}</p>
                  <p className="text-sm text-muted-foreground font-body">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Customer Management */}
      <motion.div {...fadeInUp}>
        <Card className="card-elegant hover-lift">
          <CardHeader>
            <CardTitle className="font-heading text-royal-black">Customers</CardTitle>
            <CardDescription className="font-body">View and manage all customer accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers by email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={(value: 'all' | 'customer' | 'admin') => setRoleFilter(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="customer">Customers Only</SelectItem>
                  <SelectItem value="admin">Admins Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customers List */}
            {customersLoading ? (
              <LoadingSpinner />
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-600 mb-2">No customers found</h3>
                <p className="text-gray-500">
                  {searchQuery ? 'Try adjusting your search terms' : 'No customers registered yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-royal-gold rounded-full flex items-center justify-center text-white font-semibold">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{customer.name}</p>
                          {customer.role === 'admin' && (
                            <Shield className="h-4 w-4 text-royal-black" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {customer.email}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Joined {new Date(customer.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={customer.is_verified ? 'default' : 'secondary'}>
                        {customer.is_verified ? 'Verified' : 'Unverified'}
                      </Badge>
                      <Badge variant={customer.role === 'admin' ? 'destructive' : 'outline'}>
                        {customer.role}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleViewDetails(customer)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportCustomer(customer)}>
                            Export Data
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={pagination?.totalPages || 1}
                totalItems={pagination?.total || 0}
                itemsPerPage={pageLimit}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(newLimit) => {
                  setPageLimit(newLimit);
                  setCurrentPage(1);
                }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Customer Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Customer Details</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDetailsModal(false)}
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-royal-gold rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-2">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <h4 className="font-semibold">{selectedCustomer.name}</h4>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-sm text-gray-900">{selectedCustomer.email}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Role</label>
                <div className="mt-1">
                  <Badge variant={selectedCustomer.role === 'admin' ? 'destructive' : 'outline'}>
                    {selectedCustomer.role}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Verification Status</label>
                <div className="mt-1">
                  <Badge variant={selectedCustomer.is_verified ? 'default' : 'secondary'}>
                    {selectedCustomer.is_verified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Registration Date</label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedCustomer.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              {selectedCustomer.updated_at !== selectedCustomer.created_at && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Last Updated</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedCustomer.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => handleExportCustomer(selectedCustomer)}
              >
                Export Data
              </Button>
              <Button onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;