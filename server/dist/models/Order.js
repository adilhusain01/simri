"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderItemModel = exports.OrderModel = void 0;
const database_1 = __importDefault(require("../config/database"));
const inventoryService_1 = require("../services/inventoryService");
const shiprocketService_1 = require("../services/shiprocketService");
const razorpayService_1 = require("../services/razorpayService");
const emailService_1 = require("../services/emailService");
class OrderModel {
    static async findByUserId(userId, limit = 10, offset = 0, sortBy = 'created_at', sortOrder = 'DESC') {
        // Validate sort field to prevent SQL injection
        const allowedSortFields = ['created_at', 'total_amount', 'order_number', 'status', 'updated_at'];
        const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        // Validate sort order
        const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
        const result = await database_1.default.query(`
      SELECT * FROM orders 
      WHERE user_id = $1 
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);
        return result.rows;
    }
    static async findById(id) {
        const result = await database_1.default.query('SELECT * FROM orders WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    static async findByOrderNumber(orderNumber) {
        const result = await database_1.default.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);
        return result.rows[0] || null;
    }
    static async create(orderData) {
        const { user_id, order_number, status = 'pending', payment_status = 'pending', shipping_status = 'not_shipped', total_amount, tax_amount = 0, shipping_amount = 0, discount_amount = 0, coupon_id, coupon_code, coupon_discount_amount = 0, currency = 'INR', shipping_address, billing_address, payment_method, notes } = orderData;
        const result = await database_1.default.query(`
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
    static async updateStatus(id, status) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get current order status
            const currentOrderResult = await client.query('SELECT status FROM orders WHERE id = $1', [id]);
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
                if (status === 'cancelled' && ['pending', 'confirmed', 'processing', 'shipped'].includes(currentStatus)) {
                    // Order was cancelled - restore inventory
                    console.log(`Order ${id} cancelled, restoring inventory`);
                    await inventoryService_1.inventoryService.handleOrderCancellation(id);
                    // Update shipping status to cancelled
                    await client.query(`
            UPDATE orders 
            SET shipping_status = 'cancelled', cancelled_at = NOW()
            WHERE id = $1
          `, [id]);
                    // Cancel with Shiprocket if order was shipped
                    const currentOrderData = result.rows[0];
                    if (currentOrderData.shiprocket_order_id) {
                        try {
                            console.log(`Cancelling Shiprocket order: ${currentOrderData.shiprocket_order_id}`);
                            await shiprocketService_1.shiprocketService.cancelOrder(currentOrderData.shiprocket_order_id);
                            console.log(`Shiprocket order cancelled successfully`);
                        }
                        catch (shiprocketError) {
                            console.error('Shiprocket cancellation failed:', shiprocketError);
                            // Don't fail the entire transaction - log and continue
                        }
                    }
                    // Process automatic refund if payment was completed
                    if (currentOrderData.payment_status === 'paid' && currentOrderData.razorpay_payment_id) {
                        try {
                            console.log(`Processing refund for payment: ${currentOrderData.razorpay_payment_id}`);
                            const refundResult = await razorpayService_1.razorpayService.processOrderCancellationRefund(currentOrderData.razorpay_payment_id, id, 'Order cancelled by customer');
                            if (refundResult.success) {
                                // Update order with refund information
                                const refundAmountInRupees = refundResult.amount ? refundResult.amount / 100 : currentOrderData.total_amount;
                                await client.query(`
                  UPDATE orders 
                  SET refund_status = 'processed', refund_amount = $1, razorpay_refund_id = $2, refunded_at = NOW()
                  WHERE id = $3
                `, [refundAmountInRupees, refundResult.refundId, id]); // Convert paisa to rupees
                                console.log(`Refund processed successfully: ${refundResult.refundId}`);
                            }
                            else {
                                console.error('Refund processing failed:', refundResult.error);
                                // Update order to indicate refund failed
                                await client.query(`
                  UPDATE orders 
                  SET refund_status = 'failed'
                  WHERE id = $1
                `, [id]);
                            }
                        }
                        catch (refundError) {
                            console.error('Refund processing error:', refundError);
                            // Update order to indicate refund failed
                            await client.query(`
                UPDATE orders 
                SET refund_status = 'failed'
                WHERE id = $1
              `, [id]);
                        }
                    }
                    // Send cancellation email notification
                    try {
                        // Get user information for email
                        const userResult = await client.query('SELECT email, first_name, last_name FROM users WHERE id = $1', [currentOrderData.user_id]);
                        if (userResult.rows.length > 0) {
                            const user = userResult.rows[0];
                            console.log(`Sending cancellation email to: ${user.email}`);
                            await emailService_1.emailService.sendOrderCancellationEmail(currentOrderData, user);
                            console.log('Cancellation email sent successfully');
                        }
                    }
                    catch (emailError) {
                        console.error('Failed to send cancellation email:', emailError);
                        // Don't fail the transaction - log and continue
                    }
                    console.log(`Order ${id} cancellation workflow completed`);
                }
            }
            await client.query('COMMIT');
            return result.rows[0];
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Update order status error:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    static async updatePaymentStatus(id, paymentStatus, paymentId) {
        const result = await database_1.default.query(`
      UPDATE orders 
      SET payment_status = $1, payment_id = $2, updated_at = NOW() 
      WHERE id = $3 
      RETURNING *
    `, [paymentStatus, paymentId, id]);
        return result.rows[0] || null;
    }
    static async updateRazorpayOrderId(id, razorpayOrderId) {
        const result = await database_1.default.query(`
      UPDATE orders 
      SET razorpay_order_id = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `, [razorpayOrderId, id]);
        return result.rows[0] || null;
    }
    static async updatePaymentComplete(id, paymentStatus, razorpayPaymentId) {
        const result = await database_1.default.query(`
      UPDATE orders 
      SET payment_status = $1, payment_id = $2, razorpay_payment_id = $2, updated_at = NOW() 
      WHERE id = $3 
      RETURNING *
    `, [paymentStatus, razorpayPaymentId, id]);
        return result.rows[0] || null;
    }
    static async updateShippingStatus(id, shippingStatus, trackingNumber) {
        let sql = 'UPDATE orders SET shipping_status = $1, updated_at = NOW()';
        const params = [shippingStatus];
        if (trackingNumber) {
            sql += ', tracking_number = $2';
            params.push(trackingNumber);
        }
        if (shippingStatus === 'shipped') {
            sql += ', shipped_at = NOW()';
        }
        else if (shippingStatus === 'delivered') {
            sql += ', delivered_at = NOW()';
        }
        sql += ` WHERE id = $${params.length + 1} RETURNING *`;
        params.push(id);
        const result = await database_1.default.query(sql, params);
        return result.rows[0] || null;
    }
    static async updateShiprocketInfo(id, shiprocketOrderId, shiprocketShipmentId, awbNumber, courierName) {
        const result = await database_1.default.query(`
      UPDATE orders 
      SET shiprocket_order_id = $1, shiprocket_shipment_id = $2, awb_number = $3, 
          courier_name = $4, updated_at = NOW()
      WHERE id = $5 
      RETURNING *
    `, [shiprocketOrderId, shiprocketShipmentId, awbNumber, courierName, id]);
        return result.rows[0] || null;
    }
    static async updateCancellation(id, cancellationReason, refundAmount, refundStatus = 'pending') {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get current order details
            const currentOrderResult = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
            if (currentOrderResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }
            const currentOrder = currentOrderResult.rows[0];
            // Update order status to cancelled
            const result = await client.query(`
        UPDATE orders 
        SET status = 'cancelled', shipping_status = 'cancelled', cancellation_reason = $1, 
            cancelled_at = NOW(), refund_amount = $2, refund_status = $3, updated_at = NOW()
        WHERE id = $4 
        RETURNING *
      `, [cancellationReason, refundAmount, refundStatus, id]);
            // Restore inventory
            console.log(`Order ${id} cancelled, restoring inventory`);
            await inventoryService_1.inventoryService.handleOrderCancellation(id);
            // Cancel with Shiprocket if order was shipped
            if (currentOrder.shiprocket_order_id) {
                try {
                    console.log(`Cancelling Shiprocket order: ${currentOrder.shiprocket_order_id}`);
                    await shiprocketService_1.shiprocketService.cancelOrder(currentOrder.shiprocket_order_id);
                    console.log(`Shiprocket order cancelled successfully`);
                }
                catch (shiprocketError) {
                    console.error('Shiprocket cancellation failed:', shiprocketError);
                    // Don't fail the transaction - log and continue
                }
            }
            // Process automatic refund if payment was completed
            if (currentOrder.payment_status === 'paid' && currentOrder.razorpay_payment_id) {
                try {
                    console.log(`Processing refund for payment: ${currentOrder.razorpay_payment_id}`);
                    const refundResult = await razorpayService_1.razorpayService.processOrderCancellationRefund(currentOrder.razorpay_payment_id, id, cancellationReason);
                    if (refundResult.success) {
                        // Update order with refund information
                        const refundAmountInRupees = refundResult.amount ? refundResult.amount / 100 : currentOrder.total_amount;
                        await client.query(`
              UPDATE orders 
              SET refund_status = 'processed', refund_amount = $1, razorpay_refund_id = $2, refunded_at = NOW()
              WHERE id = $3
            `, [refundAmountInRupees, refundResult.refundId, id]); // Convert paisa to rupees
                        console.log(`Refund processed successfully: ${refundResult.refundId}`);
                    }
                    else {
                        console.error('Refund processing failed:', refundResult.error);
                        // Update order to indicate refund failed
                        await client.query(`
              UPDATE orders 
              SET refund_status = 'failed'
              WHERE id = $1
            `, [id]);
                    }
                }
                catch (refundError) {
                    console.error('Refund processing error:', refundError);
                    // Update order to indicate refund failed
                    await client.query(`
            UPDATE orders 
            SET refund_status = 'failed'
            WHERE id = $1
          `, [id]);
                }
            }
            // Send cancellation email notification
            try {
                // Get user information for email
                const userResult = await client.query('SELECT email, first_name, last_name FROM users WHERE id = $1', [currentOrder.user_id]);
                if (userResult.rows.length > 0) {
                    const user = userResult.rows[0];
                    console.log(`Sending cancellation email to: ${user.email}`);
                    await emailService_1.emailService.sendOrderCancellationEmail(result.rows[0], user);
                    console.log('Cancellation email sent successfully');
                }
            }
            catch (emailError) {
                console.error('Failed to send cancellation email:', emailError);
                // Don't fail the transaction - log and continue
            }
            await client.query('COMMIT');
            return result.rows[0] || null;
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Order cancellation error:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    static async updateRefundStatus(id, refundStatus) {
        const result = await database_1.default.query(`
      UPDATE orders 
      SET refund_status = $1, updated_at = NOW()
      WHERE id = $2 
      RETURNING *
    `, [refundStatus, id]);
        return result.rows[0] || null;
    }
    static async initiateReturn(id, returnId, cancellationReason) {
        const result = await database_1.default.query(`
      UPDATE orders 
      SET return_requested = true, return_id = $1, return_status = 'requested', 
          return_requested_at = NOW(), cancellation_reason = $2, updated_at = NOW()
      WHERE id = $3 
      RETURNING *
    `, [returnId, cancellationReason, id]);
        return result.rows[0] || null;
    }
    static async updateReturnStatus(id, returnStatus, returnAwb, returnCourier) {
        let sql = 'UPDATE orders SET return_status = $1, updated_at = NOW()';
        const params = [returnStatus];
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
        }
        else if (returnStatus === 'completed') {
            sql += ', return_completed_at = NOW()';
        }
        sql += ` WHERE id = $${params.length + 1} RETURNING *`;
        params.push(id);
        const result = await database_1.default.query(sql, params);
        return result.rows[0] || null;
    }
    static async generateOrderNumber() {
        const prefix = 'ORD';
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${prefix}${timestamp}${random}`;
    }
}
exports.OrderModel = OrderModel;
class OrderItemModel {
    static async findByOrderId(orderId) {
        const result = await database_1.default.query(`
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
                }
                catch (error) {
                    console.warn('Failed to parse product_snapshot:', item.product_snapshot, error);
                }
            }
            return {
                ...item,
                product_snapshot
            };
        });
    }
    static async create(orderItemData) {
        const { order_id, product_id, product_name, product_sku, quantity, unit_price, total_price, product_snapshot } = orderItemData;
        const result = await database_1.default.query(`
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
exports.OrderItemModel = OrderItemModel;
//# sourceMappingURL=Order.js.map