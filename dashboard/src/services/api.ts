import axios, { type AxiosInstance, AxiosError } from 'axios';
import { toast } from 'sonner';
import type {
  ApiResponse,
  PaginatedResponse,
  User,
  Product,
  Category,
  Order,
  Coupon,
  NewsletterSubscriber,
  SalesAnalytics,
  NewsletterStats,
  NewsletterGrowthData,
  CartAbandonmentAnalytics,
  SearchFilters,
  ApiError,
  ComprehensiveAnalytics,
  AnalyticsFilters
} from '../types';

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    const errorMessage = getErrorMessage(error);
    
    // Don't show toast for auth errors (handled separately)
    if (error.response?.status !== 401) {
      toast.error(errorMessage);
    }
    
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status || 500,
      code: error.code,
    } as ApiError);
  }
);

// Helper function to extract error messages
function getErrorMessage(error: AxiosError): string {
  if (error.response?.data && typeof error.response.data === 'object') {
    const data = error.response.data as any;
    return data.message || data.error || 'An error occurred';
  }
  return error.message || 'Network error occurred';
}

// Auth service
export const authService = {
  // Check authentication status
  me: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/api/auth/me');
    return response.data.data;
  },

  // Login
  login: async (credentials: { email: string; password: string }): Promise<User> => {
    const response = await api.post<ApiResponse<{ user: User }>>('/api/auth/login', credentials);
    return response.data.data.user;
  },

  // Logout
  logout: async (): Promise<void> => {
    await api.post<ApiResponse<null>>('/api/auth/logout');
  },
};

