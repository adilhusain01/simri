import pool from '../config/database';

interface Coupon {
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

interface CouponValidationResult {
  isValid: boolean;
  coupon?: Coupon;
  discountAmount?: number;
  error?: string;
}

interface CouponApplication {
  couponId: string;
  orderAmount: number;
  discountAmount: number;
  finalAmount: number;
}

class CouponService {
  
  // Validate and calculate discount for a coupon
  async validateCoupon(code: string, orderAmount: number, userId?: string): Promise<CouponValidationResult> {
    try {
      // Get coupon details
      const couponResult = await pool.query(`
        SELECT * FROM coupons 
        WHERE UPPER(code) = UPPER($1) AND is_active = true
      `, [code]);

      if (couponResult.rows.length === 0) {
        return { isValid: false, error: 'Invalid coupon code' };
      }

      const coupon: Coupon = couponResult.rows[0];

      // Check if coupon is within valid date range
      const now = new Date();
      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        return { isValid: false, error: 'Coupon is not yet active' };
      }

      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        return { isValid: false, error: 'Coupon has expired' };
      }

      // Check per-user usage limit
      if (coupon.usage_limit && userId) {
        const userUsageResult = await pool.query(`
          SELECT COUNT(*) as usage_count 
          FROM coupon_usage 
          WHERE coupon_id = $1 AND user_id = $2
        `, [coupon.id, userId]);
        
        const userUsageCount = parseInt(userUsageResult.rows[0].usage_count);
        
        if (userUsageCount >= coupon.usage_limit) {
          return { 
            isValid: false, 
            error: `You have reached the usage limit for this coupon (${coupon.usage_limit} uses per user)` 
          };
        }
      }

      // Check minimum order amount
      if (coupon.minimum_order_amount && orderAmount < parseFloat(coupon.minimum_order_amount.toString())) {
        return { 
          isValid: false, 
          error: `Minimum order amount of ₹${coupon.minimum_order_amount} required` 
        };
      }


      // Calculate discount amount
      let discountAmount = 0;
      if (coupon.type === 'percentage') {
        discountAmount = (orderAmount * parseFloat(coupon.value.toString())) / 100;
        
        // Apply maximum discount limit if specified
        if (coupon.maximum_discount_amount) {
          discountAmount = Math.min(discountAmount, parseFloat(coupon.maximum_discount_amount.toString()));
        }
      } else if (coupon.type === 'fixed') {
        discountAmount = Math.min(parseFloat(coupon.value.toString()), orderAmount);
      }

      // Round to 2 decimal places
      discountAmount = Math.round(discountAmount * 100) / 100;

