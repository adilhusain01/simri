-- Migration: Add refund-related columns to orders table
-- This adds the necessary columns for refund processing functionality

-- Add refund-related columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS razorpay_refund_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE;

-- Add return-related columns (for post-shipment cancellations)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS return_requested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS return_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS return_status VARCHAR(20) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS return_awb VARCHAR(255),
ADD COLUMN IF NOT EXISTS return_courier VARCHAR(255),
ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS return_pickup_scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS return_completed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better query performance on refund fields
CREATE INDEX IF NOT EXISTS idx_orders_refund_status ON orders(refund_status);
CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at ON orders(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_orders_return_status ON orders(return_status);