import pool from '../config/database';
import { Order, OrderItem } from '../types';
import { inventoryService } from '../services/inventoryService';

export class OrderModel {
  static async findByUserId(userId: string, limit: number = 10, offset: number = 0, sortBy: string = 'created_at', sortOrder: string = 'DESC'): Promise<Order[]> {
    // Validate sort field to prevent SQL injection
    const allowedSortFields = ['created_at', 'total_amount', 'order_number', 'status', 'updated_at'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    
    // Validate sort order
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    const result = await pool.query(`
      SELECT * FROM orders 
      WHERE user_id = $1 
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);
    return result.rows;
  }

  static async findById(id: string): Promise<Order | null> {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    const result = await pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);
    return result.rows[0] || null;
  }

  static async create(orderData: Partial<Order>): Promise<Order> {
    const {
      user_id, order_number, status = 'pending', payment_status = 'pending',
      shipping_status = 'not_shipped', total_amount, tax_amount = 0,
      shipping_amount = 0, discount_amount = 0, coupon_id, coupon_code,
      coupon_discount_amount = 0, currency = 'INR',
      shipping_address, billing_address, payment_method, notes
    } = orderData;
    
    const result = await pool.query(`
      INSERT INTO orders (
        user_id, order_number, status, payment_status, shipping_status,
        total_amount, tax_amount, shipping_amount, discount_amount, 
        coupon_id, coupon_code, coupon_discount_amount, currency,
        shipping_address, billing_address, payment_method, notes
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
      RETURNING *
    `, [
      user_id, order_number, status, payment_status, shipping_status,
      total_amount, tax_amount, shipping_amount, discount_amount,
      coupon_id, coupon_code, coupon_discount_amount, currency,
      JSON.stringify(shipping_address), JSON.stringify(billing_address),
      payment_method, notes
    ]);
    
    return result.rows[0];
  }

  static async updateStatus(id: string, status: Order['status']): Promise<Order | null> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current order status
      const currentOrderResult = await client.query(
        'SELECT status FROM orders WHERE id = $1',
        [id]
      );

      if (currentOrderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const currentStatus = currentOrderResult.rows[0].status;

      // Update order status
      const result = await client.query(`
        UPDATE orders 
        SET status = $1, updated_at = NOW() 
        WHERE id = $2 
        RETURNING *
      `, [status, id]);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      // Handle inventory changes based on status changes
      if (currentStatus !== status) {
        if (status === 'cancelled' && ['pending', 'confirmed', 'processing'].includes(currentStatus)) {
          // Order was cancelled - restore inventory
          console.log(`Order ${id} cancelled, restoring inventory`);
          await inventoryService.handleOrderCancellation(id);
        }
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update order status error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updatePaymentStatus(id: string, paymentStatus: Order['payment_status'], paymentId?: string): Promise<Order | null> {
    const result = await pool.query(`
      UPDATE orders 
      SET payment_status = $1, payment_id = $2, updated_at = NOW() 
      WHERE id = $3 
      RETURNING *
    `, [paymentStatus, paymentId, id]);
    
    return result.rows[0] || null;
  }

  static async updateRazorpayOrderId(id: string, razorpayOrderId: string): Promise<Order | null> {
    const result = await pool.query(`
      UPDATE orders 
      SET razorpay_order_id = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `, [razorpayOrderId, id]);
    
    return result.rows[0] || null;
  }

  static async updatePaymentComplete(id: string, paymentStatus: Order['payment_status'], razorpayPaymentId: string): Promise<Order | null> {
    const result = await pool.query(`
      UPDATE orders 
      SET payment_status = $1, payment_id = $2, razorpay_payment_id = $2, updated_at = NOW() 
      WHERE id = $3 
      RETURNING *
    `, [paymentStatus, razorpayPaymentId, id]);
    
    return result.rows[0] || null;
  }

  static async updateShippingStatus(id: string, shippingStatus: Order['shipping_status'], trackingNumber?: string): Promise<Order | null> {
    let sql = 'UPDATE orders SET shipping_status = $1, updated_at = NOW()';
    const params: any[] = [shippingStatus];
    
    if (trackingNumber) {
      sql += ', tracking_number = $2';
      params.push(trackingNumber);
    }
    
    if (shippingStatus === 'shipped') {
      sql += ', shipped_at = NOW()';
    } else if (shippingStatus === 'delivered') {
      sql += ', delivered_at = NOW()';
    }
    
    sql += ` WHERE id = $${params.length + 1} RETURNING *`;
    params.push(id);
    
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
  }

  static async updateShiprocketInfo(
    id: string, 
    shiprocketOrderId: string, 
    shiprocketShipmentId?: string, 
    awbNumber?: string, 
    courierName?: string
  ): Promise<Order | null> {
    const result = await pool.query(`
      UPDATE orders 
      SET shiprocket_order_id = $1, shiprocket_shipment_id = $2, awb_number = $3, 
          courier_name = $4, updated_at = NOW()
      WHERE id = $5 
      RETURNING *
    `, [shiprocketOrderId, shiprocketShipmentId, awbNumber, courierName, id]);
    return result.rows[0] || null;
  }

  static async updateCancellation(
    id: string, 
    cancellationReason: string, 
    refundAmount?: number, 
    refundStatus: Order['refund_status'] = 'pending'
  ): Promise<Order | null> {
    const result = await pool.query(`
      UPDATE orders 
      SET status = 'cancelled', cancellation_reason = $1, cancelled_at = NOW(), 
          refund_amount = $2, refund_status = $3, updated_at = NOW()
      WHERE id = $4 
      RETURNING *
    `, [cancellationReason, refundAmount, refundStatus, id]);
    return result.rows[0] || null;
  }

  static async updateRefundStatus(id: string, refundStatus: Order['refund_status']): Promise<Order | null> {
    const result = await pool.query(`
      UPDATE orders 
      SET refund_status = $1, updated_at = NOW()
      WHERE id = $2 
      RETURNING *
    `, [refundStatus, id]);
    return result.rows[0] || null;
  }

  static async initiateReturn(
    id: string, 
    returnId: string, 
    cancellationReason: string
  ): Promise<Order | null> {
    const result = await pool.query(`
      UPDATE orders 
      SET return_requested = true, return_id = $1, return_status = 'requested', 
          return_requested_at = NOW(), cancellation_reason = $2, updated_at = NOW()
      WHERE id = $3 
      RETURNING *
    `, [returnId, cancellationReason, id]);
    return result.rows[0] || null;
  }

  static async updateReturnStatus(
    id: string, 
    returnStatus: string, 
    returnAwb?: string, 
    returnCourier?: string
  ): Promise<Order | null> {
    let sql = 'UPDATE orders SET return_status = $1, updated_at = NOW()';
    const params: any[] = [returnStatus];
    
    if (returnAwb) {
      sql += ', return_awb = $2';
      params.push(returnAwb);
    }
    
    if (returnCourier) {
      sql += ', return_courier = $' + (params.length + 1);
      params.push(returnCourier);
    }
    
    if (returnStatus === 'pickup_scheduled') {
      sql += ', return_pickup_scheduled_at = NOW()';
    } else if (returnStatus === 'completed') {
      sql += ', return_completed_at = NOW()';
    }
    
    sql += ` WHERE id = $${params.length + 1} RETURNING *`;
    params.push(id);
    
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
  }

  static async generateOrderNumber(): Promise<string> {
    const prefix = 'ORD';
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }
}

export class OrderItemModel {
  static async findByOrderId(orderId: string): Promise<OrderItem[]> {
    const result = await pool.query(`
      SELECT oi.*
      FROM order_items oi 
      WHERE oi.order_id = $1
    `, [orderId]);
    
    // Parse product_snapshot for each item
    return result.rows.map(item => {
      let product_snapshot = null;
      if (item.product_snapshot) {
        try {
          product_snapshot = typeof item.product_snapshot === 'string' 
            ? JSON.parse(item.product_snapshot) 
            : item.product_snapshot;
        } catch (error) {
          console.warn('Failed to parse product_snapshot:', item.product_snapshot, error);
        }
      }
      
      return {
        ...item,
        product_snapshot
      };
    });
  }

  static async create(orderItemData: Partial<OrderItem>): Promise<OrderItem> {
    const {
      order_id, product_id, product_name, product_sku,
      quantity, unit_price, total_price, product_snapshot
    } = orderItemData;
    
    const result = await pool.query(`
      INSERT INTO order_items (
        order_id, product_id, product_name, product_sku,
        quantity, unit_price, total_price, product_snapshot
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *
    `, [
      order_id, product_id, product_name, product_sku,
      quantity, unit_price, total_price, JSON.stringify(product_snapshot)
    ]);
    
    return result.rows[0];
  }
}