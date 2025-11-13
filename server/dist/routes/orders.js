"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Order_1 = require("../models/Order");
const Cart_1 = require("../models/Cart");
const Product_1 = require("../models/Product");
const emailService_1 = require("../services/emailService");
const cartAbandonmentService_1 = require("../services/cartAbandonmentService");
const recommendationService_1 = require("../services/recommendationService");
const shiprocketService_1 = require("../services/shiprocketService");
const razorpay_1 = __importDefault(require("razorpay"));
const database_1 = __importDefault(require("../config/database"));
const router = express_1.default.Router();
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});
// Get user's orders
router.get('/', async (req, res) => {
    try {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const user = req.user;
        const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const orders = await Order_1.OrderModel.findByUserId(user.id, parseInt(limit), offset, sortBy, sortOrder);
        // Transform orders and get items for each order
        const transformedOrders = await Promise.all(orders.map(async (order) => {
            const items = await Order_1.OrderItemModel.findByOrderId(order.id);
            return {
                id: order.id,
                orderNumber: order.order_number,
                status: order.status,
                paymentStatus: order.payment_status,
                shippingStatus: order.shipping_status,
                totalAmount: parseFloat(order.total_amount.toString()),
                taxAmount: parseFloat(order.tax_amount.toString()),
                shippingAmount: parseFloat(order.shipping_amount.toString()),
                discountAmount: parseFloat(order.discount_amount.toString()),
                items: items.map((item) => {
                    // Helper function to get image URL from Cloudinary object or string
                    const getImageUrl = (imageData) => {
                        if (typeof imageData === 'string') {
                            return imageData; // Legacy string format
                        }
                        if (typeof imageData === 'object' && imageData) {
                            return imageData.thumb || imageData.medium || imageData.large || imageData.original;
                        }
                        return '/placeholder-product.jpg';
                    };
                    // Get product data from snapshot (stored at order time) or fallback to item data
                    const product = item.product_snapshot || {};
                    const productImages = product.images || [];
                    return {
                        id: item.id,
                        productId: item.product_id,
                        product: {
                            id: item.product_id,
                            name: item.product_name || product.name,
                            images: productImages,
                            imageUrl: productImages.length > 0 ? getImageUrl(productImages[0]) : '/placeholder-product.jpg'
                        },
                        quantity: item.quantity,
                        priceAtTime: parseFloat(item.unit_price.toString()),
                        total: parseFloat(item.total_price.toString())
                    };
                }),
                shippingAddress: typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address,
                billingAddress: typeof order.billing_address === 'string' ? JSON.parse(order.billing_address) : order.billing_address,
                paymentMethod: order.payment_method,
                trackingNumber: order.tracking_number,
                awbNumber: order.awb_number,
                courierName: order.courier_name,
                shippedAt: order.shipped_at,
                deliveredAt: order.delivered_at,
                cancellationReason: order.cancellation_reason,
                cancelledAt: order.cancelled_at,
                refundAmount: order.refund_amount ? parseFloat(order.refund_amount.toString()) : undefined,
                refundStatus: order.refund_status,
                createdAt: order.created_at,
                updatedAt: order.updated_at
            };
        }));
        // Get total count for pagination
        const totalCount = await Order_1.OrderModel.findByUserId(user.id, 1000, 0, 'created_at', 'DESC');
        const totalPages = Math.ceil(totalCount.length / parseInt(limit));
        res.json({
            success: true,
            data: { orders: transformedOrders },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount.length,
                totalPages
            }
        });
    }
    catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ success: false, message: 'Error fetching orders' });
    }
});
// Get specific order with items
router.get('/:orderId', async (req, res) => {
    try {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { orderId } = req.params;
        const user = req.user;
        const order = await Order_1.OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        // Verify user owns this order (or is admin)
        if (order.user_id !== user.id && user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        const items = await Order_1.OrderItemModel.findByOrderId(orderId);
        res.json({ success: true, data: { ...order, items } });
    }
    catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ success: false, message: 'Error fetching order' });
    }
});
// Create order from cart
router.post('/create', async (req, res) => {
    try {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const user = req.user;
        const { shipping_address, billing_address, payment_method, coupon_code } = req.body;
        if (!shipping_address) {
            return res.status(400).json({ success: false, message: 'Shipping address is required' });
        }
        // Get user's cart
        const cart = await Cart_1.CartModel.findByUserId(user.id);
        if (!cart) {
            return res.status(400).json({ success: false, message: 'Cart not found' });
        }
        const cartItems = await Cart_1.CartItemModel.findByCartId(cart.id);
        if (cartItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }
        // Verify stock availability and calculate totals
        let subtotal = 0;
        const orderItems = [];
        for (const item of cartItems) {
            const product = await Product_1.ProductModel.findById(item.product_id);
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `Product ${item.product_id} not found`
                });
            }
            if (product.stock_quantity < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.name}`
                });
            }
            const itemTotal = item.price_at_time * item.quantity;
            subtotal += itemTotal;
            orderItems.push({
                product_id: product.id,
                product_name: product.name,
                product_sku: product.sku,
                quantity: item.quantity,
                unit_price: item.price_at_time,
                total_price: itemTotal,
                product_snapshot: product
            });
        }
        // Apply coupon discount if provided
        let discount_amount = 0;
        let validated_coupon = null;
        if (coupon_code) {
            const { couponService } = require('../services/couponService');
            const couponValidation = await couponService.validateCoupon(coupon_code, subtotal, user.id);
            if (couponValidation.isValid) {
                discount_amount = couponValidation.discountAmount || 0;
                validated_coupon = couponValidation.coupon;
            }
            else {
                return res.status(400).json({
                    success: false,
                    message: `Coupon error: ${couponValidation.error}`
                });
            }
        }
        // Calculate tax and shipping (simplified logic)
        const tax_amount = (subtotal - discount_amount) * 0.18; // 18% GST on discounted amount
        const shipping_amount = subtotal > 999 ? 0 : 99; // Free shipping above ₹999
        const total_amount = subtotal - discount_amount + tax_amount + shipping_amount;
        // Generate order number
        const order_number = await Order_1.OrderModel.generateOrderNumber();
        // Create order
        const order = await Order_1.OrderModel.create({
            user_id: user.id,
            order_number,
            status: 'pending',
            payment_status: 'pending',
            total_amount,
            tax_amount,
            shipping_amount,
            discount_amount,
            coupon_id: validated_coupon?.id || null,
            coupon_code: validated_coupon?.code || null,
            coupon_discount_amount: discount_amount,
            shipping_address,
            billing_address: billing_address || shipping_address,
            payment_method
        });
        // Create order items and update product stock
        for (const item of orderItems) {
            await Order_1.OrderItemModel.create({
                order_id: order.id,
                ...item
            });
            // Update product stock with order tracking
            await Product_1.ProductModel.updateStock(item.product_id, item.quantity, order.id);
        }
        // Clear the cart
        await Cart_1.CartItemModel.clearCart(cart.id);
        // Apply coupon usage if coupon was used
        if (validated_coupon) {
            try {
                const { couponService } = require('../services/couponService');
                await couponService.applyCoupon(validated_coupon.id, order.id, user.id, discount_amount);
            }
            catch (error) {
                console.error('Apply coupon usage error:', error);
                // Don't fail order creation if coupon usage tracking fails
            }
        }
        // Mark cart as recovered (for abandonment tracking) - optional feature
        try {
            await cartAbandonmentService_1.cartAbandonmentService.markCartRecovered(user.id);
        }
        catch (error) {
            console.error('Mark cart recovered error:', error);
            // Don't fail order creation if this optional feature fails
        }
        // Update purchase patterns for recommendations - optional feature
        try {
            await recommendationService_1.recommendationService.updatePurchasePatterns(order.id);
        }
        catch (error) {
            console.error('Update purchase patterns error:', error);
            // Don't fail order creation if this optional feature fails
        }
        // Order confirmation email will be sent after payment verification
        res.json({
            success: true,
            message: 'Order created successfully',
            data: {
                order_id: order.id,
                order_number: order.order_number,
                total_amount: order.total_amount
            }
        });
    }
    catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ success: false, message: 'Error creating order' });
    }
});
// Update order status (admin only)
router.put('/:orderId/status', async (req, res) => {
    try {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const user = req.user;
        if (user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const { orderId } = req.params;
        const { status } = req.body;
        if (!['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        const updatedOrder = await Order_1.OrderModel.updateStatus(orderId, status);
        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true, message: 'Order status updated', data: updatedOrder });
    }
    catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ success: false, message: 'Error updating order status' });
    }
});
// Update shipping status
router.put('/:orderId/shipping', async (req, res) => {
    try {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const user = req.user;
        if (user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const { orderId } = req.params;
        const { shipping_status, tracking_number } = req.body;
        if (!['not_shipped', 'processing', 'shipped', 'in_transit', 'delivered'].includes(shipping_status)) {
            return res.status(400).json({ success: false, message: 'Invalid shipping status' });
        }
        const updatedOrder = await Order_1.OrderModel.updateShippingStatus(orderId, shipping_status, tracking_number);
        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true, message: 'Shipping status updated', data: updatedOrder });
    }
    catch (error) {
        console.error('Update shipping status error:', error);
        res.status(500).json({ success: false, message: 'Error updating shipping status' });
    }
});
// Cancel order (customer or admin)
router.post('/:orderId/cancel', async (req, res) => {
    try {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { orderId } = req.params;
        const { cancellation_reason } = req.body;
        const user = req.user;
        if (!cancellation_reason) {
            return res.status(400).json({ success: false, message: 'Cancellation reason is required' });
        }
        // Get order details
        const order = await Order_1.OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        // Verify user owns this order (or is admin)
        if (order.user_id !== user.id && user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        // Check if order can be cancelled
        if (order.status === 'cancelled') {
            return res.status(400).json({ success: false, message: 'Order is already cancelled' });
        }
        if (order.status === 'delivered') {
            return res.status(400).json({ success: false, message: 'Delivered orders cannot be cancelled' });
        }
        // For shipped orders, we need to initiate a return process
        const isShipped = order.status === 'shipped' ||
            order.shipping_status === 'shipped' ||
            order.shipping_status === 'in_transit';
        let refundAmount = 0;
        let refundStatus = 'none';
        // Handle payment refund if order was paid
        if (order.payment_status === 'paid' && order.razorpay_payment_id) {
            try {
                // Calculate refund amount (full order amount)
                refundAmount = parseFloat(order.total_amount.toString());
                // Create Razorpay refund
                const refund = await razorpay.payments.refund(order.razorpay_payment_id, {
                    amount: Math.round(refundAmount * 100), // Convert to paisa
                    speed: 'normal',
                    notes: {
                        order_id: order.id,
                        order_number: order.order_number,
                        reason: cancellation_reason
                    }
                });
                if (refund.id) {
                    refundStatus = 'pending';
                    console.log('Razorpay refund initiated:', refund.id);
                }
            }
            catch (refundError) {
                console.error('Razorpay refund failed:', refundError);
                refundStatus = 'failed';
                // Continue with cancellation even if refund fails
            }
        }
        // Handle Shiprocket cancellation/return based on shipping status
        if (order.awb_number) {
            try {
                if (isShipped) {
                    // For shipped orders, create a return request instead of cancellation
                    const orderItems = await Order_1.OrderItemModel.findByOrderId(orderId);
                    const shippingAddress = typeof order.shipping_address === 'string'
                        ? JSON.parse(order.shipping_address)
                        : order.shipping_address;
                    const returnData = {
                        order_id: order.order_number + '_RETURN',
                        order_date: new Date().toISOString().split('T')[0],
                        channel_id: process.env.SHIPROCKET_CHANNEL_ID || '',
                        // Pickup from customer (current shipping address)
                        pickup_customer_name: shippingAddress.first_name,
                        pickup_last_name: shippingAddress.last_name,
                        pickup_address: shippingAddress.address_line_1,
                        pickup_address_2: shippingAddress.address_line_2 || '',
                        pickup_city: shippingAddress.city,
                        pickup_state: shippingAddress.state,
                        pickup_country: shippingAddress.country,
                        pickup_pincode: shippingAddress.postal_code,
                        pickup_email: user.email,
                        pickup_phone: shippingAddress.phone || '0000000000',
                        // Drop at warehouse (use pickup location from env)
                        drop_customer_name: process.env.COMPANY_NAME || 'Simri',
                        drop_last_name: 'Warehouse',
                        drop_address: process.env.WAREHOUSE_ADDRESS || 'Warehouse Address',
                        drop_address_2: '',
                        drop_city: process.env.WAREHOUSE_CITY || 'Mumbai',
                        drop_state: process.env.WAREHOUSE_STATE || 'Maharashtra',
                        drop_country: 'India',
                        drop_pincode: process.env.WAREHOUSE_PINCODE || '400001',
                        drop_email: process.env.EMAIL_FROM || process.env.EMAIL_USER || '',
                        drop_phone: process.env.WAREHOUSE_PHONE || '0000000000',
                        order_items: orderItems.map(item => ({
                            name: item.product_name,
                            sku: item.product_sku,
                            units: item.quantity,
                            selling_price: parseFloat(item.unit_price.toString()),
                            discount: 0,
                            tax: 0,
                            hsn: 0
                        })),
                        payment_method: 'Prepaid',
                        sub_total: parseFloat((order.total_amount - order.tax_amount - order.shipping_amount).toString()),
                        length: 10,
                        breadth: 10,
                        height: 10,
                        weight: 0.5
                    };
                    const returnResponse = await shiprocketService_1.shiprocketService.createReturn(returnData);
                    if (returnResponse.return_id) {
                        // Update order with return information
                        await Order_1.OrderModel.initiateReturn(orderId, returnResponse.return_id.toString(), cancellation_reason);
                        console.log('Shiprocket return initiated:', returnResponse.return_id);
                    }
                }
                else {
                    // For non-shipped orders, cancel normally
                    await shiprocketService_1.shiprocketService.cancelShipment([order.awb_number]);
                    console.log('Shiprocket shipment cancelled:', order.awb_number);
                }
            }
            catch (shiprocketError) {
                console.error('Shiprocket operation failed:', shiprocketError);
                // Continue with cancellation even if Shiprocket fails
            }
        }
        // Restore product stock
        const orderItems = await Order_1.OrderItemModel.findByOrderId(orderId);
        for (const item of orderItems) {
            if (item.product_id) {
                try {
                    // Negative quantity to restore stock
                    await Product_1.ProductModel.updateStock(item.product_id, -item.quantity);
                }
                catch (stockError) {
                    console.error('Failed to restore stock for product:', item.product_id, stockError);
                }
            }
        }
        // Remove coupon usage if order had a coupon applied
        if (order.coupon_id) {
            await database_1.default.query(`
        DELETE FROM coupon_usage
        WHERE coupon_id = $1 AND user_id = $2 AND order_id = $3
      `, [order.coupon_id, user.id, orderId]);
            // Decrement coupon used_count
            await database_1.default.query(`
        UPDATE coupons
        SET used_count = GREATEST(used_count - 1, 0), updated_at = NOW()
        WHERE id = $1
      `, [order.coupon_id]);
        }
        // Update order with cancellation details
        const cancelledOrder = await Order_1.OrderModel.updateCancellation(orderId, cancellation_reason, refundAmount > 0 ? refundAmount : undefined, refundStatus);
        // Send cancellation email
        try {
            await emailService_1.emailService.sendOrderCancellationEmail(cancelledOrder || order, user);
            console.log('Order cancellation email sent successfully');
        }
        catch (emailError) {
            console.error('Failed to send cancellation email:', emailError);
        }
        res.json({
            success: true,
            message: isShipped ?
                'Return pickup has been scheduled. Your refund will be processed once the package is returned to our warehouse.' :
                'Order cancelled successfully',
            data: {
                order_id: orderId,
                status: 'cancelled',
                refund_status: refundStatus,
                refund_amount: refundAmount,
                is_return: isShipped
            }
        });
    }
    catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ success: false, message: 'Error cancelling order' });
    }
});
// Get order tracking information
router.get('/:orderId/tracking', async (req, res) => {
    try {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { orderId } = req.params;
        const user = req.user;
        const order = await Order_1.OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        // Verify user owns this order (or is admin)
        if (order.user_id !== user.id && user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        let trackingInfo = null;
        // Get tracking information from Shiprocket if available
        if (order.awb_number) {
            try {
                trackingInfo = await shiprocketService_1.shiprocketService.trackByAWB(order.awb_number);
            }
            catch (trackingError) {
                console.error('Failed to get tracking info:', trackingError);
            }
        }
        res.json({
            success: true,
            data: {
                order_number: order.order_number,
                status: order.status,
                shipping_status: order.shipping_status,
                tracking_number: order.tracking_number,
                awb_number: order.awb_number,
                courier_name: order.courier_name,
                shipped_at: order.shipped_at,
                delivered_at: order.delivered_at,
                tracking_info: trackingInfo
            }
        });
    }
    catch (error) {
        console.error('Get tracking info error:', error);
        res.status(500).json({ success: false, message: 'Error fetching tracking information' });
    }
});
// Admin: Update refund status
router.put('/:orderId/refund-status', async (req, res) => {
    try {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const user = req.user;
        if (user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const { orderId } = req.params;
        const { refund_status } = req.body;
        if (!['none', 'pending', 'partial', 'completed', 'failed'].includes(refund_status)) {
            return res.status(400).json({ success: false, message: 'Invalid refund status' });
        }
        const updatedOrder = await Order_1.OrderModel.updateRefundStatus(orderId, refund_status);
        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true, message: 'Refund status updated', data: updatedOrder });
    }
    catch (error) {
        console.error('Update refund status error:', error);
        res.status(500).json({ success: false, message: 'Error updating refund status' });
    }
});
exports.default = router;
//# sourceMappingURL=orders.js.map