import express from 'express';
import * as XLSX from 'xlsx';
import puppeteer from 'puppeteer';
import { ProductModel } from '../models/Product';
import { OrderModel } from '../models/Order';
import { UserModel } from '../models/User';
import { requireAdmin } from '../middleware/auth';
import { validateProduct } from '../middleware/validation';
import { shiprocketService } from '../services/shiprocketService';
import { razorpayService } from '../services/razorpayService';
import { OrderItemModel } from '../models/Order';
import pool from '../config/database';

const router = express.Router();

// All admin routes require admin authentication
router.use(requireAdmin);

// ========================
// PRODUCT MANAGEMENT
// ========================

// Create new product
router.post('/products', validateProduct, async (req, res) => {
  try {
    const productData = req.body;
    const product = await ProductModel.create(productData);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Error creating product' });
  }
});

// Update product
router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body;
    
    const updatedProduct = await ProductModel.update(id, productData);
    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Error updating product' });
  }
});

// Delete product
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await ProductModel.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Error deleting product' });
  }
});

// Get all products for admin (including inactive)
router.get('/products', async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      status, 
      category,
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;
    
    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (status && status !== 'all') {
      conditions.push(`p.is_active = $${params.length + 1}`);
      params.push(status === 'active');
    }

    if (category && category !== 'all') {
      conditions.push(`p.category_id = $${params.length + 1}`);
      params.push(category);
    }

    // General search across product name, SKU, and description
    if (search) {
      conditions.push(`(
        p.name ILIKE $${params.length + 1} OR 
        p.sku ILIKE $${params.length + 1} OR 
        p.description ILIKE $${params.length + 1} OR
        p.short_description ILIKE $${params.length + 1}
      )`);
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add sorting
    const validSortFields = ['created_at', 'name', 'price', 'stock_quantity', 'sku'];
    const sortField = validSortFields.includes(sort_by as string) ? sort_by : 'created_at';
    const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY p.${sortField} ${sortDirection} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);
    
    // Get total count with same filters
    let countQuery = `
      SELECT COUNT(*) 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
    `;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (status && status !== 'all') {
      const whereClause = countParams.length === 0 ? ' WHERE' : ' AND';
      countQuery += `${whereClause} p.is_active = $${countParamIndex}`;
      countParams.push(status === 'active');
      countParamIndex++;
    }

    if (category && category !== 'all') {
      const whereClause = countParams.length === 0 ? ' WHERE' : ' AND';
      countQuery += `${whereClause} p.category_id = $${countParamIndex}`;
      countParams.push(category);
      countParamIndex++;
    }

    if (search) {
      const whereClause = countParams.length === 0 ? ' WHERE' : ' AND';
      countQuery += `${whereClause} (
        p.name ILIKE $${countParamIndex} OR 
        p.sku ILIKE $${countParamIndex} OR 
        p.description ILIKE $${countParamIndex} OR
        p.short_description ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        products: result.rows,
        pagination: {
          page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string)),
          hasMore: parseInt(offset as string) + result.rows.length < total
        }
      },
      total
    });
  } catch (error) {
    console.error('Get admin products error:', error);
    res.status(500).json({ success: false, message: 'Error fetching products' });
  }
});

// ========================
// ORDER MANAGEMENT
// ========================

// Get all orders with filtering
router.get('/orders', async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      status, 
      payment_status, 
      shipping_status,
      start_date,
      end_date,
      user_email,
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;
    
    let query = `
      SELECT o.*, u.email as user_email, u.name as user_name,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as items_count
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (status && status !== 'all') {
      conditions.push(`o.status = $${params.length + 1}`);
      params.push(status);
    }

    if (payment_status && payment_status !== 'all') {
      conditions.push(`o.payment_status = $${params.length + 1}`);
      params.push(payment_status);
    }

    if (shipping_status) {
      conditions.push(`o.shipping_status = $${params.length + 1}`);
      params.push(shipping_status);
    }

    if (start_date) {
      conditions.push(`o.created_at >= $${params.length + 1}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`o.created_at <= $${params.length + 1}`);
      params.push(end_date);
    }

    if (user_email) {
      conditions.push(`u.email ILIKE $${params.length + 1}`);
      params.push(`%${user_email}%`);
    }

    // General search across order number, customer name, and email
    if (search) {
      conditions.push(`(
        o.order_number ILIKE $${params.length + 1} OR 
        u.name ILIKE $${params.length + 1} OR 
        u.email ILIKE $${params.length + 1}
      )`);
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add sorting
    const validSortFields = ['created_at', 'total_amount', 'order_number', 'status'];
    const sortField = validSortFields.includes(sort_by as string) ? sort_by : 'created_at';
    const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY o.${sortField} ${sortDirection} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) 
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id
    `;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (status && status !== 'all') {
      const whereClause = countParams.length === 0 ? ' WHERE' : ' AND';
      countQuery += `${whereClause} o.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (payment_status && payment_status !== 'all') {
      const whereClause = countParams.length === 0 ? ' WHERE' : ' AND';
      countQuery += `${whereClause} o.payment_status = $${countParamIndex}`;
      countParams.push(payment_status);
      countParamIndex++;
    }

    if (search) {
      const whereClause = countParams.length === 0 ? ' WHERE' : ' AND';
      countQuery += `${whereClause} (
        o.order_number ILIKE $${countParamIndex} OR 
        u.name ILIKE $${countParamIndex} OR 
        u.email ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: result.rows,
      total,
      pagination: {
        page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
        hasMore: parseInt(offset as string) + result.rows.length < total
      }
    });
  } catch (error) {
    console.error('Get admin orders error:', error);
    res.status(500).json({ success: false, message: 'Error fetching orders' });
  }
});

// Get single order with items
router.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get order details
    const orderResult = await pool.query(`
      SELECT o.*, u.email as user_email, u.name as user_name
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [id]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    const order = orderResult.rows[0];
    
    // Get order items
    const itemsResult = await pool.query(`
      SELECT oi.*, p.name as product_name, p.images, p.sku as product_sku
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at ASC
    `, [id]);
    
    // Format the response
    const formattedOrder = {
      id: order.id,
      order_number: order.order_number,
      user_id: order.user_id,
      user_name: order.user_name,
      user_email: order.user_email,
      status: order.status,
      payment_status: order.payment_status,
      shipping_status: order.shipping_status,
      total_amount: parseFloat(order.total_amount || 0),
      tax_amount: parseFloat(order.tax_amount || 0),
      shipping_amount: parseFloat(order.shipping_amount || 0),
      discount_amount: parseFloat(order.discount_amount || 0),
      coupon_code: order.coupon_code,
      coupon_discount_amount: parseFloat(order.coupon_discount_amount || 0),
      currency: order.currency,
      shipping_address: order.shipping_address,
      billing_address: order.billing_address,
      payment_method: order.payment_method,
      payment_id: order.payment_id,
      razorpay_order_id: order.razorpay_order_id,
      razorpay_payment_id: order.razorpay_payment_id,
      tracking_number: order.tracking_number,
      shipped_at: order.shipped_at,
      delivered_at: order.delivered_at,
      cancellation_reason: order.cancellation_reason,
      cancelled_at: order.cancelled_at,
      refund_amount: parseFloat(order.refund_amount || 0),
      refund_status: order.refund_status,
      notes: order.notes,
      created_at: order.created_at,
      updated_at: order.updated_at,
      items: itemsResult.rows.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name || item.product_name,
        product_sku: item.product_sku || item.product_sku,
        quantity: parseInt(item.quantity || 0),
        unit_price: parseFloat(item.unit_price || 0),
        total_price: parseFloat(item.total_price || 0),
        product_image: item.images && Array.isArray(item.images) && item.images.length > 0 
          ? item.images[0] 
          : null,
        product_snapshot: item.product_snapshot
      }))
    };
    
    res.json({ 
      success: true, 
      data: formattedOrder 
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching order details' 
    });
  }
});

// Update order status
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid order status' 
      });
    }
    
    const updatedOrder = await OrderModel.updateStatus(id, status);
    
    if (!updatedOrder) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: `Order status updated to ${status}`,
      data: updatedOrder 
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating order status' 
    });
  }
});

// Update order payment status
router.patch('/orders/:id/payment-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_id } = req.body;
    
    // Validate payment status
    const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validPaymentStatuses.includes(payment_status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payment status' 
      });
    }
    
    const updatedOrder = await OrderModel.updatePaymentStatus(id, payment_status, payment_id);
    
    if (!updatedOrder) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: `Payment status updated to ${payment_status}`,
      data: updatedOrder 
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating payment status' 
    });
  }
});

// Update order shipping status
router.patch('/orders/:id/shipping-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { shipping_status, tracking_number } = req.body;
    
    // Validate shipping status
    const validShippingStatuses = ['not_shipped', 'processing', 'shipped', 'in_transit', 'delivered'];
    if (!validShippingStatuses.includes(shipping_status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid shipping status' 
      });
    }
    
    const updatedOrder = await OrderModel.updateShippingStatus(id, shipping_status, tracking_number);
    
    if (!updatedOrder) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: `Shipping status updated to ${shipping_status}`,
      data: updatedOrder 
    });
  } catch (error) {
    console.error('Update shipping status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating shipping status' 
    });
  }
});

// Cancel order
router.patch('/orders/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellation_reason, refund_amount } = req.body;
    
    if (!cancellation_reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cancellation reason is required' 
      });
    }
    
    const updatedOrder = await OrderModel.updateCancellation(id, cancellation_reason, refund_amount);
    
    if (!updatedOrder) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Order cancelled successfully',
      data: updatedOrder 
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error cancelling order' 
    });
  }
});

// Bulk update orders
router.patch('/orders/bulk-update', async (req, res) => {
  try {
    const { order_ids, action, status, shipping_status, payment_status } = req.body;
    
    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order IDs are required' 
      });
    }
    
    if (!action) {
      return res.status(400).json({ 
        success: false, 
        message: 'Action is required' 
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const orderId of order_ids) {
      try {
        let updatedOrder = null;
        
        switch (action) {
          case 'update_status':
            if (status) {
              updatedOrder = await OrderModel.updateStatus(orderId, status);
            }
            break;
          case 'update_shipping':
            if (shipping_status) {
              updatedOrder = await OrderModel.updateShippingStatus(orderId, shipping_status);
            }
            break;
          case 'update_payment':
            if (payment_status) {
              updatedOrder = await OrderModel.updatePaymentStatus(orderId, payment_status);
            }
            break;
          default:
            errors.push({ orderId, error: 'Invalid action' });
            continue;
        }
        
        if (updatedOrder) {
          results.push(updatedOrder);
        } else {
          errors.push({ orderId, error: 'Order not found or update failed' });
        }
      } catch (error) {
        errors.push({ orderId, error: error.message });
      }
    }
    
    res.json({ 
      success: true, 
      message: `Bulk update completed. Updated: ${results.length}, Errors: ${errors.length}`,
      data: {
        updated: results,
        errors: errors,
        total_processed: order_ids.length
      }
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error performing bulk update' 
    });
  }
});

// Export orders
router.get('/orders/export', async (req, res) => {
  try {
    const { 
      format = 'csv',
      status,
      payment_status,
      start_date,
      end_date
    } = req.query;
    
    // Build query conditions
    let query = `
      SELECT o.*, u.email as user_email, u.name as user_name,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as items_count
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (status && status !== 'all') {
      conditions.push(`o.status = $${params.length + 1}`);
      params.push(status);
    }
    
    if (payment_status && payment_status !== 'all') {
      conditions.push(`o.payment_status = $${params.length + 1}`);
      params.push(payment_status);
    }
    
    if (start_date) {
      conditions.push(`o.created_at >= $${params.length + 1}`);
      params.push(start_date);
    }
    
    if (end_date) {
      conditions.push(`o.created_at <= $${params.length + 1}`);
      params.push(end_date);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY o.created_at DESC`;
    
    const result = await pool.query(query, params);
    const orders = result.rows;
    
    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Order Number', 'Customer Name', 'Customer Email', 'Status', 
        'Payment Status', 'Total Amount', 'Items Count', 'Created Date'
      ];
      
      let csv = headers.join(',') + '\n';
      
      orders.forEach(order => {
        const row = [
          order.order_number,
          `"${order.user_name || 'Guest'}"`,
          order.user_email || '',
          order.status,
          order.payment_status,
          order.total_amount,
          order.items_count || 0,
          new Date(order.created_at).toLocaleDateString()
        ];
        csv += row.join(',') + '\n';
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="orders_export_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      // JSON export
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="orders_export_${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        success: true,
        data: orders,
        exported_at: new Date().toISOString(),
        total_orders: orders.length
      });
    }
  } catch (error) {
    console.error('Export orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error exporting orders' 
    });
  }
});

// Get comprehensive analytics for gift e-commerce
router.get('/analytics', async (req, res) => {
  try {
    console.log('Analytics request params:', req.query);
    const { 
      period = '30',
      startDate,
      endDate,
      comparisonStartDate,
      comparisonEndDate,
      includeComparison = 'false',
      category_id,
      // Legacy support
      start_date,
      end_date,
      compare_period = 'false'
    } = req.query;
    
    // Build date conditions - use new parameter names, fallback to legacy
    let dateCondition = '';
    let compareDateCondition = '';
    const params: any[] = [];
    
    // Ensure dates are in proper format
    const formatDate = (dateStr: string) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    };
    
    const actualStartDate = formatDate(startDate || start_date);
    const actualEndDate = formatDate(endDate || end_date);
    const actualComparisonStartDate = formatDate(comparisonStartDate);
    const actualComparisonEndDate = formatDate(comparisonEndDate);
    const shouldCompare = includeComparison === 'true' || compare_period === 'true';
    
    console.log('Formatted dates:', { actualStartDate, actualEndDate, actualComparisonStartDate, actualComparisonEndDate, shouldCompare });
    
    // If dates are invalid, fall back to period-based queries
    const useDateRange = actualStartDate && actualEndDate;
    console.log('Using date range:', useDateRange);
    
    if (actualStartDate && actualEndDate) {
      dateCondition = `created_at >= $1::timestamp AND created_at <= $2::timestamp`;
      params.push(actualStartDate, actualEndDate);
      
      if (shouldCompare && actualComparisonStartDate && actualComparisonEndDate) {
        compareDateCondition = `created_at >= $3::timestamp AND created_at <= $4::timestamp`;
        params.push(actualComparisonStartDate, actualComparisonEndDate);
      } else if (shouldCompare) {
        // Auto-calculate comparison period if not provided
        const daysDiff = Math.ceil((new Date(actualEndDate as string).getTime() - new Date(actualStartDate as string).getTime()) / (1000 * 60 * 60 * 24));
        const compareStartDate = new Date(new Date(actualStartDate as string).getTime() - (daysDiff * 24 * 60 * 60 * 1000));
        const compareEndDate = new Date(actualStartDate as string);
        compareDateCondition = `created_at >= $3::timestamp AND created_at <= $4::timestamp`;
        params.push(compareStartDate.toISOString(), compareEndDate.toISOString());
      }
    } else {
      // Validate period parameter
      const periodDays = parseInt(period as string) || 30;
      dateCondition = `created_at >= NOW() - INTERVAL '${periodDays} days'`;
      if (shouldCompare) {
        compareDateCondition = `created_at >= NOW() - INTERVAL '${periodDays * 2} days' AND created_at < NOW() - INTERVAL '${periodDays} days'`;
      }
    }

    // Create table-qualified date conditions for queries with joins
    const ordersDateCondition = dateCondition.replace(/created_at/g, 'o.created_at');

    // 1. REVENUE & SALES INTELLIGENCE
    const revenueQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN payment_status = 'paid' THEN total_amount ELSE NULL END), 0) as average_order_value,
        COUNT(DISTINCT CASE WHEN payment_status = 'paid' THEN user_id END) as unique_customers,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN discount_amount ELSE 0 END), 0) as total_discounts_given,
        COUNT(CASE WHEN coupon_id IS NOT NULL AND payment_status = 'paid' THEN 1 END) as orders_with_coupons,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN total_amount ELSE 0 END), 0) as lost_revenue,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN tax_amount ELSE 0 END), 0) as total_tax_collected,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN shipping_amount ELSE 0 END), 0) as total_shipping_revenue
      FROM orders 
      WHERE ${dateCondition}
    `;
    
    console.log('Executing revenue query with params:', params.slice(0, useDateRange ? 2 : 0));
    const revenueResult = await pool.query(revenueQuery, params.slice(0, useDateRange ? 2 : 0));
    const currentRevenue = revenueResult.rows[0];
    console.log('Revenue query completed');

    // Comparison period data
    let comparisonRevenue = null;
    if (shouldCompare && compareDateCondition) {
      // Build a separate comparison query with proper parameter numbering
      const compareQuery = `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total_revenue,
          COALESCE(AVG(CASE WHEN payment_status = 'paid' THEN total_amount ELSE NULL END), 0) as average_order_value,
          COUNT(DISTINCT CASE WHEN payment_status = 'paid' THEN user_id END) as unique_customers,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN discount_amount ELSE 0 END), 0) as total_discounts_given,
          COUNT(CASE WHEN coupon_id IS NOT NULL AND payment_status = 'paid' THEN 1 END) as orders_with_coupons,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
          COALESCE(SUM(CASE WHEN status = 'cancelled' THEN total_amount ELSE 0 END), 0) as lost_revenue,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN tax_amount ELSE 0 END), 0) as total_tax_collected,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN shipping_amount ELSE 0 END), 0) as total_shipping_revenue
        FROM orders 
        WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp
      `;
      const compareParams = [actualComparisonStartDate, actualComparisonEndDate];
      console.log('Executing comparison query with params:', compareParams);
      const compareResult = await pool.query(compareQuery, compareParams);
      comparisonRevenue = compareResult.rows[0];
      console.log('Comparison query completed');
    }

    // 2. CUSTOMER BEHAVIOR ANALYTICS
    const customerQuery = `
      WITH customer_stats AS (
        SELECT 
          user_id,
          COUNT(*) as order_count,
          MIN(created_at) as first_order,
          MAX(created_at) as last_order,
          SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as customer_value,
          AVG(CASE WHEN payment_status = 'paid' THEN total_amount ELSE NULL END) as avg_order_value
        FROM orders
        WHERE ${dateCondition} AND user_id IS NOT NULL
        GROUP BY user_id
      )
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN order_count = 1 THEN 1 END) as new_customers,
        COUNT(CASE WHEN order_count > 1 THEN 1 END) as returning_customers,
        COALESCE(AVG(customer_value), 0) as avg_customer_lifetime_value,
        COALESCE(AVG(CASE WHEN order_count > 1 THEN customer_value END), 0) as avg_returning_clv,
        ROUND(AVG(order_count)::NUMERIC, 2) as avg_orders_per_customer,
        COALESCE(MAX(customer_value), 0) as highest_customer_value
      FROM customer_stats
    `;
    console.log('Executing customer query');
    const customerResult = await pool.query(customerQuery, params.slice(0, useDateRange ? 2 : 0));
    console.log('Customer query completed');

    // Comparison period customer data
    let comparisonCustomer = null;
    if (shouldCompare && compareDateCondition) {
      const compareCustomerQuery = `
        WITH customer_stats AS (
          SELECT 
            user_id,
            COUNT(*) as order_count,
            MIN(created_at) as first_order,
            MAX(created_at) as last_order,
            SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as customer_value,
            AVG(CASE WHEN payment_status = 'paid' THEN total_amount ELSE NULL END) as avg_order_value
          FROM orders
          WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp AND user_id IS NOT NULL
          GROUP BY user_id
        )
        SELECT 
          COUNT(*) as total_customers,
          COUNT(CASE WHEN order_count = 1 THEN 1 END) as new_customers,
          COUNT(CASE WHEN order_count > 1 THEN 1 END) as returning_customers,
          COALESCE(AVG(customer_value), 0) as avg_customer_lifetime_value,
          COALESCE(AVG(CASE WHEN order_count > 1 THEN customer_value END), 0) as avg_returning_clv,
          ROUND(AVG(order_count)::NUMERIC, 2) as avg_orders_per_customer,
          COALESCE(MAX(customer_value), 0) as highest_customer_value
        FROM customer_stats
      `;
      const compareCustomerParams = [actualComparisonStartDate, actualComparisonEndDate];
      console.log('Executing comparison customer query with params:', compareCustomerParams);
      const compareCustomerResult = await pool.query(compareCustomerQuery, compareCustomerParams);
      comparisonCustomer = compareCustomerResult.rows[0];
      console.log('Comparison customer query completed');
    }

    // 3. PRODUCT PERFORMANCE (GIFT-FOCUSED)
    let productQuery = `
      SELECT 
        oi.product_name,
        oi.product_id,
        p.category_id,
        c.name as category_name,
        SUM(oi.quantity) as total_sold,
        COALESCE(SUM(oi.total_price), 0) as revenue,
        COUNT(DISTINCT o.id) as order_count,
        ROUND(AVG(oi.unit_price)::NUMERIC, 2) as avg_selling_price,
        COALESCE(SUM(oi.total_price) / NULLIF(SUM(oi.quantity), 0), 0) as revenue_per_unit
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${ordersDateCondition} AND o.payment_status = 'paid'
    `;
    
    const productParams = [...params.slice(0, useDateRange ? 2 : 0)];
    if (category_id && category_id !== 'all') {
      productQuery += ` AND p.category_id = $${productParams.length + 1}`;
      productParams.push(category_id);
    }
    
    productQuery += `
      GROUP BY oi.product_name, oi.product_id, p.category_id, c.name
      ORDER BY revenue DESC
      LIMIT 12
    `;
    const productResult = await pool.query(productQuery, productParams);

    // 4. CATEGORY PERFORMANCE
    const categoryQuery = `
      SELECT 
        c.name as category_name,
        c.id as category_id,
        COUNT(DISTINCT oi.product_id) as unique_products_sold,
        SUM(oi.quantity) as total_quantity,
        COALESCE(SUM(oi.total_price), 0) as revenue,
        COUNT(DISTINCT o.id) as order_count,
        COUNT(DISTINCT o.user_id) as unique_customers,
        ROUND(AVG(oi.unit_price)::NUMERIC, 2) as avg_product_price
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${ordersDateCondition} AND o.payment_status = 'paid'
      GROUP BY c.name, c.id
      ORDER BY revenue DESC
      LIMIT 10
    `;
    const categoryResult = await pool.query(categoryQuery, params.slice(0, useDateRange ? 2 : 0));

    // 5. MARKETING & ACQUISITION INTELLIGENCE
    const marketingQuery = `
      SELECT 
        COUNT(CASE WHEN coupon_id IS NOT NULL THEN 1 END) as orders_with_coupons,
        COUNT(*) as total_orders,
        COALESCE(SUM(discount_amount), 0) as total_discounts_given,
        COALESCE(AVG(CASE WHEN coupon_id IS NOT NULL THEN discount_amount END), 0) as avg_discount_per_coupon,
        ROUND(
          (COUNT(CASE WHEN coupon_id IS NOT NULL THEN 1 END)::FLOAT / 
           NULLIF(COUNT(*), 0) * 100)::NUMERIC, 2
        ) as coupon_usage_rate,
        COALESCE(SUM(CASE WHEN coupon_id IS NOT NULL THEN total_amount ELSE 0 END), 0) as revenue_with_coupons,
        COUNT(DISTINCT CASE WHEN coupon_id IS NOT NULL THEN coupon_code END) as unique_coupons_used
      FROM orders
      WHERE ${dateCondition} AND payment_status = 'paid'
    `;
    const marketingResult = await pool.query(marketingQuery, params.slice(0, useDateRange ? 2 : 0));

    // 6. CONVERSION FUNNEL ANALYSIS
    const funnelQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
        COUNT(CASE WHEN shipping_status IN ('shipped', 'in_transit') THEN 1 END) as shipped_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        ROUND(
          (COUNT(CASE WHEN payment_status = 'paid' THEN 1 END)::FLOAT / 
           NULLIF(COUNT(*), 0) * 100)::NUMERIC, 2
        ) as payment_conversion_rate,
        ROUND(
          (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::FLOAT / 
           NULLIF(COUNT(CASE WHEN payment_status = 'paid' THEN 1 END), 0) * 100)::NUMERIC, 2
        ) as fulfillment_rate
      FROM orders
      WHERE ${dateCondition}
    `;
    const funnelResult = await pool.query(funnelQuery, params.slice(0, useDateRange ? 2 : 0));

    // 7. DAILY TRENDS FOR CHARTS
    const trendsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
        COUNT(DISTINCT CASE WHEN payment_status = 'paid' THEN user_id END) as unique_customers,
        COALESCE(AVG(CASE WHEN payment_status = 'paid' THEN total_amount ELSE NULL END), 0) as avg_order_value,
        COUNT(CASE WHEN coupon_id IS NOT NULL AND payment_status = 'paid' THEN 1 END) as orders_with_coupons
      FROM orders
      WHERE ${dateCondition}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    const trendsResult = await pool.query(trendsQuery, params.slice(0, useDateRange ? 2 : 0));

    // 8. ORDER STATUS BREAKDOWN
    let statusQuery = '';
    let statusParams: any[] = [];
    
    if (useDateRange) {
      statusQuery = `
        SELECT 
          status, 
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as total_value,
          ROUND((COUNT(*)::FLOAT / (
            SELECT COUNT(*) FROM orders WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp
          ) * 100)::NUMERIC, 2) as percentage
        FROM orders 
        WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp
        GROUP BY status
        ORDER BY count DESC
      `;
      statusParams = [actualStartDate, actualEndDate];
    } else {
      const periodDays = parseInt(period as string) || 30;
      statusQuery = `
        SELECT 
          status, 
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as total_value,
          ROUND((COUNT(*)::FLOAT / (
            SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '${periodDays} days'
          ) * 100)::NUMERIC, 2) as percentage
        FROM orders 
        WHERE created_at >= NOW() - INTERVAL '${periodDays} days'
        GROUP BY status
        ORDER BY count DESC
      `;
      statusParams = [];
    }
    
    const statusResult = await pool.query(statusQuery, statusParams);

    // 9. CART ABANDONMENT INSIGHTS
    let abandonmentQuery = '';
    let abandonmentParams: any[] = [];
    
    if (useDateRange) {
      abandonmentQuery = `
        SELECT 
          COUNT(*) as total_abandoned_carts,
          COUNT(CASE WHEN is_recovered = true THEN 1 END) as recovered_carts,
          ROUND(
            (COUNT(CASE WHEN is_recovered = true THEN 1 END)::FLOAT / 
             NULLIF(COUNT(*), 0) * 100)::NUMERIC, 2
          ) as recovery_rate,
          AVG(EXTRACT(EPOCH FROM (COALESCE(recovered_at, NOW()) - abandoned_at))/3600) as avg_abandonment_hours
        FROM cart_abandonment_tracking
        WHERE abandoned_at >= $1::timestamp AND abandoned_at <= $2::timestamp
      `;
      abandonmentParams = [actualStartDate, actualEndDate];
    } else {
      const periodDays = parseInt(period as string) || 30;
      abandonmentQuery = `
        SELECT 
          COUNT(*) as total_abandoned_carts,
          COUNT(CASE WHEN is_recovered = true THEN 1 END) as recovered_carts,
          ROUND(
            (COUNT(CASE WHEN is_recovered = true THEN 1 END)::FLOAT / 
             NULLIF(COUNT(*), 0) * 100)::NUMERIC, 2
          ) as recovery_rate,
          AVG(EXTRACT(EPOCH FROM (COALESCE(recovered_at, NOW()) - abandoned_at))/3600) as avg_abandonment_hours
        FROM cart_abandonment_tracking
        WHERE abandoned_at >= NOW() - INTERVAL '${periodDays} days'
      `;
      abandonmentParams = [];
    }
    
    const abandonmentResult = await pool.query(abandonmentQuery, abandonmentParams);

    // Transform data to match frontend ComprehensiveAnalytics interface
    const current = currentRevenue;
    const comparison = comparisonRevenue || {};
    const customer = customerResult.rows[0] || {};
    const customerComparison = comparisonCustomer || {};
    const marketing = marketingResult.rows[0] || {};
    const funnel = funnelResult.rows[0] || {};
    const abandonment = abandonmentResult.rows[0] || {};

    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number) => {
      if (!previous || previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    res.json({
      success: true,
      data: {
        revenue: {
          total_revenue: parseFloat(current.total_revenue || 0),
          previous_period_revenue: parseFloat(comparison.total_revenue || 0),
          revenue_growth: calculateGrowth(
            parseFloat(current.total_revenue || 0), 
            parseFloat(comparison.total_revenue || 0)
          ),
          total_orders: parseInt(current.total_orders || 0),
          previous_period_orders: parseInt(comparison.total_orders || 0),
          orders_growth: calculateGrowth(
            parseInt(current.total_orders || 0), 
            parseInt(comparison.total_orders || 0)
          ),
          avg_order_value: parseFloat(current.average_order_value || 0),
          previous_period_aov: parseFloat(comparison.average_order_value || 0),
          aov_growth: calculateGrowth(
            parseFloat(current.average_order_value || 0), 
            parseFloat(comparison.average_order_value || 0)
          ),
          total_discount_given: parseFloat(current.total_discounts_given || 0),
          total_tax_collected: parseFloat(current.total_tax_collected || 0),
          total_shipping_collected: parseFloat(current.total_shipping_revenue || 0),
          gross_revenue: parseFloat(current.total_revenue || 0) + parseFloat(current.total_discounts_given || 0)
        },
        customers: {
          total_customers: parseInt(customer.total_customers || 0),
          previous_period_customers: parseInt(customerComparison.total_customers || 0),
          customer_growth: calculateGrowth(
            parseInt(customer.total_customers || 0),
            parseInt(customerComparison.total_customers || 0)
          ),
          new_customers: parseInt(customer.new_customers || 0),
          returning_customers: parseInt(customer.returning_customers || 0),
          new_customer_percentage: customer.total_customers > 0 
            ? (parseInt(customer.new_customers || 0) / parseInt(customer.total_customers || 0)) * 100 
            : 0,
          avg_customer_lifetime_value: parseFloat(customer.avg_customer_lifetime_value || 0),
          avg_orders_per_customer: parseFloat(customer.avg_orders_per_customer || 0),
          repeat_purchase_rate: customer.total_customers > 0 
            ? (parseInt(customer.returning_customers || 0) / parseInt(customer.total_customers || 0)) * 100 
            : 0
        },
        topProducts: productResult.rows.map(product => ({
          product_id: product.product_id,
          name: product.product_name,
          total_sold: parseInt(product.total_sold || 0),
          revenue: parseFloat(product.revenue || 0),
          avg_rating: 0, // Would need reviews table integration
          total_reviews: 0, // Would need reviews table integration
          is_gift_suitable: true, // Default for gift store
          category_name: product.category_name || 'Uncategorized'
        })),
        categories: categoryResult.rows.map(category => ({
          category_id: category.category_id,
          category_name: category.category_name,
          total_revenue: parseFloat(category.revenue || 0),
          total_orders: parseInt(category.order_count || 0),
          avg_order_value: parseFloat(category.revenue || 0) / Math.max(parseInt(category.order_count || 0), 1),
          product_count: parseInt(category.unique_products_sold || 0)
        })),
        marketing: [{
          coupon_code: 'Overall Performance',
          usage_count: parseInt(marketing.orders_with_coupons || 0),
          total_discount_given: parseFloat(marketing.total_discounts_given || 0),
          avg_discount_per_use: parseFloat(marketing.avg_discount_per_coupon || 0),
          revenue_from_coupon_orders: parseFloat(marketing.revenue_with_coupons || 0),
          is_active: true
        }],
        conversion: {
          total_orders: parseInt(funnel.total_orders || 0),
          paid_orders: parseInt(funnel.paid_orders || 0),
          payment_success_rate: parseFloat(funnel.payment_conversion_rate || 0),
          shipped_orders: parseInt(funnel.shipped_orders || 0),
          delivery_rate: parseFloat(funnel.fulfillment_rate || 0),
          cancelled_orders: parseInt(current.cancelled_orders || 0),
          cancellation_rate: parseInt(current.total_orders || 0) > 0 
            ? (parseInt(current.cancelled_orders || 0) / parseInt(current.total_orders || 0)) * 100 
            : 0
        },
        dailyTrends: trendsResult.rows.map(trend => ({
          date: trend.date,
          revenue: parseFloat(trend.revenue || 0),
          orders: parseInt(trend.orders || 0),
          customers: parseInt(trend.unique_customers || 0)
        })),
        orderStatus: statusResult.rows.map(status => ({
          status: status.status,
          count: parseInt(status.count || 0),
          percentage: parseFloat(status.percentage || 0),
          total_value: parseFloat(status.total_value || 0)
        })),
        cartAbandonment: {
          total_tracked_carts: parseInt(abandonment.total_abandoned_carts || 0),
          abandoned_carts: parseInt(abandonment.total_abandoned_carts || 0),
          abandonment_rate: 100, // Would need cart creation tracking
          recovered_carts: parseInt(abandonment.recovered_carts || 0),
          recovery_rate: parseFloat(abandonment.recovery_rate || 0),
          avg_cart_value: 0, // Would need cart value tracking
          potential_lost_revenue: 0 // Would need cart value tracking
        },
        dateRange: {
          startDate: actualStartDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: actualEndDate || new Date().toISOString().split('T')[0],
          comparisonStartDate: actualComparisonStartDate,
          comparisonEndDate: actualComparisonEndDate
        }
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ success: false, message: 'Error fetching analytics' });
  }
});

// ========================
// CATEGORY MANAGEMENT
// ========================

// Create category
router.post('/categories', async (req, res) => {
  try {
    const { name, slug, description, parent_id, is_active = true, image_url } = req.body;
    
    const result = await pool.query(`
      INSERT INTO categories (name, slug, description, parent_id, is_active, image_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, slug, description, parent_id, is_active, image_url]);
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ success: false, message: 'Error creating category' });
  }
});

