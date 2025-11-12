import { useQuery } from '@tanstack/react-query';
import { 
  ShoppingCart, 
  Package, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { adminService, productService } from '@/services/api';

interface StatCard {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: React.ComponentType<{ className?: string }>;
}

export default function Dashboard() {
  // Get comprehensive analytics with comparison data
  const { data: comprehensiveAnalytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['comprehensive-analytics'],
    queryFn: () => {
      const endDate = new Date();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const comparisonEndDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000); // Day before start
      const comparisonStartDate = new Date(comparisonEndDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days before that

      return adminService.getComprehensiveAnalytics({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        comparisonStartDate: comparisonStartDate.toISOString().split('T')[0],
        comparisonEndDate: comparisonEndDate.toISOString().split('T')[0],
        includeComparison: true
      });
    },
  });

  // Fallback to legacy analytics if comprehensive fails
  const { data: legacyAnalytics, isLoading: isLegacyLoading } = useQuery({
    queryKey: ['legacy-analytics', 30],
    queryFn: () => adminService.getAnalytics(30),
    enabled: !comprehensiveAnalytics && !isAnalyticsLoading, // Only run if comprehensive fails
  });

  // Get recent orders for recent activity
  const { data: recentOrdersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => adminService.getOrders({ limit: 5, offset: 0 }),
  });

  // Get total product count - get more products to ensure we get proper pagination
  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ['products-count'],
    queryFn: () => productService.getAll({ limit: 10, offset: 0 }),
  });

  const isLoading = isAnalyticsLoading || isLegacyLoading || isOrdersLoading || isProductsLoading;

  // Use comprehensive analytics if available, otherwise fallback to legacy
  const analytics = comprehensiveAnalytics || legacyAnalytics;

  // Helper function to calculate percentage change
  const calculatePercentageChange = (current: number, previous: number): { change: string; changeType: 'increase' | 'decrease' } => {
    if (!previous || previous === 0) {
      return {
        change: current > 0 ? 'New' : 'No data',
        changeType: 'increase'
      };
    }
    const percentChange = ((current - previous) / previous) * 100;
    const change = percentChange > 0 ? `+${percentChange.toFixed(1)}%` : `${percentChange.toFixed(1)}%`;
    return {
      change,
      changeType: percentChange >= 0 ? 'increase' : 'decrease'
    };
  };

  // Calculate dynamic stats with real comparison data from actual server response structure
  const analyticsData = analytics as any;
  const revenueComparison = calculatePercentageChange(
    analyticsData?.revenue?.total_revenue || analyticsData?.total_revenue || 0,
    analyticsData?.revenue?.previous_period_revenue || 0
  );

  const ordersComparison = calculatePercentageChange(
    analyticsData?.revenue?.total_orders || analyticsData?.total_orders || 0,
    analyticsData?.revenue?.previous_period_orders || 0
  );

  const aovComparison = calculatePercentageChange(
    analyticsData?.revenue?.avg_order_value || analyticsData?.average_order_value || 0,
    analyticsData?.revenue?.previous_period_aov || 0
  );

  const stats: StatCard[] = [
    {
      title: 'Total Revenue',
      value: formatCurrency(analyticsData?.revenue?.total_revenue || analyticsData?.total_revenue || 0),
      change: revenueComparison.change,
      changeType: revenueComparison.changeType,
      icon: DollarSign,
    },
    {
      title: 'Total Orders',
      value: formatNumber(analyticsData?.revenue?.total_orders || analyticsData?.total_orders || 0),
      change: ordersComparison.change,
      changeType: ordersComparison.changeType,
      icon: ShoppingCart,
    },
    {
      title: 'Average Order Value',
      value: formatCurrency(analyticsData?.revenue?.avg_order_value || analyticsData?.average_order_value || 0),
      change: aovComparison.change,
      changeType: aovComparison.changeType,
      icon: Activity,
    },
    {
      title: 'Products',
      value: formatNumber(productsData?.pagination?.total || productsData?.total || 0),
      change: `${productsData?.data?.products?.length || 0} active`,
      changeType: 'increase',
      icon: Package,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading text-royal-black">Dashboard</h1>
          <p className="text-muted-foreground font-body">
            Welcome back! Here's what's happening with your store.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="card-elegant hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium font-body text-royal-black">
                  {stat.title}
                </CardTitle>
                <div className="h-10 w-10 rounded-full bg-royal-gold/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-royal-gold" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-heading text-royal-black mb-2">{stat.value}</div>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  {stat.changeType === 'increase' ? (
                    <TrendingUp className="h-3 w-3 text-admin-green" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-admin-red" />
                  )}
                  <span className={
                    stat.changeType === 'increase'
                      ? 'text-admin-green font-medium'
                      : 'text-admin-red font-medium'
                  }>
                    {stat.change}
                  </span>
                  <span className="font-body">from last month</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card className="card-elegant hover-lift">
          <CardHeader>
            <CardTitle className="font-heading text-royal-black">Recent Orders</CardTitle>
            <CardDescription className="font-body">
              Latest orders from your customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrdersData?.data && recentOrdersData.data.length > 0 ? (
                recentOrdersData.data.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-royal-gold/5 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="h-9 w-9 rounded-full bg-royal-gold/20 flex items-center justify-center">
                        <ShoppingCart className="h-4 w-4 text-royal-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-medium font-body text-royal-black">Order #{order.order_number}</p>
                        <p className="text-xs text-muted-foreground font-body">
                          {order.user_email || `Customer ${order.user_id}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium font-heading text-royal-black">
                        {formatCurrency(order.total_amount)}
                      </p>
                      <Badge
                        variant={
                          order.status === 'confirmed' ? 'default' :
                          order.status === 'pending' ? 'secondary' :
                          order.status === 'processing' ? 'outline' :
                          order.status === 'shipped' ? 'outline' :
                          order.status === 'delivered' ? 'default' :
                          order.status === 'cancelled' ? 'destructive' : 'default'
                        }
                        className="text-xs font-body"
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent orders available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="card-elegant hover-lift">
          <CardHeader>
            <CardTitle className="font-heading text-royal-black">Top Products</CardTitle>
            <CardDescription className="font-body">
              Best selling products this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData?.topProducts?.slice(0, 5).map((product: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-royal-gold/5 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-lg bg-royal-gold/20 flex items-center justify-center">
                      <Package className="h-4 w-4 text-royal-gold" />
                    </div>
                    <div>
                      <p className="text-sm font-medium font-body text-royal-black truncate max-w-[150px]">
                        {product.name || product.product_name}
                      </p>
                      <p className="text-xs text-muted-foreground font-body">
                        {product.total_sold} sold
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium font-heading text-royal-black">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-sm text-muted-foreground">
                  No product data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Overview */}
      <Card className="card-elegant hover-lift">
        <CardHeader>
          <CardTitle className="font-heading text-royal-black">Order Status Overview</CardTitle>
          <CardDescription className="font-body">
            Current status of all orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {((analyticsData?.orderStatus || analyticsData?.ordersByStatus)?.length > 0) ? (
              (analyticsData?.orderStatus || analyticsData?.ordersByStatus)?.map((status: any) => (
                <div key={status.status} className="text-center p-4 rounded-lg bg-royal-gold/5 hover:bg-royal-gold/10 transition-colors">
                  <div className="text-2xl font-bold font-heading text-royal-black">{status.count}</div>
                  <div className="text-sm text-muted-foreground font-body capitalize">
                    {status.status.replace('_', ' ')}
                  </div>
                </div>
              ))
            ) : (
              // Fallback: Calculate from recent orders if analytics doesn't have status data
              recentOrdersData?.data ? (
                Object.entries(
                  recentOrdersData.data.reduce((acc: any, order: any) => {
                    acc[order.status] = (acc[order.status] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([status, count]) => (
                  <div key={status} className="text-center">
                    <div className="text-2xl font-bold">{count as number}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {status.replace('_', ' ')}
                    </div>
                  </div>
                ))
              ) : (
                <p className="col-span-full text-sm text-muted-foreground">
                  No order status data available
                </p>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}