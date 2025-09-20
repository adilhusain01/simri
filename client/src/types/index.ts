// Core types for the application
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin';
  is_verified: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description?: string;
  price: string;
  discountPrice?: number;
  discount_price?: string;
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
  averageRating?: number;
  totalReviews?: number;
  created_at: string;
  updated_at: string;
  // Legacy fields for backwards compatibility
  imageUrl?: string;
  category?: string;
  stockQuantity?: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  price_at_time: number;
  created_at: string;
  updated_at: string;
  // Product data (joined from products table)
  name: string;
  images: string[];
  current_price: number;
  stock_quantity: number;
  // Legacy fields for backwards compatibility
  productId?: string;
  product?: Product;
  priceAtTime?: number;
}

export interface Cart {
  cart_id: string;
  items: CartItem[];
  subtotal: number;
  item_count: number;
  // Legacy fields for backwards compatibility
  id?: string;
  itemCount?: number;
}

export interface Address {
  id: string;
  user_id: string;
  type: 'shipping' | 'billing';
  first_name: string;
  last_name: string;
  company?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  // Legacy fields for backwards compatibility
  name?: string;
  street?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingStatus?: 'not_shipped' | 'processing' | 'shipped' | 'in_transit' | 'delivered';
  totalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  trackingNumber?: string;
  awbNumber?: string;
  courierName?: string;
  shippedAt?: string;
  deliveredAt?: string;
  // Cancellation fields
  cancellationReason?: string;
  cancelledAt?: string;
  refundAmount?: number;
  refundStatus?: 'none' | 'pending' | 'partial' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  priceAtTime: number;
  total: number;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  is_verified_purchase: boolean;
  helpful_count?: number;
  created_at: string;
  updated_at: string;
  product_name?: string; // Product name when getting user reviews
  product_images?: string[]; // Product images when getting user reviews
  // Legacy fields for backwards compatibility
  productId?: string;
  userId?: string;
  user?: Pick<User, 'id' | 'name' | 'avatar'>;
  isVerified?: boolean;
  createdAt?: string;
}

export interface Wishlist {
  id: string;
  items: WishlistItem[];
  totalItems: number;
}

export interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
  addedAt: string;
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
  // Computed fields (calculated by backend during validation)
  discount_amount?: number;
  final_amount?: number;
  savings_message?: string;
}

// API Response interfaces for coupon validation and best coupon
export interface CouponValidationResponse {
  coupon: Coupon;
  discount_amount: number;
  final_amount: number;
}

export interface BestCouponResponse {
  coupon: Coupon;
  discount_amount: number;
  savings_message: string;
}

export interface Recommendation {
  id: string;
  name: string;
  price: number;
  images: string[];
  category_name?: string;
  averageRating?: number;
  totalReviews?: number;
  score: number;
  // Legacy fields for backwards compatibility
  imageUrl?: string;
  category?: string;
}

export interface SearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  tags?: string[];
  sortBy?: 'relevance' | 'price_low' | 'price_high' | 'rating' | 'newest';
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Request/Response types
export interface LoginResponse {
  user: User;
  token?: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CreateOrderAddressData {
  type: 'shipping' | 'billing';
  first_name: string;
  last_name: string;
  company?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone?: string;
  is_default: boolean;
}

export interface CreateOrderRequest {
  shipping_address: CreateOrderAddressData;
  billing_address?: CreateOrderAddressData;
  payment_method: string;
  coupon_code?: string;
}

export interface CreateOrderResponse {
  order_id: string;
  order_number: string;
  total_amount: number;
}

export interface AddReviewRequest {
  productId: string;
  orderId?: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
}

export interface UpdateProfileRequest {
  name?: string;
}

export interface AddressFormRequest {
  type: 'shipping' | 'billing';
  first_name: string;
  last_name: string;
  company?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone?: string;
  is_default: boolean;
}

// Store types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<any>;
  handleOAuthCallback: (params: { code: string; state?: string | null }) => Promise<any>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
}

export interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  appliedCoupon: Coupon | null;
  addItem: (productId: string, quantity: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  fetchCart: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;
}

export interface WishlistState {
  wishlist: Wishlist | null;
  isLoading: boolean;
  addItem: (productId: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  fetchWishlist: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

// Error types
export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

// Component props types
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface InputProps {
  label?: string;
  placeholder?: string;
  type?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name?: string;
  is_active: boolean;
  preferences?: Record<string, any>;
  created_at: string;
  updated_at: string;
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