// Update category
router.put('/categories/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Check if we're updating the is_active status
    const isUpdatingActiveStatus = req.body.hasOwnProperty('is_active');
    const newActiveStatus = req.body.is_active;

    for (const [key, value] of Object.entries(req.body)) {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE categories SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Handle cascading activation/deactivation
    if (isUpdatingActiveStatus) {
      if (newActiveStatus === false) {
        // When deactivating a parent, deactivate all subcategories
        await client.query(`
          WITH RECURSIVE category_tree AS (
            SELECT id FROM categories WHERE id = $1
            UNION ALL
            SELECT c.id FROM categories c
            INNER JOIN category_tree ct ON c.parent_id = ct.id
          )
          UPDATE categories 
          SET is_active = false 
          WHERE id IN (SELECT id FROM category_tree) AND id != $1
        `, [id]);
        
        console.log(`📝 Deactivated category ${id} and all its subcategories`);
      }
      // Note: When reactivating, we only activate the parent
      // Admin can manually reactivate subcategories as needed
    }

    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      data: result.rows[0],
      message: isUpdatingActiveStatus && newActiveStatus === false 
        ? 'Category and all subcategories have been deactivated'
        : 'Category updated successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update category error:', error);
    res.status(500).json({ success: false, message: 'Error updating category' });
  } finally {
    client.release();
  }
});

// Delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, get the category to check for image deletion
    const categoryResult = await pool.query('SELECT image_url FROM categories WHERE id = $1', [id]);
    const categoryImageUrl = categoryResult.rows[0]?.image_url;
    
    // Check how many products will be affected
    const affectedProductsResult = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = $1',
      [id]
    );
    const affectedProductsCount = parseInt(affectedProductsResult.rows[0].count);
    
    // Check how many subcategories will be affected (CASCADE will delete them)
    const affectedSubcategoriesResult = await pool.query(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = $1',
      [id]
    );
    const affectedSubcategoriesCount = parseInt(affectedSubcategoriesResult.rows[0].count);
    
    // Get subcategory images for deletion
    const subcategoriesResult = await pool.query(
      'SELECT image_url FROM categories WHERE parent_id = $1 AND image_url IS NOT NULL',
      [id]
    );
    const subcategoryImages = subcategoriesResult.rows.map(row => row.image_url);
    
    // Delete the category (CASCADE will handle subcategories, SET NULL will handle products)
    const result = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    // Delete category image from Cloudinary if it exists
    if (categoryImageUrl) {
      try {
        const { uploadService } = await import('../services/uploadService');
        await uploadService.deleteCategoryImage(categoryImageUrl);
      } catch (imageError) {
        console.error('Failed to delete category image:', imageError);
      }
    }
    
    // Delete subcategory images from Cloudinary
    for (const imageUrl of subcategoryImages) {
      try {
        const { uploadService } = await import('../services/uploadService');
        await uploadService.deleteCategoryImage(imageUrl);
      } catch (imageError) {
        console.error('Failed to delete subcategory image:', imageError);
      }
    }
    
    let message = 'Category deleted successfully';
    if (affectedProductsCount > 0) {
      message += `. ${affectedProductsCount} product(s) had their category removed and can now be found in "Uncategorized"`;
    }
    if (affectedSubcategoriesCount > 0) {
      message += `. ${affectedSubcategoriesCount} subcategory/subcategories were also deleted`;
    }
    
    res.json({ 
      success: true, 
      message,
      affected: {
        products: affectedProductsCount,
        subcategories: affectedSubcategoriesCount
      }
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'Error deleting category' });
  }
});

