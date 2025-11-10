// Core dashboard types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin';
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description?: string;
  price: number;
  discount_price?: number;
  images: string[];
  category_id: string;
  category_name?: string;
  tags: string[];
  stock_quantity: number;
  sku: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  is_featured: boolean;
  is_active: boolean;
  meta_title?: string;
  meta_description?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  parent_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryDeletionResponse {
  success: boolean;
  message: string;
  affected: {
    products: number;
    subcategories: number;
  };
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_image?: string;
  product_snapshot?: any;
}

export interface Order {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  order_number: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  shipping_status?: 'not_shipped' | 'processing' | 'shipped' | 'in_transit' | 'delivered';
  total_amount: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  coupon_code?: string;
  coupon_discount_amount?: number;
  currency: string;
  shipping_address: any;
  billing_address?: any;
  payment_method?: string;
  payment_id?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  tracking_number?: string;
  awb_number?: string;
  courier_name?: string;
  shipped_at?: string;
  delivered_at?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  refund_amount?: number;
  refund_status?: string;
  notes?: string;
  items_count?: number;
  items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface Coupon {
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

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name?: string;
  is_active: boolean;
  preferences?: any;
  created_at: string;
  updated_at: string;
}

// Comprehensive Analytics types for E-commerce Dashboard
export interface RevenueAnalytics {
  total_revenue: number;
  previous_period_revenue: number;
  revenue_growth: number;
  total_orders: number;
  previous_period_orders: number;
  orders_growth: number;
  avg_order_value: number;
  previous_period_aov: number;
  aov_growth: number;
  total_discount_given: number;
  total_tax_collected: number;
  total_shipping_collected: number;
  gross_revenue: number;
}

export interface CustomerAnalytics {
  total_customers: number;
  previous_period_customers: number;
  customer_growth: number;
  new_customers: number;
  returning_customers: number;
  new_customer_percentage: number;
  avg_customer_lifetime_value: number;
  avg_orders_per_customer: number;
  repeat_purchase_rate: number;
}

export interface ProductAnalytics {
  product_id: string;
  name: string;
  total_sold: number;
  revenue: number;
  avg_rating: number;
  total_reviews: number;
  is_gift_suitable: boolean;
  category_name: string;
}

export interface CategoryAnalytics {
  category_id: string;
  category_name: string;
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  product_count: number;
}

export interface MarketingAnalytics {
  coupon_code: string;
  usage_count: number;
  total_discount_given: number;
  avg_discount_per_use: number;
  revenue_from_coupon_orders: number;
  is_active: boolean;
}

export interface ConversionAnalytics {
  total_orders: number;
  paid_orders: number;
  payment_success_rate: number;
  shipped_orders: number;
  delivery_rate: number;
  cancelled_orders: number;
  cancellation_rate: number;
}

export interface DailyTrend {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
}

export interface OrderStatusBreakdown {
  status: string;
  count: number;
  percentage: number;
  total_value: number;
}

export interface CartAbandonmentInsights {
  total_tracked_carts: number;
  abandoned_carts: number;
  abandonment_rate: number;
  recovered_carts: number;
  recovery_rate: number;
  avg_cart_value: number;
  potential_lost_revenue: number;
}

export interface AnalyticsDateRange {
  startDate: string;
  endDate: string;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
}

export interface AnalyticsFilters extends AnalyticsDateRange {
  category?: string;
  includeComparison?: boolean;
}

export interface ComprehensiveAnalytics {
  revenue: RevenueAnalytics;
  customers: CustomerAnalytics;
  topProducts: ProductAnalytics[];
  categories: CategoryAnalytics[];
  marketing: MarketingAnalytics[];
  conversion: ConversionAnalytics;
  dailyTrends: DailyTrend[];
  orderStatus: OrderStatusBreakdown[];
  cartAbandonment: CartAbandonmentInsights;
  dateRange: AnalyticsDateRange;
}

// Legacy Analytics types (keeping for backward compatibility)
export interface SalesAnalytics {
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  ordersByStatus: Array<{ status: string; count: number }>;
  topProducts: Array<{ 
    product_name: string; 
    total_sold: number; 
    revenue: number 
  }>;
  dailySales: Array<{ 
    date: string; 
    orders: number; 
    revenue: number 
  }>;
}

export interface UserAnalytics {
  total_users: number;
  new_users_30d: number;
  verified_users: number;
  user_growth: Array<{ month: string; new_users: number }>;
}

export interface NewsletterStats {
  total_subscribers: number;
  active_subscribers: number;
  inactive_subscribers: number;
  new_subscribers_30d: number;
  new_subscribers_7d: number;
}

export interface NewsletterGrowthData {
  month: string;
  new_subscribers: number;
}

export interface CartAbandonmentAnalytics {
  total_abandoned_carts: number;
  recovered_carts: number;
  recovery_rate: number;
  average_abandoned_value: number;
  total_lost_revenue: number;
  daily_abandonment: Array<{
    date: string;
    abandoned_count: number;
    recovered_count: number;
    total_value: number;
  }>;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  total: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasMore?: boolean;
  };
}

// Store types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// Component props types
export interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface SearchFilters {
  search?: string;
  status?: string;
  payment_status?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Dashboard specific types
export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  recentOrders: Order[];
  lowStockProducts: Product[];
  topSellingProducts: Product[];
}

// Error types
export interface ApiError {
  message: string;
  status: number;
  code?: string;
}