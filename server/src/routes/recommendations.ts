import express from 'express';
import { query, param } from 'express-validator';
import { handleValidation } from '../middleware/validation';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { recommendationService } from '../services/recommendationService';

const router = express.Router();

// Get related products for a specific product
router.get('/related/:productId', [
  param('productId').isUUID().withMessage('Valid product ID is required'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 8;

    const relatedProducts = await recommendationService.getRelatedProducts(productId, limit);

    res.json({
      success: true,
      data: {
        products: relatedProducts,
        total: relatedProducts.length
      }
    });
  } catch (error) {
    console.error('Get related products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching related products'
    });
  }
});

// Get "customers also bought" recommendations
router.get('/also-bought/:productId', [
  param('productId').isUUID().withMessage('Valid product ID is required'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 6;

    const alsoBoughtProducts = await recommendationService.getCustomersAlsoBought(productId, limit);

    res.json({
      success: true,
      data: {
        products: alsoBoughtProducts,
        total: alsoBoughtProducts.length
      }
    });
  } catch (error) {
    console.error('Get customers also bought error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer recommendations'
    });
  }
});

// Get personalized recommendations for authenticated user
router.get('/personalized', requireAuth, [
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const personalizedProducts = await recommendationService.getPersonalizedRecommendations(userId, limit);

    res.json({
      success: true,
      data: {
        products: personalizedProducts,
        total: personalizedProducts.length
      }
    });
  } catch (error) {
    console.error('Get personalized recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching personalized recommendations'
    });
  }
});

// Get trending products
router.get('/trending', [
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    const trendingProducts = await recommendationService.getTrendingProducts(limit);

    res.json({
      success: true,
      data: {
        products: trendingProducts,
        total: trendingProducts.length
      }
    });
  } catch (error) {
    console.error('Get trending products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trending products'
    });
  }
});

// Get comprehensive recommendations for homepage
router.get('/homepage', async (req: any, res: any) => {
  try {
    const limit = 6; // Smaller limit for homepage sections

    const [trending, newArrivals] = await Promise.all([
      recommendationService.getTrendingProducts(limit),
      // Get new arrivals (recent products)
      (async () => {
        const { Pool } = require('pg');
        const pool = req.app.locals.pool || require('../config/database').default;
        
        const result = await pool.query(`
          SELECT 
            p.id,
            p.name,
            p.price,
            p.image_url,
            p.category,
            COALESCE(pr.average_rating, 0) as average_rating,
            COALESCE(pr.total_reviews, 0) as total_reviews,
            0 as score
          FROM products p
          LEFT JOIN product_reviews_summary pr ON p.id = pr.product_id
          WHERE p.is_active = true AND p.stock_quantity > 0
          ORDER BY p.created_at DESC
          LIMIT $1
        `, [limit]);
        
        return result.rows;
      })()
    ]);

    // If user is authenticated, also get personalized recommendations
    let personalized = [];
    if (req.user?.id) {
      personalized = await recommendationService.getPersonalizedRecommendations(req.user.id, limit);
    }

    res.json({
      success: true,
      data: {
        trending: {
          title: 'Trending Now',
          products: trending
        },
        new_arrivals: {
          title: 'New Arrivals',
          products: newArrivals
        },
        ...(personalized.length > 0 && {
          personalized: {
            title: 'Recommended for You',
            products: personalized
          }
        })
      }
    });
  } catch (error) {
    console.error('Get homepage recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching homepage recommendations'
    });
  }
});

// Admin route - Get recommendation analytics
router.get('/admin/analytics', requireAdmin, async (req: any, res: any) => {
  try {
    const analytics = await recommendationService.getRecommendationAnalytics();

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get recommendation analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recommendation analytics'
    });
  }
});

// Admin route - Update purchase patterns manually
router.post('/admin/update-patterns/:orderId', requireAdmin, [
  param('orderId').isUUID().withMessage('Valid order ID is required'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const { orderId } = req.params;

    await recommendationService.updatePurchasePatterns(orderId);

    res.json({
      success: true,
      message: 'Purchase patterns updated successfully'
    });
  } catch (error) {
    console.error('Update purchase patterns error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating purchase patterns'
    });
  }
});

export default router;