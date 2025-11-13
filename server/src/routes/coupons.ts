import express, { Request, Response } from 'express';
import { couponService } from '../services/couponService';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { body, param, query } from 'express-validator';
import { handleValidation } from '../middleware/validation';
import pool from '../config/database';

const router = express.Router();

// Validation middleware
const validateCouponCode = [
  body('code').trim().isLength({ min: 3, max: 50 }).withMessage('Coupon code must be 3-50 characters'),
  handleValidation
];

const validateCouponCreate = [
  body('code').trim().isLength({ min: 3, max: 50 }).withMessage('Coupon code must be 3-50 characters'),
  body('name').trim().isLength({ min: 3, max: 255 }).withMessage('Coupon name must be 3-255 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('type').isIn(['percentage', 'fixed']).withMessage('Type must be percentage or fixed'),
  body('value').isFloat({ min: 0 }).withMessage('Value must be a positive number'),
  body('minimum_order_amount').optional().isFloat({ min: 0 }).withMessage('Minimum order amount must be positive'),
  body('maximum_discount_amount').optional().isFloat({ min: 0 }).withMessage('Maximum discount amount must be positive'),
  body('usage_limit').optional().isInt({ min: 1 }).withMessage('Usage limit must be at least 1'),
  body('valid_from').optional().isISO8601().withMessage('Invalid valid_from date'),
  body('valid_until').optional().isISO8601().withMessage('Invalid valid_until date'),
  handleValidation
];

const validateCouponUpdate = [
  param('id').isUUID().withMessage('Invalid coupon ID'),
  body('name').optional().trim().isLength({ min: 3, max: 255 }).withMessage('Coupon name must be 3-255 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('value').optional().isFloat({ min: 0 }).withMessage('Value must be a positive number'),
  body('minimum_order_amount').optional().isFloat({ min: 0 }).withMessage('Minimum order amount must be positive'),
  body('maximum_discount_amount').optional().isFloat({ min: 0 }).withMessage('Maximum discount amount must be positive'),
  body('usage_limit').optional().isInt({ min: 1 }).withMessage('Usage limit must be at least 1'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
  body('valid_from').optional().isISO8601().withMessage('Invalid valid_from date'),
  body('valid_until').optional().isISO8601().withMessage('Invalid valid_until date'),
  handleValidation
];

// Public routes

// Validate coupon code and get discount
router.post('/validate', validateCouponCode, async (req: Request, res: Response) => {
  try {
    const { code, orderAmount } = req.body;
    const userId = req.user ? (req.user as any).id : undefined;

    if (!orderAmount || orderAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid order amount is required'
      });
    }

    const validation = await couponService.validateCoupon(code, orderAmount, userId);

    if (validation.isValid) {
      res.json({
        success: true,
        data: {
          coupon: {
            id: validation.coupon!.id,
            code: validation.coupon!.code,
            name: validation.coupon!.name,
            description: validation.coupon!.description,
            type: validation.coupon!.type,
            value: validation.coupon!.value
          },
          discount_amount: validation.discountAmount,
          final_amount: orderAmount - validation.discountAmount!
        },
        message: 'Coupon is valid'
      });
    } else {
      res.status(400).json({
        success: false,
        message: validation.error
      });
    }
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating coupon'
    });
  }
});

// Get best available coupon for order
router.get('/best-for-order', async (req, res) => {
  try {
    const { orderAmount } = req.query;
    const userId = req.user ? (req.user as any).id : undefined;

    if (!orderAmount || parseFloat(orderAmount as string) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid order amount is required'
      });
    }

    const result = await couponService.getBestCouponForOrder(parseFloat(orderAmount as string), userId);

    if (result.coupon) {
      res.json({
        success: true,
        data: {
          coupon: {
            id: result.coupon.id,
            code: result.coupon.code,
            name: result.coupon.name,
            description: result.coupon.description,
            type: result.coupon.type,
            value: result.coupon.value
          },
          discount_amount: result.discountAmount,
          savings_message: `Save ₹${result.discountAmount} with code ${result.coupon.code}`
        },
        message: 'Best coupon found'
      });
    } else {
      res.json({
        success: true,
        data: null,
        message: 'No applicable coupons found'
      });
    }
  } catch (error) {
    console.error('Get best coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Error finding best coupon'
    });
  }
});

