import express from 'express';
import { body, query } from 'express-validator';
import { handleValidation } from '../middleware/validation';
import { requireAdmin } from '../middleware/auth';
import pool from '../config/database';
import { emailService } from '../services/emailService';

const router = express.Router();

// Validation middleware
const validateSubscription = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('preferences').optional().isObject().withMessage('Preferences must be an object'),
  handleValidation
];

// Subscribe to newsletter
router.post('/subscribe', validateSubscription, async (req: any, res: any) => {
  try {
    const { email, name, preferences = {} } = req.body;

    // Check if already subscribed
    const existingSubscriber = await pool.query(
      'SELECT id, is_active FROM newsletter_subscribers WHERE email = $1',
      [email]
    );

    if (existingSubscriber.rows.length > 0) {
      const subscriber = existingSubscriber.rows[0];
      
      if (subscriber.is_active) {
        return res.status(400).json({
          success: false,
          message: 'Email is already subscribed to newsletter'
        });
      } else {
        // Reactivate subscription
        await pool.query(`
          UPDATE newsletter_subscribers 
          SET is_active = true, name = $1, preferences = $2, updated_at = NOW()
          WHERE email = $3
        `, [name, JSON.stringify(preferences), email]);

        // Send welcome back email
        try {
          await emailService.sendNewsletterConfirmationEmail(email, name, preferences);
        } catch (emailError) {
          console.error('Newsletter welcome email error:', emailError);
          // Don't fail the subscription if email fails
        }

        return res.json({
          success: true,
          message: 'Newsletter subscription reactivated successfully'
        });
      }
    }

    // Create new subscription
    const result = await pool.query(`
      INSERT INTO newsletter_subscribers (email, name, preferences)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, created_at
    `, [email, name, JSON.stringify(preferences)]);

    // Send welcome email
    try {
      await emailService.sendNewsletterConfirmationEmail(email, name, preferences);
    } catch (emailError) {
      console.error('Newsletter welcome email error:', emailError);
      // Don't fail the subscription if email fails
    }

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Successfully subscribed to newsletter'
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error subscribing to newsletter'
    });
  }
});

// Unsubscribe from newsletter
router.post('/unsubscribe', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const { email } = req.body;

    const result = await pool.query(`
      UPDATE newsletter_subscribers 
      SET is_active = false, updated_at = NOW()
      WHERE email = $1 AND is_active = true
      RETURNING id
    `, [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in newsletter subscriptions'
      });
    }

    res.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    });
  } catch (error) {
    console.error('Newsletter unsubscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unsubscribing from newsletter'
    });
  }
});

// Update subscription preferences
router.put('/preferences', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('preferences').isObject().withMessage('Preferences must be an object'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const { email, preferences } = req.body;

    const result = await pool.query(`
      UPDATE newsletter_subscribers 
      SET preferences = $1, updated_at = NOW()
      WHERE email = $2 AND is_active = true
      RETURNING id, email, name, preferences
    `, [JSON.stringify(preferences), email]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active subscription not found for this email'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Newsletter preferences updated successfully'
    });
  } catch (error) {
    console.error('Update newsletter preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating newsletter preferences'
    });
  }
});

// Check subscription status
router.get('/status', [
  query('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const { email } = req.query;

    const result = await pool.query(
      'SELECT id, email, name, is_active, preferences, created_at FROM newsletter_subscribers WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          subscribed: false,
          email: email
        }
      });
    }

    const subscriber = result.rows[0];
    
    res.json({
      success: true,
      data: {
        subscribed: subscriber.is_active,
        email: subscriber.email,
        name: subscriber.name,
        preferences: subscriber.preferences,
        subscribed_since: subscriber.created_at
      }
    });
  } catch (error) {
    console.error('Check newsletter status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking newsletter status'
    });
  }
});

// Admin routes - Get all subscribers
router.get('/admin/subscribers', requireAdmin, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('active').optional().isString().withMessage('Active must be a string'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('sort_by').optional().isString().withMessage('Sort by must be a string'),
  query('sort_order').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const activeFilter = req.query.active;
    const search = req.query.search;
    const sort_by = req.query.sort_by || 'created_at';
    const sort_order = req.query.sort_order || 'desc';

    let query = 'SELECT * FROM newsletter_subscribers';
    const params: any[] = [];
    const conditions: string[] = [];
    let paramCount = 1;

    if (activeFilter !== undefined && activeFilter !== 'all') {
      conditions.push(`is_active = $${paramCount}`);
      params.push(activeFilter === 'true' || activeFilter === 'active');
      paramCount++;
    }

    if (search) {
      conditions.push(`(email ILIKE $${paramCount} OR name ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add sorting
    const validSortFields = ['created_at', 'email', 'name', 'is_active'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortField} ${sortDirection} LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count with same filters
    let countQuery = 'SELECT COUNT(*) FROM newsletter_subscribers';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (activeFilter !== undefined && activeFilter !== 'all') {
      countQuery += ` WHERE is_active = $${countParamIndex}`;
      countParams.push(activeFilter === 'true' || activeFilter === 'active');
      countParamIndex++;
    }

    if (search) {
      const whereClause = (activeFilter !== undefined && activeFilter !== 'all') ? ' AND' : ' WHERE';
      countQuery += `${whereClause} (email ILIKE $${countParamIndex} OR name ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        subscribers: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + result.rows.length < total
        }
      }
    });
  } catch (error) {
    console.error('Get newsletter subscribers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching newsletter subscribers'
    });
  }
});

// Admin routes - Get newsletter statistics
router.get('/admin/stats', requireAdmin, async (req: any, res: any) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_subscribers,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_subscribers,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_subscribers,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_subscribers_30d,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_subscribers_7d
      FROM newsletter_subscribers
    `);

    // Get growth data for the last 12 months
    const growthData = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_subscribers
      FROM newsletter_subscribers
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `);

    res.json({
      success: true,
      data: {
        overview: stats.rows[0],
        growth: growthData.rows
      }
    });
  } catch (error) {
    console.error('Get newsletter stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching newsletter statistics'
    });
  }
});

// Admin routes - Export subscribers
router.get('/admin/export', requireAdmin, [
  query('format').optional().isIn(['csv', 'json']).withMessage('Format must be csv or json'),
  query('active').optional().isBoolean().withMessage('Active must be boolean'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const format = req.query.format || 'csv';
    const activeFilter = req.query.active;

    let query = 'SELECT email, name, is_active, preferences, created_at FROM newsletter_subscribers';
    const params: any[] = [];

    if (activeFilter !== undefined) {
      query += ' WHERE is_active = $1';
      params.push(activeFilter === 'true');
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    if (format === 'csv') {
      const csvHeader = 'Email,Name,Active,Preferences,Subscribed Date\n';
      const csvRows = result.rows.map(row => 
        `"${row.email}","${row.name || ''}","${row.is_active}","${JSON.stringify(row.preferences || {})}","${row.created_at}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="newsletter_subscribers.csv"');
      res.send(csvHeader + csvRows);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="newsletter_subscribers.json"');
      res.json({
        exported_at: new Date().toISOString(),
        total_count: result.rows.length,
        subscribers: result.rows
      });
    }
  } catch (error) {
    console.error('Export newsletter subscribers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting newsletter subscribers'
    });
  }
});

export default router;