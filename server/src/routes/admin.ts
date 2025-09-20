import express from 'express';
import { ProductModel } from '../models/Product';
import { OrderModel } from '../models/Order';
import { UserModel } from '../models/User';
import { requireAdmin } from '../middleware/auth';
import { validateProduct } from '../middleware/validation';
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

// Get comprehensive analytics for gift e-commerce
router.get('/analytics', async (req, res) => {
  try {
    const { 
      period = '30',
      start_date,
      end_date,
      category_id,
      compare_period = 'false'
    } = req.query;
    
    // Build date conditions
    let dateCondition = '';
    let compareDateCondition = '';
    const params: any[] = [];
    
    if (start_date && end_date) {
      dateCondition = `created_at >= $1 AND created_at <= $2`;
      params.push(start_date, end_date);
      
      if (compare_period === 'true') {
        const daysDiff = Math.ceil((new Date(end_date as string).getTime() - new Date(start_date as string).getTime()) / (1000 * 60 * 60 * 24));
        const compareStartDate = new Date(new Date(start_date as string).getTime() - (daysDiff * 24 * 60 * 60 * 1000));
        const compareEndDate = new Date(start_date as string);
        compareDateCondition = `created_at >= $3 AND created_at <= $4`;
        params.push(compareStartDate.toISOString(), compareEndDate.toISOString());
      }
    } else {
      dateCondition = `created_at >= NOW() - INTERVAL '${period} days'`;
      if (compare_period === 'true') {
        compareDateCondition = `created_at >= NOW() - INTERVAL '${parseInt(period as string) * 2} days' AND created_at < NOW() - INTERVAL '${period} days'`;
      }
    }

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
    
    const revenueResult = await pool.query(revenueQuery, params.slice(0, start_date && end_date ? 2 : 0));
    const currentRevenue = revenueResult.rows[0];

    // Comparison period data
    let comparisonRevenue = null;
    if (compare_period === 'true' && compareDateCondition) {
      const compareQuery = revenueQuery.replace(dateCondition, compareDateCondition);
      const compareParams = start_date && end_date ? params.slice(2, 4) : [];
      const compareResult = await pool.query(compareQuery, compareParams);
      comparisonRevenue = compareResult.rows[0];
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
        ROUND(AVG(order_count), 2) as avg_orders_per_customer,
        COALESCE(MAX(customer_value), 0) as highest_customer_value
      FROM customer_stats
    `;
    const customerResult = await pool.query(customerQuery, params.slice(0, start_date && end_date ? 2 : 0));

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
        ROUND(AVG(oi.unit_price), 2) as avg_selling_price,
        COALESCE(SUM(oi.total_price) / NULLIF(SUM(oi.quantity), 0), 0) as revenue_per_unit
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.${dateCondition} AND o.payment_status = 'paid'
    `;
    
    const productParams = [...params.slice(0, start_date && end_date ? 2 : 0)];
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
        ROUND(AVG(oi.unit_price), 2) as avg_product_price
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.${dateCondition} AND o.payment_status = 'paid'
      GROUP BY c.name, c.id
      ORDER BY revenue DESC
      LIMIT 10
    `;
    const categoryResult = await pool.query(categoryQuery, params.slice(0, start_date && end_date ? 2 : 0));

    // 5. MARKETING & ACQUISITION INTELLIGENCE
    const marketingQuery = `
      SELECT 
        COUNT(CASE WHEN coupon_id IS NOT NULL THEN 1 END) as orders_with_coupons,
        COUNT(*) as total_orders,
        COALESCE(SUM(discount_amount), 0) as total_discounts_given,
        COALESCE(AVG(CASE WHEN coupon_id IS NOT NULL THEN discount_amount END), 0) as avg_discount_per_coupon,
        ROUND(
          (COUNT(CASE WHEN coupon_id IS NOT NULL THEN 1 END)::FLOAT / 
           NULLIF(COUNT(*), 0) * 100), 2
        ) as coupon_usage_rate,
        COALESCE(SUM(CASE WHEN coupon_id IS NOT NULL THEN total_amount ELSE 0 END), 0) as revenue_with_coupons,
        COUNT(DISTINCT CASE WHEN coupon_id IS NOT NULL THEN coupon_code END) as unique_coupons_used
      FROM orders
      WHERE ${dateCondition} AND payment_status = 'paid'
    `;
    const marketingResult = await pool.query(marketingQuery, params.slice(0, start_date && end_date ? 2 : 0));

    // 6. CONVERSION FUNNEL ANALYSIS
    const funnelQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
        COUNT(CASE WHEN shipping_status IN ('shipped', 'in_transit') THEN 1 END) as shipped_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        ROUND(
          (COUNT(CASE WHEN payment_status = 'paid' THEN 1 END)::FLOAT / 
           NULLIF(COUNT(*), 0) * 100), 2
        ) as payment_conversion_rate,
        ROUND(
          (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::FLOAT / 
           NULLIF(COUNT(CASE WHEN payment_status = 'paid' THEN 1 END), 0) * 100), 2
        ) as fulfillment_rate
      FROM orders
      WHERE ${dateCondition}
    `;
    const funnelResult = await pool.query(funnelQuery, params.slice(0, start_date && end_date ? 2 : 0));

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
    const trendsResult = await pool.query(trendsQuery, params.slice(0, start_date && end_date ? 2 : 0));

    // 8. ORDER STATUS BREAKDOWN
    const statusQuery = `
      SELECT 
        status, 
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total_value,
        ROUND((COUNT(*)::FLOAT / (
          SELECT COUNT(*) FROM orders WHERE ${dateCondition}
        ) * 100), 2) as percentage
      FROM orders 
      WHERE ${dateCondition}
      GROUP BY status
      ORDER BY count DESC
    `;
    const statusResult = await pool.query(statusQuery, params.slice(0, start_date && end_date ? 2 : 0));

    // 9. CART ABANDONMENT INSIGHTS
    const abandonmentQuery = `
      SELECT 
        COUNT(*) as total_abandoned_carts,
        COUNT(CASE WHEN is_recovered = true THEN 1 END) as recovered_carts,
        ROUND(
          (COUNT(CASE WHEN is_recovered = true THEN 1 END)::FLOAT / 
           NULLIF(COUNT(*), 0) * 100), 2
        ) as recovery_rate,
        AVG(EXTRACT(EPOCH FROM (COALESCE(recovered_at, NOW()) - abandoned_at))/3600) as avg_abandonment_hours
      FROM cart_abandonment_tracking
      WHERE abandoned_at >= COALESCE($1, NOW() - INTERVAL '${period} days')
        ${start_date ? 'AND abandoned_at <= $2' : ''}
    `;
    const abandonmentResult = await pool.query(abandonmentQuery, start_date && end_date ? [start_date, end_date] : []);

    res.json({
      success: true,
      data: {
        period: { start_date, end_date, period, compare_period },
        revenue_intelligence: {
          current: currentRevenue,
          comparison: comparisonRevenue
        },
        customer_analytics: customerResult.rows[0],
        product_performance: productResult.rows,
        category_performance: categoryResult.rows,
        marketing_analytics: marketingResult.rows[0],
        conversion_funnel: funnelResult.rows[0],
        daily_trends: trendsResult.rows,
        order_status: statusResult.rows,
        cart_abandonment: abandonmentResult.rows[0]
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

export default router;