// Get active coupons (public)
router.get('/active', async (req, res) => {
  try {
    const coupons = await couponService.getActiveCoupons(true);

    // Filter sensitive information for public API
    const publicCoupons = coupons.map(coupon => ({
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      minimum_order_amount: coupon.minimum_order_amount,
      maximum_discount_amount: coupon.maximum_discount_amount,
      valid_until: coupon.valid_until
    }));

    res.json({
      success: true,
      data: publicCoupons,
      count: publicCoupons.length
    });
  } catch (error) {
    console.error('Get active coupons error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active coupons'
    });
  }
});

// Admin routes

// Get all coupons (admin only)
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      active, 
      search, 
      type, 
      sortBy = 'created_at', 
      sortOrder = 'desc' 
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = 'SELECT * FROM coupons';
    let countQuery = 'SELECT COUNT(*) FROM coupons';
    const queryParams: any[] = [];
    const countParams: any[] = [];
    const conditions: string[] = [];

    // Search by code, name, or description
    if (search && search.toString().trim()) {
      const searchParam = `%${search.toString().trim().toLowerCase()}%`;
      conditions.push(`(LOWER(code) LIKE $${queryParams.length + 1} OR LOWER(name) LIKE $${queryParams.length + 1} OR LOWER(description) LIKE $${queryParams.length + 1})`);
      queryParams.push(searchParam);
      countParams.push(searchParam);
    }

    // Filter by type
    if (type && ['percentage', 'fixed'].includes(type.toString())) {
      conditions.push(`type = $${queryParams.length + 1}`);
      queryParams.push(type.toString());
      countParams.push(type.toString());
    }

    // Filter by active status
    if (active !== undefined) {
      conditions.push(`is_active = $${queryParams.length + 1}`);
      queryParams.push(active === 'true');
      countParams.push(active === 'true');
    }

    // Apply WHERE conditions
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    // Validate and apply sorting
    const allowedSortFields = ['created_at', 'updated_at', 'code', 'name', 'type', 'value', 'used_count'];
    const sortField = allowedSortFields.includes(sortBy.toString()) ? sortBy.toString() : 'created_at';
    const sortDirection = sortOrder.toString().toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortField} ${sortDirection}`;
    
    // Add pagination
    query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit as string), offset);

    const result = await pool.query(query, queryParams);
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: {
        coupons: result.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(countResult.rows[0].count / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Get all coupons error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching coupons'
    });
  }
});

// Create new coupon (admin only)
router.post('/admin/create', requireAdmin, validateCouponCreate, async (req: Request, res: Response) => {
  try {
    const adminId = (req.user as any).id;
    const result = await couponService.createCoupon(req.body, adminId);

    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.coupon,
        message: 'Coupon created successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating coupon'
    });
  }
});

// Update coupon (admin only)
router.put('/admin/:id', requireAdmin, validateCouponUpdate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await couponService.updateCoupon(id, req.body);

    if (result.success) {
      res.json({
        success: true,
        data: result.coupon,
        message: 'Coupon updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating coupon'
    });
  }
});

// Delete coupon (admin only)
router.delete('/admin/:id', requireAdmin, [
  param('id').isUUID().withMessage('Invalid coupon ID'),
  handleValidation
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hard } = req.query; // ?hard=true for permanent deletion
    const hardDelete = hard === 'true';
    
    const deleted = await couponService.deleteCoupon(id, hardDelete);

    if (deleted) {
      res.json({
        success: true,
        message: hardDelete 
          ? 'Coupon permanently deleted (all usage records removed, orders preserved)'
          : 'Coupon deactivated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting coupon'
    });
  }
});

// Get coupon statistics (admin only)
router.get('/admin/:id/stats', requireAdmin, [
  param('id').isUUID().withMessage('Invalid coupon ID'),
  handleValidation
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const stats = await couponService.getCouponStats(id);

    if (stats) {
      res.json({
        success: true,
        data: stats
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }
  } catch (error) {
    console.error('Get coupon stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching coupon statistics'
    });
  }
});

// Get overall coupon statistics (admin only)
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await couponService.getOverallCouponStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get overall coupon stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching overall coupon statistics'
    });
  }
});

export default router;