      return {
        isValid: true,
        coupon,
        discountAmount
      };
    } catch (error) {
      console.error('Coupon validation error:', error);
      return { isValid: false, error: 'Error validating coupon' };
    }
  }

  // Apply coupon to an order (track per-user usage)
  async applyCoupon(couponId: string, orderId: string, userId: string, discountAmount: number): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get order details to verify it exists and get user_id if not provided
      const orderResult = await client.query(`
        SELECT user_id, coupon_discount_amount FROM orders WHERE id = $1
      `, [orderId]);

      if (orderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const order = orderResult.rows[0];
      const actualUserId = userId || order.user_id;
      const actualDiscountAmount = discountAmount || parseFloat(order.coupon_discount_amount) || 0;

      // Record the coupon usage in coupon_usage table
      await client.query(`
        INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (coupon_id, user_id, order_id) DO NOTHING
      `, [couponId, actualUserId, orderId, actualDiscountAmount]);

      // Update global used_count for reporting purposes (optional)
      await client.query(`
        UPDATE coupons 
        SET used_count = used_count + 1, updated_at = NOW()
        WHERE id = $1
      `, [couponId]);

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Apply coupon error:', error);
      return false;
    } finally {
      client.release();
    }
  }

  // Get all active coupons (for admin or public display)
  async getActiveCoupons(isPublic: boolean = false): Promise<Coupon[]> {
    try {
      let query = `
        SELECT * FROM coupons 
        WHERE is_active = true
      `;

      if (isPublic) {
        query += ` AND (valid_until IS NULL OR valid_until > NOW())`;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Get active coupons error:', error);
      return [];
    }
  }

  // Create a new coupon (admin only)
  async createCoupon(couponData: Partial<Coupon>, _adminId: string): Promise<{ success: boolean; coupon?: Coupon; error?: string }> {
    try {
      const {
        code,
        name,
        description,
        type,
        value,
        minimum_order_amount,
        maximum_discount_amount,
        usage_limit,
        valid_from,
        valid_until
      } = couponData;

      // Validate required fields
      if (!code || !name || !type || !value) {
        return { success: false, error: 'Code, name, type, and value are required' };
      }

      // Validate coupon type and value
      if (!['percentage', 'fixed'].includes(type)) {
        return { success: false, error: 'Invalid coupon type. Must be percentage or fixed' };
      }

      if (type === 'percentage' && (value < 0 || value > 100)) {
        return { success: false, error: 'Percentage value must be between 0 and 100' };
      }

      if (type === 'fixed' && value < 0) {
        return { success: false, error: 'Fixed value must be greater than 0' };
      }

      // Check if coupon code already exists
      const existingCoupon = await pool.query('SELECT id FROM coupons WHERE UPPER(code) = UPPER($1)', [code]);
      if (existingCoupon.rows.length > 0) {
        return { success: false, error: 'Coupon code already exists' };
      }

      // Create coupon
      const result = await pool.query(`
        INSERT INTO coupons (
          code, name, description, type, value, 
          minimum_order_amount, maximum_discount_amount, 
          usage_limit, valid_from, valid_until
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        code.toUpperCase(),
        name,
        description,
        type,
        value,
        minimum_order_amount,
        maximum_discount_amount,
        usage_limit,
        valid_from,
        valid_until
      ]);

      return { success: true, coupon: result.rows[0] };
    } catch (error) {
      console.error('Create coupon error:', error);
      return { success: false, error: 'Error creating coupon' };
    }
  }

  // Update coupon (admin only)
  async updateCoupon(couponId: string, updateData: Partial<Coupon>): Promise<{ success: boolean; coupon?: Coupon; error?: string }> {
    try {
      const allowedFields = [
        'name', 'description', 'value', 'minimum_order_amount',
        'maximum_discount_amount', 'usage_limit', 'is_active',
        'valid_from', 'valid_until'
      ];

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key as keyof Coupon] !== undefined) {
          updates.push(`${key} = $${paramCount}`);
          values.push(updateData[key as keyof Coupon]);
          paramCount++;
        }
      });

      if (updates.length === 0) {
        return { success: false, error: 'No valid fields to update' };
      }

      updates.push(`updated_at = NOW()`);
      values.push(couponId);

      const query = `
        UPDATE coupons 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return { success: false, error: 'Coupon not found' };
      }

      return { success: true, coupon: result.rows[0] };
    } catch (error) {
      console.error('Update coupon error:', error);
      return { success: false, error: 'Error updating coupon' };
    }
  }

  // Delete coupon (admin only)
  async deleteCoupon(couponId: string, hardDelete: boolean = false): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      if (hardDelete) {
        // Hard delete - remove coupon and usage records but preserve orders
        console.log(`🗑️ Performing hard delete for coupon ${couponId}`);
        
        // First, log how many usage records will be deleted
        const usageCount = await client.query(`
          SELECT COUNT(*) as count FROM coupon_usage WHERE coupon_id = $1
        `, [couponId]);
        
        console.log(`   Will delete ${usageCount.rows[0].count} usage records`);
        
        // Delete coupon usage records first
        await client.query(`
          DELETE FROM coupon_usage WHERE coupon_id = $1
        `, [couponId]);
        
        // Clear coupon references from orders (preserve orders but remove coupon link)
        const orderUpdate = await client.query(`
          UPDATE orders 
          SET coupon_id = NULL, updated_at = NOW()
          WHERE coupon_id = $1
          RETURNING id
        `, [couponId]);
        
        console.log(`   Updated ${orderUpdate.rows.length} orders (removed coupon reference, preserved order data)`);
        
        // Delete the coupon
        const result = await client.query(`
          DELETE FROM coupons WHERE id = $1 RETURNING id
        `, [couponId]);

        await client.query('COMMIT');
        
        if (result.rows.length > 0) {
          console.log(`✅ Coupon ${couponId} and usage records deleted successfully (orders preserved)`);
          return true;
        }
        return false;
      } else {
        // Soft delete - just set is_active to false (preserves everything)
        console.log(`📋 Performing soft delete (deactivation) for coupon ${couponId}`);
        
        const result = await client.query(`
          UPDATE coupons 
          SET is_active = false, updated_at = NOW()
          WHERE id = $1
          RETURNING id
        `, [couponId]);

        await client.query('COMMIT');
        
        if (result.rows.length > 0) {
          console.log(`✅ Coupon ${couponId} deactivated successfully (all data preserved)`);
          return true;
        }
        return false;
      }
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Delete coupon error:', error);
      return false;
    } finally {
      client.release();
    }
  }

  // Get overall coupon statistics (admin only)
  async getOverallCouponStats(): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(c.id) as total_coupons,
          COUNT(CASE WHEN c.is_active = true THEN 1 END) as active_coupons,
          COALESCE(SUM(o.discount_amount), 0) as total_discount_given,
          COUNT(DISTINCT o.id) as total_orders_with_coupons
        FROM coupons c
        LEFT JOIN orders o ON c.id = o.coupon_id AND o.payment_status = 'paid'
      `);

      return result.rows[0] || {
        total_coupons: 0,
        active_coupons: 0,
        total_discount_given: 0,
        total_orders_with_coupons: 0
      };
    } catch (error) {
      console.error('Get overall coupon stats error:', error);
      return {
        total_coupons: 0,
        active_coupons: 0,
        total_discount_given: 0,
        total_orders_with_coupons: 0
      };
    }
  }

  // Get coupon usage statistics (admin only)
  async getCouponStats(couponId: string): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          c.*,
          COUNT(o.id) as total_orders_with_coupon,
          COALESCE(SUM(o.discount_amount), 0) as total_discount_given,
          COALESCE(SUM(o.total_amount), 0) as total_order_value
        FROM coupons c
        LEFT JOIN orders o ON c.id = o.coupon_id AND o.payment_status = 'paid'
        WHERE c.id = $1
        GROUP BY c.id
      `, [couponId]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Get coupon stats error:', error);
      return null;
    }
  }

  // Get best available coupon for order amount
  async getBestCouponForOrder(orderAmount: number, userId?: string): Promise<{ coupon?: Coupon; discountAmount?: number }> {
    try {
      const coupons = await this.getActiveCoupons(true);
      let bestCoupon: Coupon | undefined;
      let maxDiscount = 0;

      for (const coupon of coupons) {
        const validation = await this.validateCoupon(coupon.code, orderAmount, userId);
        if (validation.isValid && validation.discountAmount && validation.discountAmount > maxDiscount) {
          maxDiscount = validation.discountAmount;
          bestCoupon = coupon;
        }
      }

      return bestCoupon ? { coupon: bestCoupon, discountAmount: maxDiscount } : {};
    } catch (error) {
      console.error('Get best coupon error:', error);
      return {};
    }
  }
}

export const couponService = new CouponService();