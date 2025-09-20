import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { adminService } from '@/services/api';
import type { ComprehensiveAnalytics, AnalyticsFilters } from '@/types';
import { CalendarDays, TrendingUp, TrendingDown, Users, ShoppingCart, Package, Heart, CreditCard, Truck, DollarSign } from 'lucide-react';

export default function Analytics() {
  const [analytics, setAnalytics] = useState<ComprehensiveAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  const loadAnalytics = async (period: string = '30d') => {
    try {
      setLoading(true);
      setError(null);
      
      const now = new Date();
      let startDate: string;
      let comparisonStartDate: string;
      let comparisonEndDate: string;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          comparisonStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          comparisonEndDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          comparisonStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          comparisonEndDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          comparisonStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          comparisonEndDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          comparisonStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          comparisonEndDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
      
      const endDate = now.toISOString().split('T')[0];
      
      const filters: AnalyticsFilters = {
        startDate,
        endDate,
        comparisonStartDate,
        comparisonEndDate,
        includeComparison: true
      };
      
      const data = await adminService.getComprehensiveAnalytics(filters);
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics(selectedPeriod);
  }, [selectedPeriod]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getGrowthBadge = (growth: number) => {
    if (growth > 0) {
      return <Badge variant="default" className="text-green-700 bg-green-100"><TrendingUp className="w-3 h-3 mr-1" />{formatPercent(growth)}</Badge>;
    } else if (growth < 0) {
      return <Badge variant="destructive" className="text-red-700 bg-red-100"><TrendingDown className="w-3 h-3 mr-1" />{formatPercent(growth)}</Badge>;
    }
    return <Badge variant="secondary">No change</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Business insights and reports</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Business insights and reports</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Error: {error}</p>
            <Button onClick={() => loadAnalytics(selectedPeriod)} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Business insights and reports for your gift store
          </p>
        </div>
        
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
            >
              {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* Revenue & Sales Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.revenue.total_revenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2">
              {getGrowthBadge(analytics.revenue.revenue_growth)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{analytics.revenue.total_orders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2">
              {getGrowthBadge(analytics.revenue.orders_growth)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.revenue.avg_order_value)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2">
              {getGrowthBadge(analytics.revenue.aov_growth)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{analytics.customers.total_customers}</p>
              </div>
              <Users className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="mt-2">
              <Badge variant="outline">
                {analytics.customers.new_customer_percentage.toFixed(1)}% new customers
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">New Customers</span>
                <span className="text-lg font-bold text-green-600">{analytics.customers.new_customers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Returning Customers</span>
                <span className="text-lg font-bold text-blue-600">{analytics.customers.returning_customers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Avg Customer Lifetime Value</span>
                <span className="text-lg font-bold">{formatCurrency(analytics.customers.avg_customer_lifetime_value)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Repeat Purchase Rate</span>
                <span className="text-lg font-bold text-purple-600">{analytics.customers.repeat_purchase_rate.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Conversion Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Payment Success Rate</span>
                <span className="text-lg font-bold text-green-600">{analytics.conversion.payment_success_rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Delivery Rate</span>
                <span className="text-lg font-bold text-blue-600">{analytics.conversion.delivery_rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Cancellation Rate</span>
                <span className="text-lg font-bold text-red-600">{analytics.conversion.cancellation_rate.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topProducts.slice(0, 5).map((product, index) => (
                <div key={product.product_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.category_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{product.total_sold} sold</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.categories.slice(0, 5).map((category, index) => (
                <div key={category.category_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{category.category_name}</p>
                      <p className="text-xs text-muted-foreground">{category.product_count} products</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(category.total_revenue)}</p>
                    <p className="text-xs text-muted-foreground">{category.total_orders} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cart Abandonment & Marketing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Cart Abandonment Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Abandonment Rate</span>
                <span className="text-lg font-bold text-red-600">{analytics.cartAbandonment.abandonment_rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Recovery Rate</span>
                <span className="text-lg font-bold text-green-600">{analytics.cartAbandonment.recovery_rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Potential Lost Revenue</span>
                <span className="text-lg font-bold text-orange-600">{formatCurrency(analytics.cartAbandonment.potential_lost_revenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Marketing Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.marketing.slice(0, 3).map((coupon) => (
                <div key={coupon.coupon_code} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{coupon.coupon_code}</p>
                    <p className="text-xs text-muted-foreground">{coupon.usage_count} uses</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(coupon.total_discount_given)}</p>
                    <Badge variant={coupon.is_active ? "default" : "secondary"} className="text-xs">
                      {coupon.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}