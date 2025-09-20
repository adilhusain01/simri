import axios, { type AxiosInstance, AxiosError } from 'axios';
import { toast } from 'sonner';
import type {
  ApiResponse,
  PaginatedResponse,
  User,
  Product,
  Cart,
  Order,
  Review,
  Category,
  Wishlist,
  Coupon,
  CouponValidationResponse,
  BestCouponResponse,
  Recommendation,
  NewsletterSubscriber,
  NewsletterStats,
  NewsletterGrowthData,
  SearchFilters,
  PaginationParams,
  LoginResponse,
  RegisterRequest,
  AddToCartRequest,
  UpdateCartItemRequest,
  CreateOrderRequest,
  CreateOrderResponse,
  AddReviewRequest,
  UpdateProfileRequest,
  Address,
  AddressFormRequest,
  ApiError
} from '../types';

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
  withCredentials: true, // Important for session-based auth
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens or headers here if needed
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
    
    // Don't show toast for certain errors or endpoints that handle their own toasts
    const isNewsletterEndpoint = error.config?.url?.includes('/newsletter/');
    const shouldSkipToast = error.response?.status === 401 || isNewsletterEndpoint;
    
    if (!shouldSkipToast) {
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

// API Services
export const authService = {
  // Check authentication status
  me: async (): Promise<User> => {
    const response = await api.get<{ success: boolean; user: User }>('/api/auth/me');
    return response.data.user;
  },

  // Login with email and password
  login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
    const response = await api.post<{ success: boolean; data: { user: User }; message: string }>('/api/auth/login', credentials);
    return { user: response.data.data.user };
  },

  // Register new user
  register: async (userData: RegisterRequest): Promise<LoginResponse> => {
    const response = await api.post<{ success: boolean; user: User; message: string }>('/api/auth/register', userData);
    return { user: response.data.user };
  },

  // Google OAuth login
  googleLogin: (): void => {
    window.location.href = `${api.defaults.baseURL}/api/auth/google`;
  },

  // Google OAuth callback
  googleCallback: async (params: { code: string; state?: string | null }): Promise<LoginResponse> => {
    const response = await api.post<ApiResponse<LoginResponse>>('/api/auth/google/callback', params);
    return response.data.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    await api.post<ApiResponse<null>>('/api/auth/logout');
  },

  // Password reset request
  forgotPassword: async (email: string): Promise<void> => {
    await api.post<ApiResponse<null>>('/api/auth/forgot-password', { email });
  },

  // Verify email address
  verifyEmail: async (token: string): Promise<void> => {
    await api.get<ApiResponse<null>>(`/api/auth/verify-email/${token}`);
  },

  // Verify reset token
  verifyResetToken: async (token: string): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(`/api/auth/reset-password/${token}`);
    return response.data;
  },

  // Reset password with token
  resetPassword: async (token: string, password: string): Promise<void> => {
    await api.post<ApiResponse<null>>('/api/auth/reset-password', { 
      token, 
      newPassword: password,
      confirmPassword: password
    });
  },
};

export const productService = {
  // Get all products with filters
  getProducts: async (
    filters?: SearchFilters,
    pagination?: PaginationParams
  ): Promise<{ data: { products: Product[] }; pagination: { page: number; limit: number; total: number; totalPages: number; } }> => {
    const params = { ...filters, ...pagination };
    const response = await api.get<{ success: boolean; data: Product[]; pagination: { page: number; limit: number; total: number; totalPages: number; } }>(
      '/api/products',
      { params }
    );
    return {
      data: { products: response.data.data },
      pagination: response.data.pagination
    };
  },

  // Get single product
  getProduct: async (id: string): Promise<Product> => {
    const response = await api.get<ApiResponse<Product>>(`/api/products/${id}`);
    const product = response.data.data;
    
    // Transform snake_case fields to camelCase for consistency
    return {
      ...product,
      totalReviews: (product as any).total_reviews || 0,
      averageRating: (product as any).average_rating || 0,
    };
  },

  // Search products
  searchProducts: async (
    query: string,
    filters?: SearchFilters,
    pagination?: PaginationParams
  ): Promise<{ data: { products: Product[] }; pagination: { page: number; limit: number; total: number; totalPages: number; } }> => {
    const params = { q: query, ...filters, ...pagination };
    const response = await api.get<{ success: boolean; data: { products: Product[] }; pagination: { page: number; limit: number; total: number; totalPages: number; } }>(
      '/api/products/search',
      { params }
    );
    return {
      data: response.data.data,
      pagination: response.data.pagination
    };
  },

  // Get product categories
  getCategories: async (): Promise<Category[]> => {
    const response = await api.get<ApiResponse<Category[]>>('/api/products/categories');
    return response.data.data;
  },
};

