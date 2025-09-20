import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Mail,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Download,
  Search,
  Filter,
  Calendar,
  MoreHorizontal
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
import { newsletterService } from '../services/api';
import type { NewsletterSubscriber, NewsletterStats, NewsletterGrowthData } from '../types';
import { toast } from 'sonner';

const Newsletter: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const [selectedSubscriber, setSelectedSubscriber] = useState<NewsletterSubscriber | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch newsletter statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['newsletter-stats'],
    queryFn: newsletterService.getStats,
  });

  // Fetch subscribers with pagination and filters
  const { data: subscribersData, isLoading: subscribersLoading, refetch } = useQuery({
    queryKey: ['newsletter-subscribers', currentPage, pageLimit, statusFilter, debouncedSearch],
    queryFn: () => newsletterService.getSubscribers({
      page: currentPage,
      limit: pageLimit,
      active: statusFilter === 'all' ? undefined : statusFilter === 'active',
      search: debouncedSearch || undefined
    }),
  });

  const stats = statsData?.overview;
  const growthData = statsData?.growth || [];
  const subscribers = subscribersData?.data?.subscribers || [];
  const pagination = subscribersData?.data?.pagination;

  // Handle export
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const blob = await newsletterService.exportSubscribers(
        format,
        statusFilter === 'all' ? undefined : statusFilter === 'active'
      );
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter_subscribers.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Subscribers exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(`Failed to export subscribers`);
    }
  };

  // Handle individual subscriber actions
  const handleViewDetails = (subscriber: NewsletterSubscriber) => {
    setSelectedSubscriber(subscriber);
    setShowDetailsModal(true);
  };

  const handleExportIndividual = (subscriber: NewsletterSubscriber) => {
    const data = {
      id: subscriber.id,
      email: subscriber.email,
      name: subscriber.name,
      is_active: subscriber.is_active,
      preferences: subscriber.preferences,
      created_at: subscriber.created_at,
      updated_at: subscriber.updated_at
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriber_${subscriber.email}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('Subscriber data exported');
  };

  // Use subscribers directly since filtering is now done server-side
  const filteredSubscribers = subscribers;

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

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Newsletter Management</h1>
          <p className="text-muted-foreground">Manage your newsletter subscribers and analyze engagement</p>
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
          <h1 className="text-3xl font-bold">Newsletter Management</h1>
          <p className="text-muted-foreground">Manage your newsletter subscribers and analyze engagement</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Statistics Cards */}
      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div variants={fadeInUp}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats?.total_subscribers || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Subscribers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats?.active_subscribers || 0}</p>
                  <p className="text-sm text-muted-foreground">Active Subscribers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{stats?.new_subscribers_30d || 0}</p>
                  <p className="text-sm text-muted-foreground">New (30 days)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <UserX className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{stats?.inactive_subscribers || 0}</p>
                  <p className="text-sm text-muted-foreground">Inactive Subscribers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Growth Chart Placeholder */}
      {growthData.length > 0 && (
        <motion.div {...fadeInUp}>
          <Card>
            <CardHeader>
              <CardTitle>Subscriber Growth</CardTitle>
              <CardDescription>Monthly new subscriber trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Growth chart visualization would go here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {growthData.length} months of data available
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Subscribers Management */}
      <motion.div {...fadeInUp}>
        <Card>
          <CardHeader>
            <CardTitle>Subscribers</CardTitle>
            <CardDescription>Manage and view all newsletter subscribers</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search subscribers by email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subscribers</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subscribers List */}
            {subscribersLoading ? (
              <LoadingSpinner />
            ) : filteredSubscribers.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-600 mb-2">No subscribers found</h3>
                <p className="text-gray-500">
                  {searchQuery ? 'Try adjusting your search terms' : 'No newsletter subscribers yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSubscribers.map((subscriber) => (
                  <div
                    key={subscriber.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {subscriber.name?.charAt(0).toUpperCase() || subscriber.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{subscriber.email}</p>
                        {subscriber.name && (
                          <p className="text-sm text-muted-foreground">{subscriber.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Subscribed {new Date(subscriber.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={subscriber.is_active ? 'default' : 'secondary'}>
                        {subscriber.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleViewDetails(subscriber)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportIndividual(subscriber)}>
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

      {/* Subscriber Details Modal */}
      {showDetailsModal && selectedSubscriber && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Subscriber Details</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDetailsModal(false)}
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-sm text-gray-900">{selectedSubscriber.email}</p>
              </div>
              
              {selectedSubscriber.name && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p className="text-sm text-gray-900">{selectedSubscriber.name}</p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div className="mt-1">
                  <Badge variant={selectedSubscriber.is_active ? 'default' : 'secondary'}>
                    {selectedSubscriber.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Subscribed Date</label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedSubscriber.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              {selectedSubscriber.updated_at !== selectedSubscriber.created_at && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Last Updated</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedSubscriber.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
              
              {selectedSubscriber.preferences && Object.keys(selectedSubscriber.preferences).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Preferences</label>
                  <pre className="text-xs text-gray-900 bg-gray-50 p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(selectedSubscriber.preferences, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => handleExportIndividual(selectedSubscriber)}
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

export default Newsletter;