// Admin service
export const adminService = {
  // Get comprehensive analytics
  getComprehensiveAnalytics: async (filters: Partial<AnalyticsFilters> = {}): Promise<ComprehensiveAnalytics> => {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.comparisonStartDate) params.append('comparisonStartDate', filters.comparisonStartDate);
    if (filters.comparisonEndDate) params.append('comparisonEndDate', filters.comparisonEndDate);
    if (filters.category) params.append('category', filters.category);
    if (filters.includeComparison !== undefined) params.append('includeComparison', String(filters.includeComparison));
    
    const response = await api.get<ApiResponse<ComprehensiveAnalytics>>(`/api/admin/analytics?${params.toString()}`);
    return response.data.data;
  },

  // Get legacy analytics (keeping for backward compatibility)
  getAnalytics: async (period: number = 30): Promise<SalesAnalytics> => {
    const response = await api.get<ApiResponse<SalesAnalytics>>(`/api/admin/analytics/legacy?period=${period}`);
    return response.data.data;
  },

  // Export analytics data
  exportAnalytics: async (filters: Partial<AnalyticsFilters> & { format?: 'csv' | 'json' | 'excel' | 'pdf' }): Promise<Blob> => {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.comparisonStartDate) params.append('comparisonStartDate', filters.comparisonStartDate);
    if (filters.comparisonEndDate) params.append('comparisonEndDate', filters.comparisonEndDate);
    if (filters.format) params.append('format', filters.format);
    
    const response = await api.get(`/api/admin/analytics/export?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Get all orders
  getOrders: async (filters?: SearchFilters & { limit?: number; offset?: number }): Promise<PaginatedResponse<Order[]>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    
    const response = await api.get<PaginatedResponse<Order[]>>(`/api/admin/orders?${params.toString()}`);
    return response.data;
  },

  // Get single order with items
  getOrderDetails: async (orderId: string): Promise<Order> => {
    const response = await api.get<ApiResponse<Order>>(`/api/admin/orders/${orderId}`);
    return response.data.data;
  },

  // Update order status
  updateOrderStatus: async (orderId: string, status: string): Promise<Order> => {
    const response = await api.patch<ApiResponse<Order>>(`/api/admin/orders/${orderId}/status`, { status });
    return response.data.data;
  },

  // Update order payment status
  updateOrderPaymentStatus: async (orderId: string, payment_status: string, payment_id?: string): Promise<Order> => {
    const response = await api.patch<ApiResponse<Order>>(`/api/admin/orders/${orderId}/payment-status`, { 
      payment_status, 
      payment_id 
    });
    return response.data.data;
  },

  // Update order shipping status
  updateOrderShippingStatus: async (orderId: string, shipping_status: string, tracking_number?: string): Promise<Order> => {
    const response = await api.patch<ApiResponse<Order>>(`/api/admin/orders/${orderId}/shipping-status`, { 
      shipping_status, 
      tracking_number 
    });
    return response.data.data;
  },

  // Cancel order
  cancelOrder: async (orderId: string, cancellation_reason: string, refund_amount?: number): Promise<Order> => {
    const response = await api.patch<ApiResponse<Order>>(`/api/admin/orders/${orderId}/cancel`, { 
      cancellation_reason, 
      refund_amount 
    });
    return response.data.data;
  },

  // Bulk update orders
  bulkUpdateOrders: async (orderIds: string[], action: string, options: { status?: string; shipping_status?: string; payment_status?: string }): Promise<{ updated: Order[]; errors: any[]; total_processed: number }> => {
    const response = await api.patch<ApiResponse<{ updated: Order[]; errors: any[]; total_processed: number }>>('/api/admin/orders/bulk-update', {
      order_ids: orderIds,
      action,
      ...options
    });
    return response.data.data;
  },

  // Export orders
  exportOrders: async (filters?: { format?: string; status?: string; payment_status?: string; start_date?: string; end_date?: string }): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    
    const response = await api.get(`/api/admin/orders/export?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Get all users
  getUsers: async (filters?: SearchFilters & { limit?: number; offset?: number; role?: string }): Promise<PaginatedResponse<User[]>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    
    const response = await api.get<PaginatedResponse<User[]>>(`/api/admin/users?${params.toString()}`);
    return response.data;
  },

  // Shiprocket management
  createShiprocketOrder: async (orderId: string): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>(`/api/admin/shiprocket/create-order/${orderId}`);
    return response.data;
  },

  generateShiprocketAwb: async (orderId: string, courierId: string): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>(`/api/admin/shiprocket/generate-awb/${orderId}`, {
      courier_id: courierId
    });
    return response.data;
  },

  scheduleShiprocketPickup: async (data: { shipment_ids: string[]; pickup_date?: string }): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>('/api/admin/shiprocket/schedule-pickup', data);
    return response.data;
  },

  generateShiprocketManifest: async (data: { shipment_ids: string[] }): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>('/api/admin/shiprocket/generate-manifest', data);
    return response.data;
  },

  generateShiprocketLabels: async (data: { shipment_ids: string[] }): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>('/api/admin/shiprocket/generate-labels', data);
    return response.data;
  },

  generateShiprocketInvoices: async (data: { order_ids: string[] }): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>('/api/admin/shiprocket/generate-invoices', data);
    return response.data;
  },

  getShiprocketCouriers: async (): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>('/api/admin/shiprocket/couriers');
    return response.data;
  },

  checkShiprocketServiceability: async (data: { pickup_postcode: string; delivery_postcode: string; weight: number; cod?: boolean }): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>('/api/admin/shiprocket/serviceability', data);
    return response.data;
  },

  getShiprocketPickupLocations: async (): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>('/api/admin/shiprocket/pickup-locations');
    return response.data;
  },
};

// Product service
export const productService = {
  // Get all products (admin)
  getAll: async (filters?: SearchFilters & { limit?: number; offset?: number }): Promise<PaginatedResponse<{ products: Product[] }>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    
    const response = await api.get<PaginatedResponse<{ products: Product[] }>>(`/api/admin/products?${params.toString()}`);
    return response.data;
  },

  // Create product
  create: async (productData: Partial<Product>): Promise<Product> => {
    const response = await api.post<ApiResponse<Product>>('/api/admin/products', productData);
    return response.data.data;
  },

  // Update product
  update: async (id: string, productData: Partial<Product>): Promise<Product> => {
    const response = await api.put<ApiResponse<Product>>(`/api/admin/products/${id}`, productData);
    return response.data.data;
  },

  // Delete product
  delete: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<null>>(`/api/admin/products/${id}`);
  },
};

// Category service
export const categoryService = {
  // Get all categories
  getAll: async (): Promise<Category[]> => {
    const response = await api.get<ApiResponse<Category[]>>('/api/admin/categories');
    return response.data.data;
  },

  // Create category
  create: async (categoryData: Partial<Category>): Promise<Category> => {
    const response = await api.post<ApiResponse<Category>>('/api/admin/categories', categoryData);
    return response.data.data;
  },

  // Update category
  update: async (id: string, categoryData: Partial<Category>): Promise<Category> => {
    const response = await api.put<ApiResponse<Category>>(`/api/admin/categories/${id}`, categoryData);
    return response.data.data;
  },

  // Delete category
  delete: async (id: string): Promise<{ message: string; affected: { products: number; subcategories: number } }> => {
    const response = await api.delete<{ success: boolean; message: string; affected: { products: number; subcategories: number } }>(`/api/admin/categories/${id}`);
    return response.data;
  },
};