export const cartService = {
  // Get user cart
  getCart: async (): Promise<Cart> => {
    const response = await api.get<ApiResponse<Cart>>('/api/cart');
    return response.data.data;
  },

  // Add item to cart
  addItem: async (request: AddToCartRequest): Promise<void> => {
    await api.post<ApiResponse<null>>('/api/cart/add', request);
  },

  // Update cart item
  updateItem: async (itemId: string, request: UpdateCartItemRequest): Promise<void> => {
    await api.put<ApiResponse<null>>(`/api/cart/update/${itemId}`, request);
  },

  // Remove item from cart
  removeItem: async (itemId: string): Promise<void> => {
    await api.delete<ApiResponse<null>>(`/api/cart/remove/${itemId}`);
  },

  // Clear cart
  clearCart: async (): Promise<void> => {
    await api.delete<ApiResponse<null>>('/api/cart/clear');
  },
};

export const orderService = {
  // Get user orders
  getOrders: async (pagination?: PaginationParams & { sortBy?: string; sortOrder?: string }): Promise<PaginatedResponse<{ orders: Order[] }>> => {
    const response = await api.get<PaginatedResponse<{ orders: Order[] }>>(
      '/api/orders',
      { params: pagination }
    );
    return response.data;
  },

  // Get single order
  getOrder: async (id: string): Promise<Order> => {
    const response = await api.get<ApiResponse<Order>>(`/api/orders/${id}`);
    return response.data.data;
  },

  // Create order
  createOrder: async (request: CreateOrderRequest): Promise<CreateOrderResponse> => {
    const response = await api.post<ApiResponse<CreateOrderResponse>>('/api/orders/create', request);
    return response.data.data;
  },

  // Track order
  trackOrder: async (orderNumber: string): Promise<Order> => {
    const response = await api.get<ApiResponse<Order>>(`/api/orders/track/${orderNumber}`);
    return response.data.data;
  },

  // Cancel order
  cancelOrder: async (orderId: string, cancellationReason: string): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await api.post<ApiResponse<any>>(`/api/orders/${orderId}/cancel`, { cancellation_reason: cancellationReason });
    return {
      success: response.data.success,
      message: response.data.message || 'Order cancelled successfully',
      data: response.data.data
    };
  },

  // Get order tracking information
  getOrderTracking: async (orderId: string): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(`/api/orders/${orderId}/tracking`);
    return response.data.data;
  },
};

export const wishlistService = {
  // Get user wishlist
  getWishlist: async (): Promise<Wishlist> => {
    const response = await api.get<ApiResponse<{ items: any[], total: number, page: number, limit: number, totalPages: number }>>('/api/wishlist');
    const data = response.data.data;
    return {
      id: 'user-wishlist',
      items: data.items,
      totalItems: data.total
    };
  },

  // Add item to wishlist
  addItem: async (productId: string): Promise<void> => {
    await api.post<ApiResponse<null>>('/api/wishlist/add', { productId });
  },

  // Remove item from wishlist
  removeItem: async (productId: string): Promise<void> => {
    await api.delete<ApiResponse<null>>(`/api/wishlist/remove/${productId}`);
  },

  // Move item to cart
  moveToCart: async (itemId: string, quantity: number = 1): Promise<void> => {
    await api.post<ApiResponse<null>>(`/api/wishlist/move-to-cart/${itemId}`, { quantity });
  },

  // Move multiple items to cart
  moveMultipleToCart: async (productIds: string[]): Promise<void> => {
    await api.post<ApiResponse<null>>('/api/wishlist/move-to-cart', { productIds });
  },

  // Clear entire wishlist
  clearWishlist: async (): Promise<void> => {
    await api.delete<ApiResponse<null>>('/api/wishlist/clear');
  },
};

