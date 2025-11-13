import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { adminService } from '@/services/api';
import type { ComprehensiveAnalytics, AnalyticsFilters } from '@/types';
import { TrendingUp, TrendingDown, Users, ShoppingCart, Package, Heart, CreditCard, DollarSign, ExternalLink, BarChart3 } from 'lucide-react';
import { subDays, format } from 'date-fns';

export default function Analytics() {
  const [analytics, setAnalytics] = useState<ComprehensiveAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [includeComparison, setIncludeComparison] = useState(true);
  const [useCustomRange, setUseCustomRange] = useState(false);

  const loadAnalytics = async (period: string = '30d', customStart?: Date, customEnd?: Date) => {
    try {
      setLoading(true);
      setError(null);
      
      let startDate: string;
      let endDate: string;
      let comparisonStartDate: string;
      let comparisonEndDate: string;
      
      if (useCustomRange && customStart && customEnd) {
        // Use custom date range
        startDate = format(customStart, 'yyyy-MM-dd');
        endDate = format(customEnd, 'yyyy-MM-dd');
        
        // Calculate comparison period (same duration, preceding the selected range)
        const rangeDays = Math.ceil((customEnd.getTime() - customStart.getTime()) / (1000 * 60 * 60 * 24));
        const comparisonEnd = subDays(customStart, 1);
        const comparisonStart = subDays(comparisonEnd, rangeDays);
        
        comparisonStartDate = format(comparisonStart, 'yyyy-MM-dd');
        comparisonEndDate = format(comparisonEnd, 'yyyy-MM-dd');
      } else {
        // Use predefined periods
        const now = new Date();
        
        switch (period) {
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            comparisonStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            comparisonEndDate = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            comparisonStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            comparisonEndDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            comparisonStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            comparisonEndDate = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            comparisonStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            comparisonEndDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }
        
        endDate = now.toISOString().split('T')[0];
      }
      
      const filters: AnalyticsFilters = {
        startDate,
        endDate,
        comparisonStartDate,
        comparisonEndDate,
        includeComparison
      };
      
      const data = await adminService.getComprehensiveAnalytics(filters);
      
      // Validate and provide defaults for missing data
      const validatedData: ComprehensiveAnalytics = {
        revenue: data?.revenue || {
          total_revenue: 0,
          previous_period_revenue: 0,
          revenue_growth: 0,
          total_orders: 0,
          previous_period_orders: 0,
          orders_growth: 0,
          avg_order_value: 0,
          previous_period_aov: 0,
          aov_growth: 0,
          total_discount_given: 0,
          total_tax_collected: 0,
          total_shipping_collected: 0,
          gross_revenue: 0,
        },
        customers: data?.customers || {
          total_customers: 0,
          new_customers: 0,
          returning_customers: 0,
          new_customer_percentage: 0,
          avg_customer_lifetime_value: 0,
          avg_orders_per_customer: 0,
          repeat_purchase_rate: 0,
        },
        topProducts: data?.topProducts || [],
        categories: data?.categories || [],
        marketing: data?.marketing || [],
        conversion: data?.conversion || {
          total_orders: 0,
          paid_orders: 0,
          payment_success_rate: 0,
          shipped_orders: 0,
          delivery_rate: 0,
          cancelled_orders: 0,
          cancellation_rate: 0,
        },
        dailyTrends: data?.dailyTrends || [],
        orderStatus: data?.orderStatus || [],
        cartAbandonment: data?.cartAbandonment || {
          total_tracked_carts: 0,
          abandoned_carts: 0,
          abandonment_rate: 0,
          recovered_carts: 0,
          recovery_rate: 0,
          avg_cart_value: 0,
          potential_lost_revenue: 0,
        },
        dateRange: data?.dateRange || { startDate, endDate },
      };
      
      setAnalytics(validatedData);
    } catch (err) {
      console.error('Analytics error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (useCustomRange && startDate && endDate) {
      loadAnalytics(selectedPeriod, startDate, endDate);
    } else if (!useCustomRange) {
      loadAnalytics(selectedPeriod);
    }
  }, [selectedPeriod, startDate, endDate, useCustomRange, includeComparison]);

  const handleExport = async (exportFormat: 'csv' | 'excel' | 'pdf') => {
    try {
      if (!startDate || !endDate) {
        alert('Please select a date range first');
        return;
      }

      // Show loading state
      const exportBtn = document.querySelector('[data-export-loading]');
      if (exportBtn) exportBtn.textContent = 'Exporting...';

      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      const blob = await adminService.exportAnalytics({
        startDate: startDateStr,
        endDate: endDateStr,
        format: exportFormat
      });

      // Validate blob
      if (!blob || blob.size === 0) {
        throw new Error('Empty export file received');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const dateStr = `${startDateStr}_to_${endDateStr}`;
      const fileExtension = exportFormat === 'excel' ? 'xlsx' : exportFormat;
      a.download = `Analytics_Report_${dateStr}.${fileExtension}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Success feedback
      console.log(`Successfully exported ${exportFormat.toUpperCase()} analytics report`);
      
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      // Reset loading state
      const exportBtn = document.querySelector('[data-export-loading]');
      if (exportBtn) exportBtn.textContent = 'Export';
    }
  };

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
          <h1 className="text-3xl font-bold font-heading text-royal-black">Analytics</h1>
          <p className="text-muted-foreground font-body">Business insights and reports</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse card-elegant">
              <CardContent className="p-6">
                <div className="h-4 bg-royal-gold/20 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-royal-gold/20 rounded w-1/2"></div>
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
          <h1 className="text-3xl font-bold font-heading text-royal-black">Analytics</h1>
          <p className="text-muted-foreground font-body">Business insights and reports</p>
        </div>
        <Card className="card-elegant">
          <CardContent className="p-6">
            <p className="text-admin-red font-body">Error: {error}</p>
            <Button onClick={() => loadAnalytics(selectedPeriod)} className="mt-4 font-body">
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
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-heading text-royal-black">Analytics</h1>
            <p className="text-muted-foreground font-body">
              Business insights and reports for your gift store
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Switch
                id="use-custom-range"
                checked={useCustomRange}
                onCheckedChange={(checked) => {
                  setUseCustomRange(checked);
                  if (!checked) {
                    setStartDate(undefined);
                    setEndDate(undefined);
                  }
                }}
              />
              <Label htmlFor="use-custom-range" className="text-sm font-body">
                Custom date range
              </Label>
            </div>
            
            {useCustomRange ? (
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onExport={handleExport}
                className="min-w-[300px]"
              />
            ) : (
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
            )}
            
            <div className="flex items-center gap-2">
              <Switch
                id="include-comparison"
                checked={includeComparison}
                onCheckedChange={setIncludeComparison}
              />
              <Label htmlFor="include-comparison" className="text-sm font-body">
                Compare to previous period
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue & Sales Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-elegant hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground font-body">Total Revenue</p>
                <p className="text-2xl font-bold font-heading text-royal-black">{formatCurrency(analytics.revenue.total_revenue)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-admin-green/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-admin-green" />
              </div>
            </div>
            <div className="mt-2">
              {getGrowthBadge(analytics.revenue.revenue_growth)}
            </div>
          </CardContent>
        </Card>

        <Card className="card-elegant hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground font-body">Total Orders</p>
                <p className="text-2xl font-bold font-heading text-royal-black">{analytics.revenue.total_orders}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-admin-blue/10 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-admin-blue" />
              </div>
            </div>
            <div className="mt-2">
              {getGrowthBadge(analytics.revenue.orders_growth)}
            </div>
          </CardContent>
        </Card>

        <Card className="card-elegant hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground font-body">Avg Order Value</p>
                <p className="text-2xl font-bold font-heading text-royal-black">{formatCurrency(analytics.revenue.avg_order_value)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-royal-black/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-royal-black" />
              </div>
            </div>
            <div className="mt-2">
              {getGrowthBadge(analytics.revenue.aov_growth)}
            </div>
          </CardContent>
        </Card>

        <Card className="card-elegant hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground font-body">Total Customers</p>
                <p className="text-2xl font-bold font-heading text-royal-black">{analytics.customers.total_customers}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-royal-gold/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-royal-gold" />
              </div>
            </div>
            <div className="mt-2">
              {includeComparison ? 
                getGrowthBadge(analytics.customers.customer_growth) :
                <Badge variant="outline">
                  {analytics.customers.new_customer_percentage.toFixed(1)}% new customers
                </Badge>
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-elegant hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-royal-black">
              <Users className="h-5 w-5 text-royal-gold" />
              Customer Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium font-body">New Customers</span>
                <span className="text-lg font-bold font-heading text-admin-green">{analytics.customers.new_customers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium font-body">Returning Customers</span>
                <span className="text-lg font-bold font-heading text-admin-blue">{analytics.customers.returning_customers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium font-body">Avg Customer Lifetime Value</span>
                <span className="text-lg font-bold font-heading text-royal-black">{formatCurrency(analytics.customers.avg_customer_lifetime_value)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium font-body">Repeat Purchase Rate</span>
                <span className="text-lg font-bold font-heading text-royal-black">{analytics.customers.repeat_purchase_rate.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elegant hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-royal-black">
              <CreditCard className="h-5 w-5 text-royal-gold" />
              Conversion Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium font-body">Payment Success Rate</span>
                <span className="text-lg font-bold font-heading text-admin-green">{analytics.conversion.payment_success_rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium font-body">Delivery Rate</span>
                <span className="text-lg font-bold font-heading text-admin-blue">{analytics.conversion.delivery_rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium font-body">Cancellation Rate</span>
                <span className="text-lg font-bold font-heading text-admin-red">{analytics.conversion.cancellation_rate.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-elegant hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-royal-black">
              <Package className="h-5 w-5 text-royal-gold" />
              Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topProducts.slice(0, 5).map((product, index) => (
                <div key={product.product_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-royal-gold/10 rounded-full flex items-center justify-center text-sm font-bold font-heading text-royal-gold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm font-body text-royal-black">{product.name}</p>
                      <p className="text-xs text-muted-foreground font-body">{product.category_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm font-body text-royal-black">{product.total_sold} sold</p>
                    <p className="text-xs text-muted-foreground font-body">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-elegant hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-royal-black">
              <Heart className="h-5 w-5 text-royal-gold" />
              Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.categories.slice(0, 5).map((category, index) => (
                <div key={category.category_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-royal-gold/10 rounded-full flex items-center justify-center text-sm font-bold font-heading text-royal-gold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm font-body text-royal-black">{category.category_name}</p>
                      <p className="text-xs text-muted-foreground font-body">{category.product_count} products</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm font-body text-royal-black">{formatCurrency(category.total_revenue)}</p>
                    <p className="text-xs text-muted-foreground font-body">{category.total_orders} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cart Abandonment, Marketing & GA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="card-elegant hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-royal-black">
              <ShoppingCart className="h-5 w-5 text-royal-gold" />
              Cart Abandonment Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium font-body">Abandonment Rate</span>
                <span className="text-lg font-bold font-heading text-admin-red">{analytics.cartAbandonment.abandonment_rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium font-body">Recovery Rate</span>
                <span className="text-lg font-bold font-heading text-admin-green">{analytics.cartAbandonment.recovery_rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium font-body">Potential Lost Revenue</span>
                <span className="text-lg font-bold font-heading text-admin-yellow">{formatCurrency(analytics.cartAbandonment.potential_lost_revenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elegant hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-royal-black">
              <TrendingUp className="h-5 w-5 text-royal-gold" />
              Marketing Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.marketing.slice(0, 3).map((coupon) => (
                <div key={coupon.coupon_code} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm font-body text-royal-black">{coupon.coupon_code}</p>
                    <p className="text-xs text-muted-foreground font-body">{coupon.usage_count} uses</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm font-body text-royal-black">{formatCurrency(coupon.total_discount_given)}</p>
                    <Badge variant={coupon.is_active ? "default" : "secondary"} className="text-xs font-body">
                      {coupon.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-elegant hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-royal-black">
              <BarChart3 className="h-5 w-5 text-royal-gold" />
              Website Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4 font-body">
                  View detailed website traffic, user behavior, and conversion data
                </p>
                <Button
                  variant="outline"
                  className="w-full font-body"
                  onClick={() => window.open('https://analytics.google.com', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Google Analytics
                </Button>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground text-center font-body">
                  Analyze traffic sources, page views, bounce rates, and user journeys
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}