import express from 'express';
import { wishlistService } from '../services/wishlistService';
import { requireAuth } from '../middleware/auth';
import { body, param, query } from 'express-validator';
import { handleValidation } from '../middleware/validation';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Validation middleware
const validateProductId = [
  param('productId').isUUID().withMessage('Invalid product ID'),
  handleValidation
];

const validateAddToWishlist = [
  body('productId').isUUID().withMessage('Invalid product ID'),
  handleValidation
];

const validateMoveToCart = [
  body('productIds').isArray({ min: 1 }).withMessage('Product IDs array is required'),
  body('productIds.*').isUUID().withMessage('Each product ID must be a valid UUID'),
  handleValidation
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  handleValidation
];

// Get user's wishlist
router.get('/', validatePagination, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const wishlist = await wishlistService.getUserWishlist(userId, page, limit);

    res.json({
      success: true,
      data: wishlist,
      message: `Found ${wishlist.total} items in wishlist`
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wishlist'
    });
  }
});

// Add product to wishlist
router.post('/add', validateAddToWishlist, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    const result = await wishlistService.addToWishlist(userId, productId);

    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.item,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding product to wishlist'
    });
  }
});

// Remove product from wishlist
router.delete('/remove/:productId', validateProductId, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const result = await wishlistService.removeFromWishlist(userId, productId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing product from wishlist'
    });
  }
});

// Check if product is in wishlist
router.get('/check/:productId', validateProductId, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const isInWishlist = await wishlistService.isInWishlist(userId, productId);

    res.json({
      success: true,
      data: {
        product_id: productId,
        is_in_wishlist: isInWishlist
      }
    });
  } catch (error) {
    console.error('Check wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking wishlist status'
    });
  }
});

// Get wishlist count
router.get('/count', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const count = await wishlistService.getWishlistCount(userId);

    res.json({
      success: true,
      data: {
        count
      }
    });
  } catch (error) {
    console.error('Get wishlist count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wishlist count'
    });
  }
});

// Clear entire wishlist
router.delete('/clear', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const result = await wishlistService.clearWishlist(userId);

    if (result.success) {
      res.json({
        success: true,
        data: {
          deleted_count: result.deletedCount
        },
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing wishlist'
    });
  }
});

// Move single item to cart by item ID
router.post('/move-to-cart/:itemId', [
  param('itemId').isUUID().withMessage('Invalid item ID'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const quantity = parseInt(req.body.quantity) || 1;

    const result = await wishlistService.moveItemToCart(userId, itemId, quantity);

    if (result.success) {
      res.json({
        success: true,
        data: result.cartItem,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Move item to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error moving item to cart'
    });
  }
});

// Move multiple items to cart
router.post('/move-to-cart', validateMoveToCart, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { productIds } = req.body;

    const result = await wishlistService.moveToCart(userId, productIds);

    if (result.success) {
      res.json({
        success: true,
        data: {
          moved_count: result.movedCount,
          errors: result.errors
        },
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Move to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error moving items to cart'
    });
  }
});

// Get wishlist insights
router.get('/insights', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const insights = await wishlistService.getWishlistInsights(userId);

    res.json({
      success: true,
      data: {
        ...insights,
        avg_price: parseFloat(insights.avg_price),
        total_value: parseFloat(insights.total_value)
      }
    });
  } catch (error) {
    console.error('Get wishlist insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wishlist insights'
    });
  }
});

// Toggle wishlist (add if not present, remove if present)
router.post('/toggle', validateAddToWishlist, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    const isInWishlist = await wishlistService.isInWishlist(userId, productId);

    let result;
    if (isInWishlist) {
      result = await wishlistService.removeFromWishlist(userId, productId);
      if (result.success) {
        res.json({
          success: true,
          data: {
            action: 'removed',
            is_in_wishlist: false
          },
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } else {
      result = await wishlistService.addToWishlist(userId, productId);
      if (result.success) {
        res.json({
          success: true,
          data: {
            action: 'added',
            is_in_wishlist: true,
            item: result.item
          },
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    }
  } catch (error) {
    console.error('Toggle wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling wishlist'
    });
  }
});

export default router;