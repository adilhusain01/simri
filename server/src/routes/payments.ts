import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { OrderModel, OrderItemModel } from '../models/Order';
import { User } from '../types';
import { emailService } from '../services/emailService';
import { shiprocketService } from '../services/shiprocketService';

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

// Create Razorpay order for a placed order
router.post('/create-order', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { order_id } = req.body;
    const user = req.user as User;

    if (!order_id) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    // Get order details
    const order = await OrderModel.findById(order_id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify user owns this order
    if (order.user_id !== user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json({ success: false, message: 'Order already paid' });
    }

    const razorpayOrderOptions = {
      amount: Math.round(order.total_amount * 100), // Razorpay expects amount in paisa
      currency: order.currency || 'INR',
      receipt: order.order_number,
      notes: {
        order_id: order.id,
        user_id: user.id
      }
    };

    const razorpayOrder = await razorpay.orders.create(razorpayOrderOptions);
    
    // Update order with Razorpay order ID
    await OrderModel.updateRazorpayOrderId(order.id, razorpayOrder.id);

    res.json({ 
      success: true, 
      data: {
        razorpay_order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key_id: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({ success: false, message: 'Error creating payment order' });
  }
});

// Verify payment signature and update order status
router.post('/verify', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;
    const user = req.user as User;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
      return res.status(400).json({ success: false, message: 'Missing required payment details' });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Get and verify order
    const order = await OrderModel.findById(order_id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user_id !== user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Verify Razorpay order matches
    if (order.razorpay_order_id !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: 'Order ID mismatch' });
    }

    // Update order payment status and razorpay payment ID
    const updatedOrder = await OrderModel.updatePaymentComplete(order_id, 'paid', razorpay_payment_id);
    
    // Also update order status to confirmed
    await OrderModel.updateStatus(order_id, 'confirmed');

    // Automatically create Shiprocket shipping after payment confirmation
    try {
      const orderItems = await OrderItemModel.findByOrderId(order_id);
      
      if (orderItems.length > 0) {
        // Parse shipping address
        const shippingAddress = typeof order.shipping_address === 'string' 
          ? JSON.parse(order.shipping_address) 
          : order.shipping_address;
        
        // Parse billing address
        const billingAddress = typeof order.billing_address === 'string' 
          ? JSON.parse(order.billing_address) 
          : order.billing_address || shippingAddress;

        // Prepare Shiprocket order data
        const shiprocketOrderData = {
          order_id: order.order_number,
          order_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
          pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
          channel_id: process.env.SHIPROCKET_CHANNEL_ID || '',
          comment: `Order ${order.order_number} - Payment confirmed`,
          
          // Billing address (required)
          billing_customer_name: billingAddress.first_name,
          billing_last_name: billingAddress.last_name,
          billing_address: billingAddress.address_line_1,
          billing_address_2: billingAddress.address_line_2 || '',
          billing_city: billingAddress.city,
          billing_pincode: billingAddress.postal_code,
          billing_state: billingAddress.state,
          billing_country: billingAddress.country,
          billing_email: user.email,
          billing_phone: billingAddress.phone || '0000000000',
          
          // Shipping address
          shipping_is_billing: shippingAddress.address_line_1 === billingAddress.address_line_1,
          shipping_customer_name: shippingAddress.first_name,
          shipping_last_name: shippingAddress.last_name,
          shipping_address: shippingAddress.address_line_1,
          shipping_address_2: shippingAddress.address_line_2 || '',
          shipping_city: shippingAddress.city,
          shipping_pincode: shippingAddress.postal_code,
          shipping_state: shippingAddress.state,
          shipping_country: shippingAddress.country,
          shipping_email: user.email,
          shipping_phone: shippingAddress.phone || '0000000000',
          
          // Order items
          order_items: orderItems.map(item => ({
            name: item.product_name,
            sku: item.product_sku,
            units: item.quantity,
            selling_price: parseFloat(item.unit_price.toString()),
            discount: 0,
            tax: 0,
            hsn: 0
          })),
          
          payment_method: order.payment_method || 'Prepaid',
          shipping_charges: parseFloat(order.shipping_amount.toString()),
          giftwrap_charges: 0,
          transaction_charges: 0,
          total_discount: parseFloat(order.discount_amount.toString()),
          sub_total: parseFloat((order.total_amount - order.tax_amount - order.shipping_amount).toString()),
          
          // Package dimensions (default values - should be configured based on products)
          length: 10,
          breadth: 10, 
          height: 10,
          weight: 0.5 // 500 grams default
        };

        // Create Shiprocket order
        const shiprocketResponse = await shiprocketService.createOrder(shiprocketOrderData);
        
        if (shiprocketResponse.order_id) {
          // Update order with Shiprocket details
          await OrderModel.updateShiprocketInfo(
            order_id,
            shiprocketResponse.order_id.toString(),
            shiprocketResponse.shipment_id?.toString(),
            shiprocketResponse.awb_code,
            shiprocketResponse.courier_name
          );
          
          // Update shipping status to processing
          await OrderModel.updateShippingStatus(order_id, 'processing');
          
          console.log('Shiprocket order created successfully:', shiprocketResponse.order_id);
        }
      }
    } catch (shiprocketError) {
      console.error('Failed to create Shiprocket order:', shiprocketError);
      // Don't fail the payment verification if Shiprocket fails
      // Admin can manually create shipping later
    }

    // Send order confirmation email after successful payment
    try {
      await emailService.sendOrderConfirmationEmail(updatedOrder || order, user);
      console.log('Order confirmation email sent successfully');
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError);
      // Don't fail the payment verification if email fails
    }

    res.json({ 
      success: true, 
      message: 'Payment verified successfully',
      data: {
        order_id: updatedOrder?.id,
        order_number: updatedOrder?.order_number,
        payment_status: 'paid'
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, message: 'Error verifying payment' });
  }
});

// Get payment status
router.get('/status/:paymentId', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { paymentId } = req.params;
    
    try {
      const payment = await razorpay.payments.fetch(paymentId);
      res.json({ success: true, data: payment });
    } catch (razorpayError) {
      console.error('Razorpay API error:', razorpayError);
      res.status(404).json({ success: false, message: 'Payment not found' });
    }
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ success: false, message: 'Error fetching payment status' });
  }
});

// Webhook for Razorpay events (optional but recommended)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.get('X-Razorpay-Signature');
    const body = req.body;

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = JSON.parse(body);
    
    // Handle different event types
    switch (event.event) {
      case 'payment.captured':
        // Payment successful
        console.log('Payment captured:', event.payload.payment.entity);
        break;
      case 'payment.failed':
        // Payment failed
        console.log('Payment failed:', event.payload.payment.entity);
        break;
      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing error' });
  }
});

export default router;