// Get all categories (including inactive)
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, parent.name as parent_name 
      FROM categories c 
      LEFT JOIN categories parent ON c.parent_id = parent.id 
      ORDER BY c.created_at DESC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get admin categories error:', error);
    res.status(500).json({ success: false, message: 'Error fetching categories' });
  }
});

// ========================
// USER MANAGEMENT
// ========================

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      role, 
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;
    
    let query = 'SELECT id, email, name, role, is_verified, created_at, updated_at FROM users';
    const params: any[] = [];
    const conditions: string[] = [];

    if (role && role !== 'all') {
      conditions.push(`role = $${params.length + 1}`);
      params.push(role);
    }

    // General search across email and name
    if (search) {
      conditions.push(`(email ILIKE $${params.length + 1} OR name ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add sorting
    const validSortFields = ['created_at', 'email', 'name', 'role', 'is_verified'];
    const sortField = validSortFields.includes(sort_by as string) ? sort_by : 'created_at';
    const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortField} ${sortDirection} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);
    
    // Get total count with same filters
    let countQuery = 'SELECT COUNT(*) FROM users';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (role && role !== 'all') {
      countQuery += ` WHERE role = $${countParamIndex}`;
      countParams.push(role);
      countParamIndex++;
    }

    if (search) {
      const whereClause = (role && role !== 'all') ? ' AND' : ' WHERE';
      countQuery += `${whereClause} (email ILIKE $${countParamIndex} OR name ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({ 
      success: true, 
      data: result.rows,
      pagination: {
        page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
        hasMore: parseInt(offset as string) + result.rows.length < total
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

// Legacy analytics endpoint (for compatibility with older dashboard)
router.get('/analytics/legacy', async (req, res) => {
  try {
    console.log('Legacy analytics request params:', req.query);
    const { period = '30' } = req.query;

    // Use the same logic as the main analytics endpoint with simplified response
    const periodDays = parseInt(period as string) || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - periodDays);

    // Get basic metrics for legacy dashboard
    const [
      totalUsers,
      totalOrders,
      totalRevenue,
      totalProducts
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM orders WHERE created_at >= $1', [startDate]),
      pool.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE created_at >= $1', [startDate]),
      pool.query('SELECT COUNT(*) as count FROM products')
    ]);

    const legacyResponse = {
      success: true,
      data: {
        users: parseInt(totalUsers.rows[0].count),
        orders: parseInt(totalOrders.rows[0].count),
        revenue: parseFloat(totalRevenue.rows[0].total || 0),
        products: parseInt(totalProducts.rows[0].count),
        period: periodDays,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    };

    res.json(legacyResponse);
  } catch (error) {
    console.error('Legacy analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching legacy analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Export analytics data
router.get('/analytics/export', async (req, res) => {
  try {
    const { 
      startDate,
      endDate,
      comparisonStartDate,
      comparisonEndDate,
      includeComparison = 'false',
      format = 'csv'
    } = req.query;

    // Get analytics data using the same logic as the analytics endpoint
    const formatDate = (dateStr: string) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    };
    
    const actualStartDate = formatDate(startDate as string);
    const actualEndDate = formatDate(endDate as string);
    const useDateRange = actualStartDate && actualEndDate;
    
    if (!useDateRange) {
      return res.status(400).json({
        success: false,
        message: 'Valid start and end dates are required for export'
      });
    }

    // Build date condition
    const dateCondition = `created_at >= $1::timestamp AND created_at <= $2::timestamp`;
    const params = [actualStartDate, actualEndDate];

    // Get export data - simplified for export
    const [revenueResult, ordersResult, productsResult] = await Promise.all([
      // Revenue summary
      pool.query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total_revenue,
          COALESCE(AVG(CASE WHEN payment_status = 'paid' THEN total_amount ELSE NULL END), 0) as average_order_value,
          COUNT(DISTINCT CASE WHEN payment_status = 'paid' THEN user_id END) as unique_customers
        FROM orders 
        WHERE ${dateCondition}
      `, params),

      // Daily order breakdown
      pool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as orders,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
          COUNT(DISTINCT CASE WHEN payment_status = 'paid' THEN user_id END) as unique_customers
        FROM orders
        WHERE ${dateCondition}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, params),

      // Top products
      pool.query(`
        SELECT 
          oi.product_name,
          SUM(oi.quantity) as total_sold,
          COALESCE(SUM(oi.total_price), 0) as revenue,
          COUNT(DISTINCT o.id) as order_count
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.created_at >= $1::timestamp AND o.created_at <= $2::timestamp AND o.payment_status = 'paid'
        GROUP BY oi.product_name
        ORDER BY revenue DESC
        LIMIT 20
      `, params)
    ]);

    const data = {
      summary: revenueResult.rows[0],
      daily_breakdown: ordersResult.rows,
      top_products: productsResult.rows,
      export_info: {
        date_range: `${actualStartDate.split('T')[0]} to ${actualEndDate.split('T')[0]}`,
        exported_at: new Date().toISOString(),
        total_records: ordersResult.rows.length
      }
    };

    if (format === 'csv') {
      // Generate well-formatted CSV with proper headers and formatting
      const formatCurrency = (amount: number) => `₹${parseFloat(amount || 0).toFixed(2)}`;
      const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN');
      
      let csv = '';
      
      // Export metadata header
      csv += `"Analytics Export Report"\n`;
      csv += `"Date Range: ${formatDate(actualStartDate)} - ${formatDate(actualEndDate)}"\n`;
      csv += `"Generated: ${new Date().toLocaleString('en-US')}"\n`;
      csv += `"Total Days: ${data.daily_breakdown.length}"\n\n`;
      
      // Summary section with better formatting
      csv += `"EXECUTIVE SUMMARY"\n`;
      csv += `"Metric","Value","Performance"\n`;
      const paymentRate = ((data.summary.paid_orders / data.summary.total_orders) * 100).toFixed(1);
      csv += `"Total Orders","${data.summary.total_orders}","${data.summary.total_orders > 0 ? 'Active' : 'No Activity'}"\n`;
      csv += `"Paid Orders","${data.summary.paid_orders}","${paymentRate}% Payment Success Rate"\n`;
      csv += `"Total Revenue","${formatCurrency(data.summary.total_revenue)}","Primary Revenue"\n`;
      csv += `"Average Order Value","${formatCurrency(data.summary.average_order_value)}","Per Order Performance"\n`;
      csv += `"Unique Customers","${data.summary.unique_customers}","Customer Reach"\n`;
      csv += `"Revenue per Customer","${formatCurrency(data.summary.total_revenue / (data.summary.unique_customers || 1))}","Customer Value"\n\n`;
      
      // Daily performance breakdown with trends
      csv += `"DAILY PERFORMANCE BREAKDOWN"\n`;
      csv += `"Date","Day of Week","Total Orders","Paid Orders","Revenue","Unique Customers","Payment Rate","Revenue per Customer"\n`;
      data.daily_breakdown.forEach(row => {
        const date = new Date(row.date);
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        const paymentRate = row.orders > 0 ? ((row.paid_orders / row.orders) * 100).toFixed(1) + '%' : '0%';
        const revenuePerCustomer = row.unique_customers > 0 ? formatCurrency(row.revenue / row.unique_customers) : formatCurrency(0);
        
        csv += `"${formatDate(row.date)}","${dayOfWeek}","${row.orders}","${row.paid_orders}","${formatCurrency(row.revenue)}","${row.unique_customers}","${paymentRate}","${revenuePerCustomer}"\n`;
      });
      csv += '\n';
      
      // Top products with detailed metrics
      csv += `"TOP PERFORMING PRODUCTS"\n`;
      csv += `"Rank","Product Name","Units Sold","Total Revenue","Number of Orders","Avg Revenue per Order","Market Share"\n`;
      const totalProductRevenue = data.top_products.reduce((sum, p) => sum + parseFloat(p.revenue || 0), 0);
      data.top_products.forEach((row, index) => {
        const avgRevenuePerOrder = row.order_count > 0 ? formatCurrency(row.revenue / row.order_count) : formatCurrency(0);
        const marketShare = totalProductRevenue > 0 ? ((row.revenue / totalProductRevenue) * 100).toFixed(1) + '%' : '0%';
        csv += `"${index + 1}","${row.product_name.replace(/"/g, '""')}","${row.total_sold}","${formatCurrency(row.revenue)}","${row.order_count}","${avgRevenuePerOrder}","${marketShare}"\n`;
      });
      
      // Add analytics insights
      csv += '\n"KEY INSIGHTS"\n';
      csv += `"Peak Day","${data.daily_breakdown.reduce((max, day) => day.revenue > max.revenue ? day : max, {revenue: 0, date: 'N/A'}).date}","Highest revenue day"\n`;
      csv += `"Best Product","${data.top_products[0]?.product_name || 'N/A'}","Top revenue generator"\n`;
      csv += `"Average Daily Revenue","${formatCurrency(data.summary.total_revenue / data.daily_breakdown.length)}","Revenue consistency"\n`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Analytics_Report_${actualStartDate.split('T')[0]}_to_${actualEndDate.split('T')[0]}.csv"`);
      return res.send('\uFEFF' + csv); // Add BOM for proper UTF-8 handling in Excel
    }

    if (format === 'excel') {
      // Create Excel workbook with enhanced data matching CSV richness
      const workbook = XLSX.utils.book_new();
      
      // Metadata sheet
      const metadataData = [
        ['Analytics Export Report'],
        [`Date Range: ${new Date(actualStartDate).toLocaleDateString('en-IN')} - ${new Date(actualEndDate).toLocaleDateString('en-IN')}`],
        [`Generated: ${new Date().toLocaleString('en-IN')}`],
        [`Total Days: ${data.daily_breakdown.length}`],
        [''],
        ['EXECUTIVE SUMMARY'],
        ['Metric', 'Value', 'Performance'],
        ['Total Orders', data.summary.total_orders, data.summary.total_orders > 0 ? 'Active' : 'No Activity'],
        ['Paid Orders', data.summary.paid_orders, `${((data.summary.paid_orders / data.summary.total_orders) * 100).toFixed(1)}% Payment Success Rate`],
        ['Total Revenue', `₹${parseFloat(data.summary.total_revenue || 0).toFixed(2)}`, 'Primary Revenue'],
        ['Average Order Value', `₹${parseFloat(data.summary.average_order_value || 0).toFixed(2)}`, 'Per Order Performance'],
        ['Unique Customers', data.summary.unique_customers, 'Customer Reach'],
        ['Revenue per Customer', `₹${(data.summary.total_revenue / (data.summary.unique_customers || 1)).toFixed(2)}`, 'Customer Value'],
        [''],
        ['KEY INSIGHTS'],
        ['Peak Day', data.daily_breakdown.reduce((max, day) => day.revenue > max.revenue ? day : max, {revenue: 0, date: 'N/A'}).date, 'Highest revenue day'],
        ['Best Product', data.top_products[0]?.product_name || 'N/A', 'Top revenue generator'],
        ['Average Daily Revenue', `₹${(data.summary.total_revenue / data.daily_breakdown.length).toFixed(2)}`, 'Revenue consistency']
      ];
      const metadataSheet = XLSX.utils.aoa_to_sheet(metadataData);
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Executive Summary');
      
      // Enhanced daily breakdown sheet
      const dailyData = [
        ['DAILY PERFORMANCE BREAKDOWN'],
        [''],
        ['Date', 'Day of Week', 'Total Orders', 'Paid Orders', 'Revenue', 'Unique Customers', 'Payment Rate', 'Revenue per Customer']
      ];
      data.daily_breakdown.forEach(row => {
        const date = new Date(row.date);
        const dayOfWeek = date.toLocaleDateString('en-IN', { weekday: 'long' });
        const paymentRate = row.orders > 0 ? `${((row.paid_orders / row.orders) * 100).toFixed(1)}%` : '0%';
        const revenuePerCustomer = row.unique_customers > 0 ? `₹${(row.revenue / row.unique_customers).toFixed(2)}` : '₹0.00';
        
        dailyData.push([
          new Date(row.date).toLocaleDateString('en-IN'),
          dayOfWeek,
          row.orders,
          row.paid_orders,
          `₹${parseFloat(row.revenue || 0).toFixed(2)}`,
          row.unique_customers,
          paymentRate,
          revenuePerCustomer
        ]);
      });
      const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Performance');
      
      // Enhanced top products sheet
      const productsData = [
        ['TOP PERFORMING PRODUCTS'],
        [''],
        ['Rank', 'Product Name', 'Units Sold', 'Total Revenue', 'Number of Orders', 'Avg Revenue per Order', 'Market Share']
      ];
      const totalProductRevenue = data.top_products.reduce((sum, p) => sum + parseFloat(p.revenue || 0), 0);
      data.top_products.forEach((row, index) => {
        const avgRevenuePerOrder = row.order_count > 0 ? `₹${(row.revenue / row.order_count).toFixed(2)}` : '₹0.00';
        const marketShare = totalProductRevenue > 0 ? `${((row.revenue / totalProductRevenue) * 100).toFixed(1)}%` : '0%';
        
        productsData.push([
          index + 1,
          row.product_name.replace(/"/g, '""'), // Excel CSV compatibility
          row.total_sold,
          `₹${parseFloat(row.revenue || 0).toFixed(2)}`,
          row.order_count,
          avgRevenuePerOrder,
          marketShare
        ]);
      });
      const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
      XLSX.utils.book_append_sheet(workbook, productsSheet, 'Top Products');
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Analytics_Report_${actualStartDate.split('T')[0]}_to_${actualEndDate.split('T')[0]}.xlsx"`);
      return res.send(excelBuffer);
    }

    if (format === 'pdf') {
      // Generate professional PDF report
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Analytics Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4f46e5; padding-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #4f46e5; margin-bottom: 10px; }
            .subtitle { font-size: 14px; color: #666; }
            .section { margin: 30px 0; }
            .section h2 { color: #4f46e5; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
            th { background-color: #f9fafb; font-weight: bold; }
            .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
            .metric-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; background: #f9fafb; }
            .metric-value { font-size: 20px; font-weight: bold; color: #4f46e5; }
            .metric-label { font-size: 12px; color: #666; margin-top: 5px; }
            .insights { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .page-break { page-break-before: always; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Analytics Export Report</div>
            <div class="subtitle">Date Range: ${new Date(actualStartDate).toLocaleDateString('en-IN')} - ${new Date(actualEndDate).toLocaleDateString('en-IN')}</div>
            <div class="subtitle">Generated: ${new Date().toLocaleString('en-IN')}</div>
            <div class="subtitle">Total Days: ${data.daily_breakdown.length}</div>
          </div>

          <div class="section">
            <h2>Executive Summary</h2>
            <div class="metric-grid">
              <div class="metric-card">
                <div class="metric-value">${data.summary.total_orders}</div>
                <div class="metric-label">Total Orders</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${data.summary.paid_orders}</div>
                <div class="metric-label">Paid Orders (${((data.summary.paid_orders / data.summary.total_orders) * 100).toFixed(1)}%)</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">₹${parseFloat(data.summary.total_revenue || 0).toFixed(2)}</div>
                <div class="metric-label">Total Revenue</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">₹${parseFloat(data.summary.average_order_value || 0).toFixed(2)}</div>
                <div class="metric-label">Average Order Value</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${data.summary.unique_customers}</div>
                <div class="metric-label">Unique Customers</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">₹${(data.summary.total_revenue / (data.summary.unique_customers || 1)).toFixed(2)}</div>
                <div class="metric-label">Revenue per Customer</div>
              </div>
            </div>
          </div>

          <div class="insights">
            <h3 style="margin-top: 0;">Key Insights</h3>
            <p><strong>Peak Revenue Day:</strong> ${data.daily_breakdown.reduce((max, day) => day.revenue > max.revenue ? day : max, {revenue: 0, date: 'N/A'}).date}</p>
            <p><strong>Best Product:</strong> ${data.top_products[0]?.product_name || 'N/A'}</p>
            <p><strong>Average Daily Revenue:</strong> ₹${(data.summary.total_revenue / data.daily_breakdown.length).toFixed(2)}</p>
          </div>

          <div class="page-break"></div>
          
          <div class="section">
            <h2>Daily Performance Breakdown</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Orders</th>
                  <th>Paid Orders</th>
                  <th>Revenue</th>
                  <th>Customers</th>
                  <th>Payment Rate</th>
                </tr>
              </thead>
              <tbody>
                ${data.daily_breakdown.map(row => {
                  const date = new Date(row.date);
                  const dayOfWeek = date.toLocaleDateString('en-IN', { weekday: 'short' });
                  const paymentRate = row.orders > 0 ? `${((row.paid_orders / row.orders) * 100).toFixed(1)}%` : '0%';
                  
                  return `<tr>
                    <td>${new Date(row.date).toLocaleDateString('en-IN')}</td>
                    <td>${dayOfWeek}</td>
                    <td>${row.orders}</td>
                    <td>${row.paid_orders}</td>
                    <td>₹${parseFloat(row.revenue || 0).toFixed(2)}</td>
                    <td>${row.unique_customers}</td>
                    <td>${paymentRate}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="page-break"></div>
          
          <div class="section">
            <h2>Top Performing Products</h2>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Product Name</th>
                  <th>Units Sold</th>
                  <th>Revenue</th>
                  <th>Orders</th>
                  <th>Avg Revenue/Order</th>
                  <th>Market Share</th>
                </tr>
              </thead>
              <tbody>
                ${data.top_products.map((row, index) => {
                  const totalProductRevenue = data.top_products.reduce((sum, p) => sum + parseFloat(p.revenue || 0), 0);
                  const avgRevenuePerOrder = row.order_count > 0 ? `₹${(row.revenue / row.order_count).toFixed(2)}` : '₹0.00';
                  const marketShare = totalProductRevenue > 0 ? `${((row.revenue / totalProductRevenue) * 100).toFixed(1)}%` : '0%';
                  
                  return `<tr>
                    <td>${index + 1}</td>
                    <td>${row.product_name}</td>
                    <td>${row.total_sold}</td>
                    <td>₹${parseFloat(row.revenue || 0).toFixed(2)}</td>
                    <td>${row.order_count}</td>
                    <td>${avgRevenuePerOrder}</td>
                    <td>${marketShare}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;

      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html);
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });
      
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Analytics_Report_${actualStartDate.split('T')[0]}_to_${actualEndDate.split('T')[0]}.pdf"`);
      return res.send(pdfBuffer);
    }

    // For JSON format - enhanced with better structure
    const enhancedData = {
      export_metadata: {
        title: 'Analytics Export Report',
        date_range: {
          start: actualStartDate.split('T')[0],
          end: actualEndDate.split('T')[0],
          formatted: `${new Date(actualStartDate).toLocaleDateString('en-IN')} - ${new Date(actualEndDate).toLocaleDateString('en-IN')}`
        },
        generated_at: new Date().toISOString(),
        total_days: data.daily_breakdown.length,
        format: 'json'
      },
      executive_summary: {
        ...data.summary,
        payment_success_rate: ((data.summary.paid_orders / data.summary.total_orders) * 100).toFixed(1) + '%',
        revenue_per_customer: (data.summary.total_revenue / (data.summary.unique_customers || 1)).toFixed(2),
        average_daily_revenue: (data.summary.total_revenue / data.daily_breakdown.length).toFixed(2)
      },
      daily_performance: data.daily_breakdown.map(row => ({
        ...row,
        day_of_week: new Date(row.date).toLocaleDateString('en-IN', { weekday: 'long' }),
        payment_rate: row.orders > 0 ? ((row.paid_orders / row.orders) * 100).toFixed(1) + '%' : '0%',
        revenue_per_customer: row.unique_customers > 0 ? (row.revenue / row.unique_customers).toFixed(2) : '0.00'
      })),
      top_products: data.top_products.map((row, index) => ({
        rank: index + 1,
        ...row,
        avg_revenue_per_order: row.order_count > 0 ? (row.revenue / row.order_count).toFixed(2) : '0.00',
        market_share: data.top_products.reduce((sum, p) => sum + parseFloat(p.revenue || 0), 0) > 0 ? ((row.revenue / data.top_products.reduce((sum, p) => sum + parseFloat(p.revenue || 0), 0)) * 100).toFixed(1) + '%' : '0%'
      })),
      insights: {
        peak_revenue_day: data.daily_breakdown.reduce((max, day) => day.revenue > max.revenue ? day : max, {revenue: 0, date: 'N/A'}),
        best_performing_product: data.top_products[0] || null,
        performance_trends: {
          average_daily_revenue: (data.summary.total_revenue / data.daily_breakdown.length).toFixed(2),
          customer_retention: data.summary.unique_customers > 0 ? (data.summary.total_orders / data.summary.unique_customers).toFixed(2) : '0.00'
        }
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="Analytics_Report_${actualStartDate.split('T')[0]}_to_${actualEndDate.split('T')[0]}.json"`);
    res.json({
      success: true,
      data: enhancedData
    });

  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ success: false, message: 'Error exporting analytics data' });
  }
});

// ========================
// SHIPROCKET MANAGEMENT
// ========================

// Create Shiprocket order manually for failed auto-creation
router.post('/shiprocket/create-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get order details
    const order = await OrderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if order already has Shiprocket order ID
    if (order.shiprocket_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Order already has Shiprocket order ID',
        data: { shiprocket_order_id: order.shiprocket_order_id }
      });
    }

    // Get order items
    const orderItems = await OrderItemModel.findByOrderId(orderId);
    if (orderItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Order has no items' });
    }

    // Parse addresses
    const shippingAddress = typeof order.shipping_address === 'string'
      ? JSON.parse(order.shipping_address)
      : order.shipping_address;

    const billingAddress = typeof order.billing_address === 'string'
      ? JSON.parse(order.billing_address)
      : order.billing_address || shippingAddress;

    // Prepare Shiprocket order data
    const shiprocketOrderData = {
      order_id: order.order_number,
      order_date: new Date().toISOString().split('T')[0],
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
      channel_id: process.env.SHIPROCKET_CHANNEL_ID || '',
      comment: `Manual order creation - Order ${order.order_number}`,

      // Billing address (required)
      billing_customer_name: billingAddress.first_name,
      billing_last_name: billingAddress.last_name,
      billing_address: billingAddress.address_line_1,
      billing_address_2: billingAddress.address_line_2 || '',
      billing_city: billingAddress.city,
      billing_pincode: billingAddress.postal_code,
      billing_state: billingAddress.state,
      billing_country: billingAddress.country,
      billing_email: billingAddress.email || 'noreply@simri.com',
      billing_phone: billingAddress.phone || '9999999999',

      // Shipping address
      shipping_is_billing: true,
      shipping_customer_name: shippingAddress.first_name,
      shipping_last_name: shippingAddress.last_name,
      shipping_address: shippingAddress.address_line_1,
      shipping_address_2: shippingAddress.address_line_2 || '',
      shipping_city: shippingAddress.city,
      shipping_pincode: shippingAddress.postal_code,
      shipping_state: shippingAddress.state,
      shipping_country: shippingAddress.country,
      shipping_email: shippingAddress.email || 'noreply@simri.com',
      shipping_phone: shippingAddress.phone || '9999999999',

      // Order items
      order_items: orderItems.map(item => ({
        name: item.product_name,
        sku: item.product_sku || 'NOSKU',
        units: item.quantity,
        selling_price: parseFloat(item.unit_price.toString()),
        discount: 0,
        tax: 0,
        hsn: 0
      })),

      payment_method: 'Prepaid',
      shipping_charges: parseFloat(order.shipping_amount.toString()) || 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: parseFloat(order.discount_amount.toString()) || 0,
      sub_total: parseFloat((order.total_amount - order.tax_amount - order.shipping_amount).toString()),
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5
    };

    // Create Shiprocket order
    const shiprocketResponse = await shiprocketService.createOrder(shiprocketOrderData);

    if (shiprocketResponse.order_id) {
      // Update order with Shiprocket details
      await OrderModel.updateShiprocketInfo(
        orderId,
        shiprocketResponse.order_id.toString(),
        shiprocketResponse.shipment_id?.toString(),
        shiprocketResponse.awb_code,
        shiprocketResponse.courier_name
      );

      // Update shipping status to processing
      await OrderModel.updateShippingStatus(orderId, 'processing');

      res.json({
        success: true,
        message: 'Shiprocket order created successfully',
        data: {
          shiprocket_order_id: shiprocketResponse.order_id,
          shiprocket_shipment_id: shiprocketResponse.shipment_id,
          awb_code: shiprocketResponse.awb_code,
          courier_name: shiprocketResponse.courier_name
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create Shiprocket order',
        error: shiprocketResponse
      });
    }
  } catch (error) {
    console.error('Create Shiprocket order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating Shiprocket order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate AWB for order
router.post('/shiprocket/generate-awb/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { courier_id } = req.body;

    if (!courier_id) {
      return res.status(400).json({ success: false, message: 'courier_id is required' });
    }

    // Get order details
    const order = await OrderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!order.shiprocket_shipment_id) {
      return res.status(400).json({
        success: false,
        message: 'Order does not have Shiprocket shipment ID'
      });
    }

    if (order.awb_number) {
      return res.status(400).json({
        success: false,
        message: 'Order already has AWB number',
        data: { awb_number: order.awb_number }
      });
    }

    // Generate AWB
    const awbResponse = await shiprocketService.generateAWB(
      order.shiprocket_shipment_id,
      parseInt(courier_id)
    );

    if (awbResponse.awb_code) {
      // Update order with AWB details
      await OrderModel.updateShiprocketInfo(
        orderId,
        order.shiprocket_order_id || '',
        order.shiprocket_shipment_id || '',
        awbResponse.awb_code,
        awbResponse.courier_name
      );

      res.json({
        success: true,
        message: 'AWB generated successfully',
        data: {
          awb_code: awbResponse.awb_code,
          courier_name: awbResponse.courier_name
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to generate AWB',
        error: awbResponse
      });
    }
  } catch (error) {
    console.error('Generate AWB error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating AWB',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Schedule pickup
router.post('/shiprocket/schedule-pickup', async (req, res) => {
  try {
    const { shipment_ids, pickup_date } = req.body;

    if (!shipment_ids || !Array.isArray(shipment_ids) || shipment_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'shipment_ids array is required' });
    }

    const pickupResponse = await shiprocketService.schedulePickup(shipment_ids, pickup_date);

    res.json({
      success: true,
      message: 'Pickup scheduled successfully',
      data: pickupResponse
    });
  } catch (error) {
    console.error('Schedule pickup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling pickup',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate manifest
router.post('/shiprocket/generate-manifest', async (req, res) => {
  try {
    const { shipment_ids } = req.body;

    if (!shipment_ids || !Array.isArray(shipment_ids) || shipment_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'shipment_ids array is required' });
    }

    const manifestResponse = await shiprocketService.generateManifest(shipment_ids);

    res.json({
      success: true,
      message: 'Manifest generated successfully',
      data: manifestResponse
    });
  } catch (error) {
    console.error('Generate manifest error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating manifest',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate and print labels
router.post('/shiprocket/generate-labels', async (req, res) => {
  try {
    const { shipment_ids } = req.body;

    if (!shipment_ids || !Array.isArray(shipment_ids) || shipment_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'shipment_ids array is required' });
    }

    const labelResponse = await shiprocketService.generateLabel(shipment_ids);

    res.json({
      success: true,
      message: 'Labels generated successfully',
      data: labelResponse
    });
  } catch (error) {
    console.error('Generate labels error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating labels',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate and print invoices
router.post('/shiprocket/generate-invoices', async (req, res) => {
  try {
    const { order_ids } = req.body;

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'order_ids array is required' });
    }

    const invoiceResponse = await shiprocketService.generateInvoice(order_ids);

    res.json({
      success: true,
      message: 'Invoices generated successfully',
      data: invoiceResponse
    });
  } catch (error) {
    console.error('Generate invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating invoices',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available couriers
router.get('/shiprocket/couriers', async (_req, res) => {
  try {
    const couriers = await shiprocketService.getAllCouriers();

    res.json({
      success: true,
      data: couriers
    });
  } catch (error) {
    console.error('Get couriers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching couriers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check serviceability
router.post('/shiprocket/serviceability', async (req, res) => {
  try {
    const { pickup_postcode, delivery_postcode, weight, cod = false } = req.body;

    if (!pickup_postcode || !delivery_postcode || !weight) {
      return res.status(400).json({
        success: false,
        message: 'pickup_postcode, delivery_postcode, and weight are required'
      });
    }

    const serviceability = await shiprocketService.getServiceability(
      pickup_postcode,
      delivery_postcode,
      parseFloat(weight),
      cod
    );

    res.json({
      success: true,
      data: serviceability
    });
  } catch (error) {
    console.error('Check serviceability error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking serviceability',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get pickup locations
router.get('/shiprocket/pickup-locations', async (_req, res) => {
  try {
    const locations = await shiprocketService.getPickupLocations();

    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    console.error('Get pickup locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pickup locations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================================================
// RAZORPAY PAYMENT & REFUND MANAGEMENT ENDPOINTS
// ==================================================

// Process manual refund for an order
router.post('/payments/refund/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount, reason, refund_type = 'manual' } = req.body;

    // Get order details
    const order = await OrderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order has a payment to refund
    if (!order.razorpay_payment_id || order.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order has no payment to refund or is not paid'
      });
    }

    // Check if already refunded
    if (order.refund_status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Order already refunded'
      });
    }

    // Fetch payment details from Razorpay to verify status
    const payment = await razorpayService.getPayment(order.razorpay_payment_id);
    // console.log('Payment details:', {
    //   paymentId: order.razorpay_payment_id,
    //   status: payment.status,
    //   amount: payment.amount,
    //   currency: payment.currency,
    //   captured: payment.captured,
    //   description: payment.description,
    //   method: payment.method,
    //   card: payment.card ? { type: payment.card.type, network: payment.card.network } : null,
    //   bank: payment.bank,
    //   wallet: payment.wallet,
    //   vpa: payment.vpa,
    //   created_at: payment.created_at
    // });
    if (payment.status !== 'captured' || !payment.captured) {
      return res.status(400).json({
        success: false,
        message: `Payment is not in a refundable state. Status: ${payment.status}, Captured: ${payment.captured}`
      });
    }

    // Check existing refunds
    const existingRefunds = await razorpayService.getRefundsForPayment(order.razorpay_payment_id);
    const totalRefunded = existingRefunds.items.reduce((sum, refund) => sum + Number(refund.amount), 0);
    // console.log('Existing refunds:', {
    //   count: existingRefunds.items.length,
    //   totalRefunded,
    //   paymentAmount: payment.amount
    // });
    const refundAmountInPaisa = amount ? Math.round(amount * 100) : Number(payment.amount);
    if (totalRefunded + refundAmountInPaisa > Number(payment.amount)) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount exceeds the remaining payable amount'
      });
    }

    // Process refund
    // console.log('Processing refund for:', {
    //   orderId,
    //   paymentId: order.razorpay_payment_id,
    //   requestedAmount: amount,
    //   convertedAmount: amount ? Math.round(amount * 100) : undefined,
    //   orderTotal: order.total_amount
    // });

    const refundResult = await razorpayService.createRefund(
      order.razorpay_payment_id,
      amount && Math.round(amount * 100) !== Number(payment.amount) ? Math.round(amount * 100) : undefined, // Convert to paisa, omit if full amount
      reason ? { reason } : undefined // Include reason as notes if provided
    );

    // Update order with refund information
    const refundAmountInRupees = (refundResult.amount || 0) / 100;
    await pool.query(`
      UPDATE orders
      SET refund_status = 'completed', refund_amount = $1, razorpay_refund_id = $2, cancelled_at = NOW(), updated_at = NOW()
      WHERE id = $3
    `, [refundAmountInRupees, refundResult.id, orderId]);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refund_id: refundResult.id,
        amount: refundAmountInRupees,
        status: refundResult.status
      }
    });
  } catch (error) {
    console.error('Manual refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing refund',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get payment transaction details
router.get('/payments/transaction/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Get payment details from Razorpay
    const payment = await razorpayService.getPayment(paymentId);

    // Get associated order
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE razorpay_payment_id = $1',
      [paymentId]
    );
    const order = orderResult.rows[0];

    // Get refund details if any
    let refunds: any[] = [];
    try {
      const refundData = await razorpayService.getRefundsForPayment(paymentId);
      refunds = Array.isArray(refundData) ? refundData : refundData.items || [];
    } catch (refundError) {
      console.log('No refunds found for payment:', paymentId);
    }

    res.json({
      success: true,
      data: {
        payment,
        order: order || null,
        refunds: refunds || []
      }
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all transactions with filtering
router.get('/payments/transactions', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      payment_status,
      refund_status,
      start_date,
      end_date,
      search
    } = req.query;

    let whereConditions = ['o.razorpay_payment_id IS NOT NULL'];
    const queryParams: any[] = [];
    let paramCount = 0;

    if (payment_status && payment_status !== 'all') {
      whereConditions.push(`o.payment_status = $${++paramCount}`);
      queryParams.push(payment_status);
    }

    if (refund_status && refund_status !== 'all') {
      whereConditions.push(`o.refund_status = $${++paramCount}`);
      queryParams.push(refund_status);
    }

    if (start_date) {
      whereConditions.push(`o.created_at >= $${++paramCount}::timestamp`);
      queryParams.push(start_date);
    }

    if (end_date) {
      whereConditions.push(`o.created_at <= $${++paramCount}::timestamp`);
      queryParams.push(end_date);
    }

    if (search) {
      whereConditions.push(`(o.order_number ILIKE $${++paramCount} OR o.razorpay_payment_id ILIKE $${++paramCount} OR u.email ILIKE $${++paramCount})`);
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      paramCount += 2; // We used 3 parameters but only incremented once
    }

    const offset = (Number(page) - 1) * Number(limit);
    queryParams.push(Number(limit), offset);

    const query = `
      SELECT
        o.id,
        o.order_number,
        o.total_amount,
        o.payment_status,
        o.refund_status,
        o.refund_amount,
        o.razorpay_payment_id,
        o.razorpay_refund_id,
        o.razorpay_order_id,
        o.created_at,
        o.cancelled_at,
        u.email as user_email,
        u.name as user_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY o.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
    `;

    const [transactionsResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
    ]);

    const totalCount = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalCount / Number(limit));

    // Transform data to match frontend interface
    const transformedTransactions = transactionsResult.rows.map(transaction => {
      const nameParts = (transaction.user_name || '').split(' ');
      return {
        ...transaction,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        refunded_at: transaction.cancelled_at // Map cancelled_at to refunded_at for frontend
      };
    });

    res.json({
      success: true,
      data: {
        transactions: transformedTransactions,
        pagination: {
          current_page: Number(page),
          total_pages: totalPages,
          total_count: totalCount,
          limit: Number(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get payment analytics
router.get('/payments/analytics', async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    let dateCondition = '';
    switch (period) {
      case '24h':
        dateCondition = "created_at >= NOW() - INTERVAL '24 hours'";
        break;
      case '7d':
        dateCondition = "created_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30d':
        dateCondition = "created_at >= NOW() - INTERVAL '30 days'";
        break;
      case '90d':
        dateCondition = "created_at >= NOW() - INTERVAL '90 days'";
        break;
      default:
        dateCondition = "created_at >= NOW() - INTERVAL '7 days'";
    }

    // Payment statistics
    const paymentStatsQuery = `
      SELECT
        COUNT(*) as total_payments,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as successful_payments,
        COUNT(CASE WHEN payment_status = 'failed' THEN 1 END) as failed_payments,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN refund_status = 'processed' THEN refund_amount ELSE 0 END), 0) as total_refunds,
        COUNT(CASE WHEN refund_status = 'processed' THEN 1 END) as refund_count,
        ROUND(AVG(CASE WHEN payment_status = 'paid' THEN total_amount ELSE NULL END), 2) as avg_order_value
      FROM orders
      WHERE ${dateCondition}
    `;

    // Daily payment trends
    const trendsQuery = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as payment_count,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as successful_count,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
        COALESCE(SUM(CASE WHEN refund_status = 'processed' THEN refund_amount ELSE 0 END), 0) as refunds
      FROM orders
      WHERE ${dateCondition}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
      LIMIT 30
    `;

    // Payment method breakdown
    const methodsQuery = `
      SELECT
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue
      FROM orders
      WHERE ${dateCondition} AND payment_method IS NOT NULL
      GROUP BY payment_method
    `;

    const [statsResult, trendsResult, methodsResult] = await Promise.all([
      pool.query(paymentStatsQuery),
      pool.query(trendsQuery),
      pool.query(methodsQuery)
    ]);

    const stats = statsResult.rows[0];
    const successRate = stats.total_payments > 0
      ? Math.round((stats.successful_payments / stats.total_payments) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        overview: {
          total_payments: parseInt(stats.total_payments),
          successful_payments: parseInt(stats.successful_payments),
          failed_payments: parseInt(stats.failed_payments),
          pending_payments: parseInt(stats.pending_payments),
          success_rate: successRate,
          total_revenue: parseFloat(stats.total_revenue),
          total_refunds: parseFloat(stats.total_refunds),
          refund_count: parseInt(stats.refund_count),
          avg_order_value: parseFloat(stats.avg_order_value || 0),
          net_revenue: parseFloat(stats.total_revenue) - parseFloat(stats.total_refunds)
        },
        daily_trends: trendsResult.rows.map(row => ({
          date: row.date,
          payment_count: parseInt(row.payment_count),
          successful_count: parseInt(row.successful_count),
          revenue: parseFloat(row.revenue),
          refunds: parseFloat(row.refunds),
          success_rate: row.payment_count > 0
            ? Math.round((row.successful_count / row.payment_count) * 100)
            : 0
        })),
        payment_methods: methodsResult.rows.map(row => ({
          method: row.payment_method,
          count: parseInt(row.count),
          revenue: parseFloat(row.revenue)
        }))
      }
    });
  } catch (error) {
    console.error('Payment analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;