export const reviewService = {
  // Get product reviews
  getProductReviews: async (
    productId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<{ reviews: Review[] }>> => {
    const response = await api.get<PaginatedResponse<{ reviews: Review[] }>>(
      `/api/reviews/product/${productId}`,
      { params: pagination }
    );
    return response.data;
  },

  // Get user's reviews
  getUserReviews: async (pagination?: PaginationParams): Promise<{ success: boolean; data: Review[] }> => {
    const response = await api.get<{ success: boolean; data: Review[] }>(
      '/api/reviews/user',
      { params: pagination }
    );
    return response.data;
  },

  // Add review
  addReview: async (request: AddReviewRequest): Promise<Review> => {
    // Map field names to match server expectations
    const serverRequest = {
      product_id: request.productId,
      order_id: request.orderId,
      rating: request.rating,
      title: request.title,
      comment: request.comment,
      images: request.images,
    };
    const response = await api.post<ApiResponse<Review>>('/api/reviews', serverRequest);
    return response.data.data;
  },

  // Update review
  updateReview: async (id: string, request: Partial<AddReviewRequest>): Promise<Review> => {
    // Map field names to match server expectations
    const serverRequest: any = {};
    if (request.productId !== undefined) serverRequest.product_id = request.productId;
    if (request.orderId !== undefined) serverRequest.order_id = request.orderId;
    if (request.rating !== undefined) serverRequest.rating = request.rating;
    if (request.title !== undefined) serverRequest.title = request.title;
    if (request.comment !== undefined) serverRequest.comment = request.comment;
    if (request.images !== undefined) serverRequest.images = request.images;
    
    const response = await api.put<ApiResponse<Review>>(`/api/reviews/${id}`, serverRequest);
    return response.data.data;
  },

  // Delete review
  deleteReview: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<null>>(`/api/reviews/${id}`);
  },
};

export const recommendationService = {
  // Get homepage recommendations
  getHomepageRecommendations: async (): Promise<{
    trending: { title: string; products: Recommendation[] };
    newArrivals: { title: string; products: Recommendation[] };
    personalized?: { title: string; products: Recommendation[] };
  }> => {
    const response = await api.get<ApiResponse<any>>('/api/recommendations/homepage');
    return response.data.data;
  },

  // Get related products
  getRelatedProducts: async (productId: string, limit: number = 8): Promise<Recommendation[]> => {
    const response = await api.get<ApiResponse<{ products: Recommendation[] }>>(
      `/api/recommendations/related/${productId}`,
      { params: { limit } }
    );
    return response.data.data.products;
  },

  // Get customers also bought
  getCustomersAlsoBought: async (productId: string, limit: number = 6): Promise<Recommendation[]> => {
    const response = await api.get<ApiResponse<{ products: Recommendation[] }>>(
      `/api/recommendations/also-bought/${productId}`,
      { params: { limit } }
    );
    return response.data.data.products;
  },

  // Get personalized recommendations
  getPersonalizedRecommendations: async (limit: number = 10): Promise<Recommendation[]> => {
    const response = await api.get<ApiResponse<{ products: Recommendation[] }>>(
      '/api/recommendations/personalized',
      { params: { limit } }
    );
    return response.data.data.products;
  },
};

export const userService = {
  // Update profile
  updateProfile: async (request: UpdateProfileRequest): Promise<User> => {
    const response = await api.put<ApiResponse<User>>('/api/profile', request);
    return response.data.data;
  },

  // Change password
  changePassword: async (request: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<void> => {
    await api.put<ApiResponse<null>>('/api/profile/password', request);
  },

  // Get addresses
  getAddresses: async (): Promise<Address[]> => {
    const response = await api.get<ApiResponse<Address[]>>('/api/addresses');
    return response.data.data;
  },

  // Add address
  addAddress: async (address: AddressFormRequest): Promise<Address> => {
    const response = await api.post<ApiResponse<Address>>('/api/addresses', address);
    return response.data.data;
  },

  // Update address
  updateAddress: async (id: string, address: Partial<Address>): Promise<Address> => {
    const response = await api.put<ApiResponse<Address>>(`/api/addresses/${id}`, address);
    return response.data.data;
  },

  // Delete address
  deleteAddress: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<null>>(`/api/addresses/${id}`);
  },
};

