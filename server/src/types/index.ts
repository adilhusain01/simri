export interface User {
  id: string;
  google_id?: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: 'customer' | 'admin';
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ImageObject {
  original: string;
  thumb: string;
  medium: string;
  large: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  sku: string;
  price: number;
  discount_price?: number;
  stock_quantity: number;
  category_id?: string;
  images?: (string | ImageObject)[];
  is_featured: boolean;
  is_active: boolean;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
  created_at: Date;
  updated_at: Date;
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
  postal_code: string;
  country: string;
  phone?: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Cart {
  id: string;
  user_id?: string;
  session_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  price_at_time: number;
  created_at: Date;
  updated_at: Date;
}

export interface Order {
  id: string;
  user_id?: string;
  order_number: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  shipping_status: 'not_shipped' | 'processing' | 'shipped' | 'in_transit' | 'delivered';
  total_amount: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  currency: string;
  shipping_address: Address;
  billing_address?: Address;
  payment_method?: string;
  payment_id?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  tracking_number?: string;
  shipped_at?: Date;
  delivered_at?: Date;
  notes?: string;
  coupon_id?: string;
  coupon_code?: string;
  coupon_discount_amount?: number;
  // Shiprocket integration fields
  shiprocket_order_id?: string;
  shiprocket_shipment_id?: string;
  awb_number?: string;
  courier_name?: string;
  // Cancellation fields
  cancellation_reason?: string;
  cancelled_at?: Date;
  refund_amount?: number;
  refund_status?: 'none' | 'pending' | 'partial' | 'completed' | 'failed';
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot?: Product;
  created_at: Date;
}

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  order_id?: string;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
  is_verified_purchase: boolean;
  is_approved: boolean;
  helpful_count: number;
  created_at: Date;
  updated_at: Date;
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
  valid_from?: Date;
  valid_until?: Date;
  created_at: Date;
  updated_at: Date;
}