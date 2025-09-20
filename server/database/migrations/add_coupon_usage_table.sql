-- Migration: Add coupon_usage table for per-user coupon usage tracking
-- This replaces the global usage_limit with per-user usage tracking

-- Create coupon_usage table
CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    discount_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coupon_id, user_id, order_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_used_at ON coupon_usage(used_at);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_user ON coupon_usage(coupon_id, user_id);

-- Add trigger for updated_at if needed (though we don't have updated_at in this table)
-- The table is append-only for audit trail purposes