import express from 'express';
import { ReviewModel } from '../models/Review';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { body, param } from 'express-validator';
import { handleValidation } from '../middleware/validation';
import { User } from '../types';
import pool from '../config/database';
import { uploadService } from '../services/uploadService';

const router = express.Router();

// Validation middleware for reviews
const validateReview = [
  body('product_id').isUUID().withMessage('Product ID must be a valid UUID'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional().trim().isLength({ max: 255 }).withMessage('Title must be less than 255 characters'),
  body('comment').optional().trim().isLength({ max: 2000 }).withMessage('Comment must be less than 2000 characters'),
  body('images').optional().isArray().withMessage('Images must be an array'),
  handleValidation
];

const validateReviewUpdate = [
  param('id').isUUID().withMessage('Review ID must be a valid UUID'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional().trim().isLength({ max: 255 }).withMessage('Title must be less than 255 characters'),
  body('comment').optional().trim().isLength({ max: 2000 }).withMessage('Comment must be less than 2000 characters'),
  body('images').optional().isArray().withMessage('Images must be an array'),
  handleValidation
];

// Get reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const reviews = await ReviewModel.findByProductId(
      productId, 
      parseInt(limit as string), 
      parseInt(offset as string)
    );

    const stats = await ReviewModel.getProductRatingStats(productId);

    res.json({
      success: true,
      data: {
        reviews,
        stats
      }
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({ success: false, message: 'Error fetching reviews' });
  }
});

// Get user's reviews
router.get('/user', requireAuth, async (req, res) => {
  try {
    const user = req.user as User;
    const { limit = 10, offset = 0 } = req.query;

    const reviews = await ReviewModel.findByUserId(
      user.id, 
      parseInt(limit as string), 
      parseInt(offset as string)
    );

    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ success: false, message: 'Error fetching user reviews' });
  }
});

// Check if user can review a product
router.get('/can-review/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const user = req.user as User;

    const reviewCheck = await ReviewModel.checkUserCanReview(user.id, productId);

    res.json({ success: true, data: reviewCheck });
  } catch (error) {
    console.error('Check can review error:', error);
    res.status(500).json({ success: false, message: 'Error checking review eligibility' });
  }
});

// Create a new review
router.post('/', requireAuth, validateReview, async (req, res) => {
  try {
    const user = req.user as User;
    const { product_id, rating, title, comment, images } = req.body;

    // Check if user can review this product
    const reviewCheck = await ReviewModel.checkUserCanReview(user.id, product_id);
    
    if (!reviewCheck.canReview) {
      return res.status(400).json({ 
        success: false, 
        message: reviewCheck.reason 
      });
    }

    // Find the order_id if it's a verified purchase
    let order_id = null;
    if (reviewCheck.isVerifiedPurchase) {
      const orderResult = await pool.query(`
        SELECT o.id 
        FROM orders o 
        JOIN order_items oi ON o.id = oi.order_id 
        WHERE o.user_id = $1 AND oi.product_id = $2 AND o.payment_status = 'paid'
        ORDER BY o.created_at DESC
        LIMIT 1
      `, [user.id, product_id]);
      
      if (orderResult.rows.length > 0) {
        order_id = orderResult.rows[0].id;
      }
    }

    const review = await ReviewModel.create({
      user_id: user.id,
      product_id,
      order_id,
      rating,
      title,
      comment,
      images,
      is_verified_purchase: reviewCheck.isVerifiedPurchase
    });

    // Add user information to the review for frontend display
    const reviewWithUser = {
      ...review,
      user_name: user.name,
      user_avatar: user.avatar_url
    };

    res.status(201).json({ 
      success: true, 
      data: reviewWithUser,
      message: 'Review created successfully' 
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ success: false, message: 'Error creating review' });
  }
});

// Update a review
router.put('/:id', requireAuth, validateReviewUpdate, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as User;

    // Check if review exists and belongs to user
    const existingReview = await ReviewModel.findById(id);
    if (!existingReview) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (existingReview.user_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updatedReview = await ReviewModel.update(id, req.body);
    
    res.json({ 
      success: true, 
      data: updatedReview,
      message: 'Review updated successfully' 
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ success: false, message: 'Error updating review' });
  }
});

// Delete a review
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as User;

    // Check if review exists and belongs to user
    const existingReview = await ReviewModel.findById(id);
    if (!existingReview) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (existingReview.user_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Clean up Cloudinary images if they exist
    if (existingReview.images && Array.isArray(existingReview.images)) {
      console.log('🗑️ Cleaning up review images:', existingReview.images);
      await uploadService.deleteReviewImages(existingReview.images);
    }

    const deleted = await ReviewModel.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ success: false, message: 'Error deleting review' });
  }
});

// Mark review as helpful
router.post('/:id/helpful', async (req, res) => {
  try {
    const { id } = req.params;

    const review = await ReviewModel.incrementHelpfulCount(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({ 
      success: true, 
      data: { helpful_count: review.helpful_count },
      message: 'Review marked as helpful' 
    });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({ success: false, message: 'Error marking review as helpful' });
  }
});

// Admin routes for review moderation
router.get('/admin/pending', requireAdmin, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT r.*, u.name as user_name, u.email as user_email,
      p.name as product_name 
      FROM reviews r 
      JOIN users u ON r.user_id = u.id 
      JOIN products p ON r.product_id = p.id 
      WHERE r.is_approved = false
      ORDER BY r.created_at DESC 
      LIMIT $1 OFFSET $2
    `, [parseInt(limit as string), parseInt(offset as string)]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get pending reviews error:', error);
    res.status(500).json({ success: false, message: 'Error fetching pending reviews' });
  }
});

// Approve/reject review
router.put('/admin/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    const review = await ReviewModel.update(id, { is_approved: approved });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({ 
      success: true, 
      data: review,
      message: `Review ${approved ? 'approved' : 'rejected'} successfully` 
    });
  } catch (error) {
    console.error('Approve review error:', error);
    res.status(500).json({ success: false, message: 'Error updating review approval status' });
  }
});

export default router;