export const couponService = {
  // Validate coupon
  validateCoupon: async (code: string, orderAmount: number): Promise<CouponValidationResponse> => {
    const response = await api.post<ApiResponse<CouponValidationResponse>>('/api/coupons/validate', {
      code,
      orderAmount,
    });
    return response.data.data;
  },

  // Get best coupon for order
  getBestCoupon: async (orderAmount: number): Promise<BestCouponResponse | null> => {
    const response = await api.get<ApiResponse<BestCouponResponse | null>>(`/api/coupons/best-for-order?orderAmount=${orderAmount}`);
    return response.data.data;
  },

  // Get active coupons
  getActiveCoupons: async (): Promise<Coupon[]> => {
    const response = await api.get<ApiResponse<Coupon[]>>('/api/coupons/active');
    return response.data.data;
  },
};

export const paymentService = {
  // Create payment intent
  createPaymentIntent: async (orderId: string, _amount: number): Promise<any> => {
    const response = await api.post<ApiResponse<any>>('/api/payments/create-order', { order_id: orderId });
    return response.data.data;
  },

  // Verify payment
  verifyPayment: async (paymentData: {
    order_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<void> => {
    await api.post<ApiResponse<null>>('/api/payments/verify', paymentData);
  },
};

export const newsletterService = {
  // Subscribe to newsletter
  subscribe: async (email: string, name?: string, preferences?: any): Promise<void> => {
    await api.post<ApiResponse<null>>('/api/newsletter/subscribe', {
      email,
      name,
      preferences,
    });
  },

  // Unsubscribe from newsletter
  unsubscribe: async (email: string): Promise<void> => {
    await api.post<ApiResponse<null>>('/api/newsletter/unsubscribe', { email });
  },

  // Update preferences
  updatePreferences: async (email: string, preferences: any): Promise<void> => {
    await api.put<ApiResponse<null>>('/api/newsletter/preferences', {
      email,
      preferences,
    });
  },

  // Check subscription status
  getSubscriptionStatus: async (email: string): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(`/api/newsletter/status?email=${email}`);
    return response.data.data;
  },

  // Admin methods
  // Get all subscribers with pagination and filters
  getSubscribers: async (params?: {
    page?: number;
    limit?: number;
    active?: boolean;
  }): Promise<PaginatedResponse<{ subscribers: NewsletterSubscriber[] }>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.active !== undefined) searchParams.append('active', params.active.toString());
    
    const response = await api.get<PaginatedResponse<{ subscribers: NewsletterSubscriber[] }>>(
      `/api/newsletter/admin/subscribers?${searchParams.toString()}`
    );
    return response.data;
  },

  // Get newsletter statistics
  getStats: async (): Promise<{ overview: NewsletterStats; growth: NewsletterGrowthData[] }> => {
    const response = await api.get<ApiResponse<{ overview: NewsletterStats; growth: NewsletterGrowthData[] }>>(
      '/api/newsletter/admin/stats'
    );
    return response.data.data;
  },

  // Export subscribers
  exportSubscribers: async (params?: {
    format?: 'csv' | 'json';
    active?: boolean;
  }): Promise<Blob> => {
    const searchParams = new URLSearchParams();
    if (params?.format) searchParams.append('format', params.format);
    if (params?.active !== undefined) searchParams.append('active', params.active.toString());

    const response = await api.get(`/api/newsletter/admin/export?${searchParams.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  },
};

export const uploadService = {
  // Upload avatar
  uploadAvatar: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post<ApiResponse<{ avatar_url: string }>>('/api/upload/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data.avatar_url;
  },

  // Upload review images
  uploadReviewImages: async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    const response = await api.post<ApiResponse<{ images: string[]; count: number }>>('/api/upload/review-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data.images;
  },

  // Validate file (simplified - client-side validation only)
  validateFile: async (fileName: string, fileSize: number, fileType: string): Promise<boolean> => {
    // Client-side validation only to avoid server API issues
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

export const inventoryService = {
  // Get available stock
  getAvailableStock: async (productId: string): Promise<number> => {
    const response = await api.get<ApiResponse<{ available: number }>>(`/api/inventory/available/${productId}`);
    return response.data.data.available;
  },

};

// Export the main API instance
export default api;