// Coupon service
export const couponService = {
  // Get all coupons with enhanced filtering
  getAll: async (params?: { 
    page?: number; 
    limit?: number; 
    active?: string; 
    search?: string; 
    type?: string; 
    sortBy?: string; 
    sortOrder?: string; 
  }): Promise<{ coupons: Coupon[]; pagination: { page: number; limit: number; total: number; pages: number } }> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          // Convert active filter to proper boolean string for server
          if (key === 'active' && (value === 'active' || value === 'inactive')) {
            searchParams.append(key, value === 'active' ? 'true' : 'false');
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
    }
    
    const response = await api.get<{ success: boolean; data: { coupons: Coupon[]; pagination: { page: number; limit: number; total: number; pages: number } } }>(`/api/coupons/admin/all?${searchParams.toString()}`);
    return response.data.data;
  },

  // Get coupon statistics for dashboard
  getStats: async (): Promise<{ total_coupons: number; active_coupons: number; total_discount_given: number; total_orders_with_coupons: number }> => {
    const response = await api.get<{ success: boolean; data: { total_coupons: number; active_coupons: number; total_discount_given: number; total_orders_with_coupons: number } }>('/api/coupons/admin/stats');
    return response.data.data;
  },

  // Create coupon
  create: async (couponData: Partial<Coupon>): Promise<Coupon> => {
    const response = await api.post<ApiResponse<Coupon>>('/api/coupons/admin/create', couponData);
    return response.data.data;
  },

  // Update coupon
  update: async (id: string, couponData: Partial<Coupon>): Promise<Coupon> => {
    const response = await api.put<ApiResponse<Coupon>>(`/api/coupons/admin/${id}`, couponData);
    return response.data.data;
  },

  // Delete coupon
  delete: async (id: string, hardDelete: boolean = false): Promise<void> => {
    const url = `/api/coupons/admin/${id}${hardDelete ? '?hard=true' : ''}`;
    await api.delete<ApiResponse<null>>(url);
  },

  // Get individual coupon stats
  getCouponStats: async (id: string): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(`/api/coupons/admin/${id}/stats`);
    return response.data.data;
  },

  // Bulk update coupon status
  bulkUpdateStatus: async (couponIds: string[], isActive: boolean): Promise<void> => {
    await Promise.all(
      couponIds.map(id => 
        api.put<ApiResponse<Coupon>>(`/api/coupons/admin/${id}`, { is_active: isActive })
      )
    );
  },

  // Get coupon statistics with proper server data
  getCouponAnalytics: async (days: number = 30): Promise<{ 
    total_coupons: number; 
    active_coupons: number; 
    inactive_coupons: number;
    total_discount_given: number; 
    total_orders_with_coupons: number;
    usage_trends: any[];
  }> => {
    try {
      // Get basic coupon counts
      const allCouponsResponse = await api.get<ApiResponse<{ coupons: Coupon[]; pagination: any }>>('/api/coupons/admin/all?limit=1000');
      const allCoupons = allCouponsResponse.data.data.coupons;
      
      // Get order analytics (if available)
      let orderStats = { total_discount_given: 0, total_orders_with_coupons: 0, usage_trends: [] };
      try {
        const analyticsResponse = await api.get<ApiResponse<any>>(`/api/admin/analytics?period=${days}`);
        orderStats = analyticsResponse.data.data.coupon_analytics || orderStats;
      } catch (error) {
        console.warn('Coupon analytics not available:', error);
      }
      
      return {
        total_coupons: allCoupons.length,
        active_coupons: allCoupons.filter(c => c.is_active).length,
        inactive_coupons: allCoupons.filter(c => !c.is_active).length,
        total_discount_given: orderStats.total_discount_given,
        total_orders_with_coupons: orderStats.total_orders_with_coupons,
        usage_trends: orderStats.usage_trends
      };
    } catch (error) {
      console.error('Error fetching coupon analytics:', error);
      throw error;
    }
  },

  // Validate coupon code (public endpoint)
  validateCoupon: async (code: string, orderAmount: number): Promise<{ coupon: Coupon; discount_amount: number; final_amount: number }> => {
    const response = await api.post<{ success: boolean; data: { coupon: Coupon; discount_amount: number; final_amount: number } }>('/api/coupons/validate', {
      code,
      orderAmount
    });
    return response.data.data;
  },

  // Get best coupon for order amount (public endpoint)
  getBestCoupon: async (orderAmount: number): Promise<{ coupon: Coupon; discount_amount: number; savings_message: string } | null> => {
    const response = await api.get<{ success: boolean; data: { coupon: Coupon; discount_amount: number; savings_message: string } | null }>(`/api/coupons/best-for-order?orderAmount=${orderAmount}`);
    if (response.data.data?.coupon) {
      return response.data.data;
    }
    return null;
  },

  // Get active coupons (public endpoint)
  getActiveCoupons: async (): Promise<Coupon[]> => {
    const response = await api.get<{ success: boolean; data: Coupon[] }>('/api/coupons/active');
    return response.data.data;
  },
};

