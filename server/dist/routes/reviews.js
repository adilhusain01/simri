"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Review_1 = require("../models/Review");
const auth_1 = require("../middleware/auth");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const database_1 = __importDefault(require("../config/database"));
const uploadService_1 = require("../services/uploadService");
// Basic content sanitization function
const sanitizeContent = (content) => {
    if (!content)
        return content;
    // Remove potentially dangerous HTML/script tags
    return content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: URLs
        .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
        .trim();
};
// Basic spam detection
const detectSpam = (title, comment) => {
    if (!title && !comment)
        return false;
    const content = `${title || ''} ${comment || ''}`.toLowerCase();
    // Common spam patterns
    const spamPatterns = [
        /(\b(?:buy|purchase|order|shop)\s+now\b)/i,
        /(\b(?:cheap|discount|sale|offer)\s+\d+%?\s+off\b)/i,
        /http[s]?:\/\/[^\s]+/i, // URLs (might be promotional)
        /(\b(?:click|visit|check)\s+(?:here|link|website)\b)/i,
        /(.)\1{10,}/, // Repeated characters (like !!!!! or ?????)
    ];
    return spamPatterns.some(pattern => pattern.test(content));
};
const router = express_1.default.Router();
// Validation middleware for reviews
const validateReview = [
    (0, express_validator_1.body)('product_id').isUUID().withMessage('Product ID must be a valid UUID'),
    (0, express_validator_1.body)('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    (0, express_validator_1.body)('title').optional().trim().isLength({ max: 255 }).withMessage('Title must be less than 255 characters'),
    (0, express_validator_1.body)('comment').optional().trim().isLength({ max: 2000 }).withMessage('Comment must be less than 2000 characters'),
    (0, express_validator_1.body)('images').optional().isArray().withMessage('Images must be an array'),
    validation_1.handleValidation
];
const validateReviewUpdate = [
    (0, express_validator_1.param)('id').isUUID().withMessage('Review ID must be a valid UUID'),
    (0, express_validator_1.body)('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    (0, express_validator_1.body)('title').optional().trim().isLength({ max: 255 }).withMessage('Title must be less than 255 characters'),
    (0, express_validator_1.body)('comment').optional().trim().isLength({ max: 2000 }).withMessage('Comment must be less than 2000 characters'),
    (0, express_validator_1.body)('images').optional().isArray().withMessage('Images must be an array'),
    validation_1.handleValidation
];
// Get reviews for a product
router.get('/product/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const reviews = await Review_1.ReviewModel.findByProductId(productId, parseInt(limit), parseInt(offset));
        const stats = await Review_1.ReviewModel.getProductRatingStats(productId);
        res.json({
            success: true,
            data: {
                reviews,
                stats
            }
        });
    }
    catch (error) {
        console.error('Get product reviews error:', error);
        res.status(500).json({ success: false, message: 'Error fetching reviews' });
    }
});
// Get user's reviews
router.get('/user', auth_1.requireAuth, async (req, res) => {
    try {
        const user = req.user;
        const { limit = 10, offset = 0 } = req.query;
        const reviews = await Review_1.ReviewModel.findByUserId(user.id, parseInt(limit), parseInt(offset));
        res.json({ success: true, data: reviews });
    }
    catch (error) {
        console.error('Get user reviews error:', error);
        res.status(500).json({ success: false, message: 'Error fetching user reviews' });
    }
});
// Check if user can review a product
router.get('/can-review/:productId', auth_1.requireAuth, async (req, res) => {
    try {
        const { productId } = req.params;
        const user = req.user;
        const reviewCheck = await Review_1.ReviewModel.checkUserCanReview(user.id, productId);
        res.json({ success: true, data: reviewCheck });
    }
    catch (error) {
        console.error('Check can review error:', error);
        res.status(500).json({ success: false, message: 'Error checking review eligibility' });
    }
});
// Create a new review
router.post('/', auth_1.requireAuth, validateReview, async (req, res) => {
    try {
        const user = req.user;
        const { product_id, rating, title, comment, images } = req.body;
        // Rate limiting: Check if user has submitted too many reviews recently (max 5 per hour)
        const recentReviews = await database_1.default.query(`
      SELECT COUNT(*) as count
      FROM reviews
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '1 hour'
    `, [user.id]);
        if (parseInt(recentReviews.rows[0].count) >= 5) {
            return res.status(429).json({
                success: false,
                message: 'Too many reviews submitted recently. Please wait before submitting another review.'
            });
        }
        // Check if user can review this product
        const reviewCheck = await Review_1.ReviewModel.checkUserCanReview(user.id, product_id);
        if (!reviewCheck.canReview) {
            return res.status(400).json({
                success: false,
                message: reviewCheck.reason
            });
        }
        // Find the order_id if it's a verified purchase
        let order_id = null;
        if (reviewCheck.isVerifiedPurchase) {
            const orderResult = await database_1.default.query(`
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
        // Check for potential spam
        const isSpam = detectSpam(title, comment);
        const shouldApprove = !isSpam; // Auto-approve unless it looks like spam
        const review = await Review_1.ReviewModel.create({
            user_id: user.id,
            product_id,
            order_id,
            rating,
            title: title ? sanitizeContent(title) : title,
            comment: comment ? sanitizeContent(comment) : comment,
            images,
            is_verified_purchase: reviewCheck.isVerifiedPurchase,
            is_approved: shouldApprove
        });
        // Add user information to the review for frontend display
        const reviewWithUser = {
            ...review,
            user_name: user.name,
            user_avatar: user.avatar_url
        };
        const message = shouldApprove
            ? 'Review submitted successfully!'
            : 'Review submitted for moderation due to content guidelines. It will be published after review.';
        res.status(201).json({
            success: true,
            data: reviewWithUser,
            message
        });
    }
    catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ success: false, message: 'Error creating review' });
    }
});
// Update a review
router.put('/:id', auth_1.requireAuth, validateReviewUpdate, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        // Check if review exists and belongs to user
        const existingReview = await Review_1.ReviewModel.findById(id);
        if (!existingReview) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        if (existingReview.user_id !== user.id && user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        const updatedReview = await Review_1.ReviewModel.update(id, req.body);
        res.json({
            success: true,
            data: updatedReview,
            message: 'Review updated successfully'
        });
    }
    catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({ success: false, message: 'Error updating review' });
    }
});
// Delete a review
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        // Check if review exists and belongs to user
        const existingReview = await Review_1.ReviewModel.findById(id);
        if (!existingReview) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        if (existingReview.user_id !== user.id && user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        // Clean up Cloudinary images if they exist
        if (existingReview.images && Array.isArray(existingReview.images)) {
            console.log('🗑️ Cleaning up review images:', existingReview.images);
            await uploadService_1.uploadService.deleteReviewImages(existingReview.images);
        }
        const deleted = await Review_1.ReviewModel.delete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        res.json({ success: true, message: 'Review deleted successfully' });
    }
    catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ success: false, message: 'Error deleting review' });
    }
});
// Mark review as helpful
router.post('/:id/helpful', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        // Check if user has already marked this review as helpful (prevent spam)
        const existingVote = await database_1.default.query(`
      SELECT id FROM review_helpful_votes
      WHERE review_id = $1 AND user_id = $2
    `, [id, user.id]);
        if (existingVote.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You have already marked this review as helpful'
            });
        }
        // Record the vote
        await database_1.default.query(`
      INSERT INTO review_helpful_votes (review_id, user_id)
      VALUES ($1, $2)
    `, [id, user.id]);
        const review = await Review_1.ReviewModel.incrementHelpfulCount(id);
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        res.json({
            success: true,
            data: { helpful_count: review.helpful_count },
            message: 'Review marked as helpful'
        });
    }
    catch (error) {
        console.error('Mark helpful error:', error);
        res.status(500).json({ success: false, message: 'Error marking review as helpful' });
    }
});
// Report a review
router.post('/:id/report', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { reason, description } = req.body;
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Report reason is required'
            });
        }
        // Check if user has already reported this review
        const existingReport = await database_1.default.query(`
      SELECT id FROM review_reports
      WHERE review_id = $1 AND reporter_id = $2
    `, [id, user.id]);
        if (existingReport.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You have already reported this review'
            });
        }
        // Check if review exists
        const review = await Review_1.ReviewModel.findById(id);
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        // Insert report
        await database_1.default.query(`
      INSERT INTO review_reports (review_id, reporter_id, reason, description)
      VALUES ($1, $2, $3, $4)
    `, [id, user.id, reason, description]);
        res.json({
            success: true,
            message: 'Review reported successfully. Our team will review it.'
        });
    }
    catch (error) {
        console.error('Report review error:', error);
        res.status(500).json({ success: false, message: 'Error reporting review' });
    }
}); // Admin routes for review moderation
router.get('/admin/pending', auth_1.requireAdmin, async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const result = await database_1.default.query(`
      SELECT r.*, u.name as user_name, u.email as user_email,
      p.name as product_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN products p ON r.product_id = p.id
      WHERE r.is_approved = false
      ORDER BY r.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('Get pending reviews error:', error);
        res.status(500).json({ success: false, message: 'Error fetching pending reviews' });
    }
});
// Get reported reviews
router.get('/admin/reports', auth_1.requireAdmin, async (req, res) => {
    try {
        const { limit = 20, offset = 0, status = 'pending' } = req.query;
        const result = await database_1.default.query(`
      SELECT rr.*, r.title as review_title, r.comment as review_comment,
      r.rating, r.created_at as review_created_at,
      u.name as reviewer_name, u.email as reviewer_email,
      p.name as product_name,
      reporter.name as reporter_name
      FROM review_reports rr
      JOIN reviews r ON rr.review_id = r.id
      JOIN users u ON r.user_id = u.id
      JOIN products p ON r.product_id = p.id
      JOIN users reporter ON rr.reporter_id = reporter.id
      WHERE rr.status = $1
      ORDER BY rr.created_at DESC
      LIMIT $2 OFFSET $3
    `, [status, parseInt(limit), parseInt(offset)]);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('Get review reports error:', error);
        res.status(500).json({ success: false, message: 'Error fetching review reports' });
    }
});
// Update report status
router.put('/admin/reports/:id/status', auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be: pending, reviewed, resolved, or dismissed'
            });
        }
        const result = await database_1.default.query(`
      UPDATE review_reports
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }
        res.json({
            success: true,
            data: result.rows[0],
            message: `Report status updated to ${status}`
        });
    }
    catch (error) {
        console.error('Update report status error:', error);
        res.status(500).json({ success: false, message: 'Error updating report status' });
    }
});
// Get review statistics for admin dashboard
router.get('/admin/stats', auth_1.requireAdmin, async (req, res) => {
    try {
        const stats = await database_1.default.query(`
      SELECT
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_reviews,
        COUNT(CASE WHEN is_approved = false THEN 1 END) as pending_reviews,
        COUNT(CASE WHEN is_verified_purchase = true THEN 1 END) as verified_reviews,
        AVG(rating) as average_rating,
        COUNT(DISTINCT user_id) as unique_reviewers
      FROM reviews
    `);
        const reportStats = await database_1.default.query(`
      SELECT
        COUNT(*) as total_reports,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reports,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_reports
      FROM review_reports
    `);
        const recentActivity = await database_1.default.query(`
      SELECT
        'review' as type,
        r.created_at as created_at,
        r.title,
        u.name as user_name,
        p.name as product_name,
        r.is_approved
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN products p ON r.product_id = p.id
      ORDER BY r.created_at DESC
      LIMIT 10
    `);
        res.json({
            success: true,
            data: {
                reviewStats: stats.rows[0],
                reportStats: reportStats.rows[0],
                recentActivity: recentActivity.rows
            }
        });
    }
    catch (error) {
        console.error('Get review stats error:', error);
        res.status(500).json({ success: false, message: 'Error fetching review statistics' });
    }
});
// Approve/reject review
router.put('/admin/:id/approve', auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { approved } = req.body;
        const review = await Review_1.ReviewModel.update(id, { is_approved: approved });
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        res.json({
            success: true,
            data: review,
            message: `Review ${approved ? 'approved' : 'rejected'} successfully`
        });
    }
    catch (error) {
        console.error('Approve review error:', error);
        res.status(500).json({ success: false, message: 'Error updating review approval status' });
    }
});
// Bulk approve/reject reviews
router.post('/admin/bulk-approve', auth_1.requireAdmin, async (req, res) => {
    try {
        const { reviewIds, approved } = req.body;
        if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'reviewIds must be a non-empty array'
            });
        }
        // Update all reviews in the array
        const result = await database_1.default.query(`
      UPDATE reviews
      SET is_approved = $1, updated_at = NOW()
      WHERE id = ANY($2)
      RETURNING id
    `, [approved, reviewIds]);
        // Update product review summaries for affected products
        const productIds = await database_1.default.query(`
      SELECT DISTINCT product_id FROM reviews WHERE id = ANY($1)
    `, [reviewIds]);
        for (const row of productIds.rows) {
            await Review_1.ReviewModel.updateProductReviewSummary(row.product_id);
        }
        res.json({
            success: true,
            data: {
                updatedCount: result.rows.length,
                approved
            },
            message: `${result.rows.length} reviews ${approved ? 'approved' : 'rejected'} successfully`
        });
    }
    catch (error) {
        console.error('Bulk approve reviews error:', error);
        res.status(500).json({ success: false, message: 'Error updating review approval status' });
    }
});
// Delete review (admin only - can delete any review)
router.delete('/admin/:id', auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Check if review exists
        const existingReview = await Review_1.ReviewModel.findById(id);
        if (!existingReview) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        // Clean up Cloudinary images if they exist
        if (existingReview.images && Array.isArray(existingReview.images)) {
            console.log('🗑️ Admin deleting review images:', existingReview.images);
            await uploadService_1.uploadService.deleteReviewImages(existingReview.images);
        }
        const deleted = await Review_1.ReviewModel.delete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        res.json({ success: true, message: 'Review deleted successfully' });
    }
    catch (error) {
        console.error('Admin delete review error:', error);
        res.status(500).json({ success: false, message: 'Error deleting review' });
    }
});
exports.default = router;
//# sourceMappingURL=reviews.js.map