// Newsletter service
export const newsletterService = {
  // Get subscribers
  getSubscribers: async (params?: { page?: number; limit?: number; active?: boolean; search?: string }): Promise<PaginatedResponse<{ subscribers: NewsletterSubscriber[] }>> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    
    const response = await api.get<PaginatedResponse<{ subscribers: NewsletterSubscriber[] }>>(`/api/newsletter/admin/subscribers?${searchParams.toString()}`);
    return response.data;
  },

  // Get stats
  getStats: async (): Promise<{ overview: NewsletterStats; growth: NewsletterGrowthData[] }> => {
    const response = await api.get<ApiResponse<{ overview: NewsletterStats; growth: NewsletterGrowthData[] }>>('/api/newsletter/admin/stats');
    return response.data.data;
  },

  // Export subscribers
  exportSubscribers: async (format: 'csv' | 'json' = 'csv', active?: boolean): Promise<Blob> => {
    const params = new URLSearchParams({ format });
    if (active !== undefined) {
      params.append('active', String(active));
    }
    
    const response = await api.get(`/api/newsletter/admin/export?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  },
};

// Cart abandonment service
export const cartAbandonmentService = {
  // Get analytics
  getAnalytics: async (days: number = 30): Promise<CartAbandonmentAnalytics> => {
    const response = await api.get<ApiResponse<CartAbandonmentAnalytics>>(`/api/cart-abandonment/analytics?days=${days}`);
    return response.data.data;
  },

  // Process reminders manually
  processReminders: async (): Promise<{ sent: number; failed: number }> => {
    const response = await api.post<ApiResponse<{ sent: number; failed: number }>>('/api/cart-abandonment/process-reminders');
    return response.data.data;
  },
};

// Upload service
export const uploadService = {
  // Upload product images (admin only) - now returns Cloudinary image objects
  uploadProductImages: async (files: File[]): Promise<{original: string, thumb: string, medium: string, large: string}[]> => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    
    const response = await api.post<ApiResponse<{ images: {original: string, thumb: string, medium: string, large: string}[]; count: number }>>('/api/upload/product-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for multiple image uploads to Cloudinary
    });
    
    return response.data.data.images;
  },

  // Upload category image (admin only)
  uploadCategoryImage: async (file: File): Promise<{ image_url: string; public_id: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await api.post<ApiResponse<{ image_url: string; public_id: string }>>('/api/upload/category-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 seconds for single image upload
    });
    
    return response.data.data;
  },

  // Validate file (client-side validation)
  validateFile: async (fileName: string, fileSize: number, fileType: string): Promise<boolean> => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    if (!allowedTypes.includes(fileType)) {
      throw new Error(`File type ${fileType} is not supported. Please use: JPG, PNG, GIF, WEBP`);
    }
    
    if (fileSize > maxSize) {
      throw new Error(`File size ${(fileSize / 1024 / 1024).toFixed(2)}MB exceeds maximum size 10MB`);
    }
    
    if (!allowedExtensions.includes(fileExtension)) {
      throw new Error('File extension not supported. Allowed: JPG, JPEG, PNG, GIF, WEBP');
    }
    
    return true;
  },
};

// Export the main API instance
export default api;