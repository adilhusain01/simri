"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class ReviewModel {
    static async findByProductId(productId, limit = 20, offset = 0) {
        const result = await database_1.default.query(`
      SELECT r.*, u.name as user_name, u.avatar_url as user_avatar
      FROM reviews r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.product_id = $1 AND r.is_approved = true
      ORDER BY r.created_at DESC 
      LIMIT $2 OFFSET $3
    `, [productId, limit, offset]);
        // Parse JSON images field for each review
        return result.rows.map(review => {
            let parsedImages = null;
            if (review.images) {
                try {
                    if (typeof review.images === 'string') {
                        // Check if it looks like a JSON string (starts with [ or {)
                        if (review.images.trim().startsWith('[') || review.images.trim().startsWith('{')) {
                            parsedImages = JSON.parse(review.images);
                        }
                        else {
                            // Plain string path, convert to array
                            parsedImages = [review.images];
                        }
                    }
                    else if (Array.isArray(review.images)) {
                        // Already an array
                        parsedImages = review.images;
                    }
                    else {
                        // Single string path, convert to array
                        parsedImages = [review.images];
                    }
                }
                catch (error) {
                    console.warn('Failed to parse review images:', review.images, error);
                    // If JSON parse fails, treat as single image path
                    if (typeof review.images === 'string') {
                        parsedImages = [review.images];
                    }
                    else {
                        parsedImages = null;
                    }
                }
            }
            return {
                ...review,
                images: parsedImages
            };
        });
    }
    static async findByUserId(userId, limit = 10, offset = 0) {
        const result = await database_1.default.query(`
      SELECT r.*, p.name as product_name, p.images as product_images
      FROM reviews r 
      JOIN products p ON r.product_id = p.id 
      WHERE r.user_id = $1 
      ORDER BY r.created_at DESC 
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);
        // Parse JSON images field for each review
        return result.rows.map(review => {
            let parsedImages = null;
            let parsedProductImages = null;
            if (review.images) {
                try {
                    if (typeof review.images === 'string') {
                        // Check if it looks like a JSON string (starts with [ or {)
                        if (review.images.trim().startsWith('[') || review.images.trim().startsWith('{')) {
                            parsedImages = JSON.parse(review.images);
                        }
                        else {
                            // Plain string path, convert to array
                            parsedImages = [review.images];
                        }
                    }
                    else if (Array.isArray(review.images)) {
                        // Already an array
                        parsedImages = review.images;
                    }
                    else {
                        // Single string path, convert to array
                        parsedImages = [review.images];
                    }
                }
                catch (error) {
                    console.warn('Failed to parse review images:', review.images, error);
                    // If JSON parse fails, treat as single image path
                    if (typeof review.images === 'string') {
                        parsedImages = [review.images];
                    }
                    else {
                        parsedImages = null;
                    }
                }
            }
            if (review.product_images) {
                try {
                    parsedProductImages = typeof review.product_images === 'string' ? JSON.parse(review.product_images) : review.product_images;
                }
                catch (error) {
                    console.warn('Failed to parse product images:', review.product_images, error);
                    parsedProductImages = null;
                }
            }
            return {
                ...review,
                images: parsedImages,
                product_images: parsedProductImages
            };
        });
    }
    static async findById(id) {
        const result = await database_1.default.query(`
      SELECT r.*, u.name as user_name, u.avatar_url as user_avatar,
             p.name as product_name 
      FROM reviews r 
      JOIN users u ON r.user_id = u.id 
      JOIN products p ON r.product_id = p.id 
      WHERE r.id = $1
    `, [id]);
        const review = result.rows[0];
        if (!review)
            return null;
        // Parse JSON images field
        let parsedImages = null;
        if (review.images) {
            try {
                if (typeof review.images === 'string') {
                    // Check if it looks like a JSON string (starts with [ or {)
                    if (review.images.trim().startsWith('[') || review.images.trim().startsWith('{')) {
                        parsedImages = JSON.parse(review.images);
                    }
                    else {
                        // Plain string path, convert to array
                        parsedImages = [review.images];
                    }
                }
                else if (Array.isArray(review.images)) {
                    // Already an array
                    parsedImages = review.images;
                }
                else {
                    // Single string path, convert to array
                    parsedImages = [review.images];
                }
            }
            catch (error) {
                console.warn('Failed to parse review images:', review.images, error);
                // If JSON parse fails, treat as single image path
                if (typeof review.images === 'string') {
                    parsedImages = [review.images];
                }
                else {
                    parsedImages = null;
                }
            }
        }
        return {
            ...review,
            images: parsedImages
        };
    }
    static async create(reviewData) {
        const { user_id, product_id, order_id, rating, title, comment, images, is_verified_purchase = false, is_approved = true } = reviewData;
        const result = await database_1.default.query(`
      INSERT INTO reviews (
        user_id, product_id, order_id, rating, title, comment,
        images, is_verified_purchase, is_approved
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
            user_id, product_id, order_id, rating, title, comment,
            JSON.stringify(images), is_verified_purchase, is_approved
        ]);
        const review = result.rows[0];
        // Update product review summary
        await this.updateProductReviewSummary(product_id);
        // Parse JSON images field
        let parsedImages = null;
        if (review.images) {
            try {
                parsedImages = typeof review.images === 'string' ? JSON.parse(review.images) : review.images;
            }
            catch (error) {
                console.warn('Failed to parse review images:', review.images, error);
                parsedImages = null;
            }
        }
        return {
            ...review,
            images: parsedImages
        };
    }
    static async update(id, reviewData) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        for (const [key, value] of Object.entries(reviewData)) {
            if (value !== undefined && key !== 'id') {
                if (key === 'images') {
                    fields.push(`${key} = $${paramCount++}`);
                    values.push(JSON.stringify(value));
                }
                else {
                    fields.push(`${key} = $${paramCount++}`);
                    values.push(value);
                }
            }
        }
        if (fields.length === 0) {
            return this.findById(id);
        }
        values.push(id);
        const query = `UPDATE reviews SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        const result = await database_1.default.query(query, values);
        const review = result.rows[0];
        if (!review)
            return null;
        // Update product review summary
        await this.updateProductReviewSummary(review.product_id);
        // Parse JSON images field
        return {
            ...review,
            images: review.images ? JSON.parse(review.images) : null
        };
    }
    static async delete(id) {
        // Get product_id before deletion for summary update
        const reviewResult = await database_1.default.query('SELECT product_id FROM reviews WHERE id = $1', [id]);
        const productId = reviewResult.rows[0]?.product_id;
        const result = await database_1.default.query('DELETE FROM reviews WHERE id = $1', [id]);
        if (result.rowCount > 0 && productId) {
            // Update product review summary
            await this.updateProductReviewSummary(productId);
        }
        return result.rowCount > 0;
    }
    static async getProductRatingStats(productId) {
        // Get average rating and total reviews
        const statsResult = await database_1.default.query(`
      SELECT 
        AVG(rating)::numeric(3,2) as average_rating,
        COUNT(*) as total_reviews
      FROM reviews 
      WHERE product_id = $1 AND is_approved = true
    `, [productId]);
        // Get rating distribution
        const distributionResult = await database_1.default.query(`
      SELECT rating, COUNT(*) as count
      FROM reviews 
      WHERE product_id = $1 AND is_approved = true
      GROUP BY rating
      ORDER BY rating DESC
    `, [productId]);
        const ratingDistribution = {};
        distributionResult.rows.forEach(row => {
            ratingDistribution[row.rating] = parseInt(row.count);
        });
        return {
            averageRating: parseFloat(statsResult.rows[0].average_rating) || 0,
            totalReviews: parseInt(statsResult.rows[0].total_reviews) || 0,
            ratingDistribution
        };
    }
    static async checkUserCanReview(userId, productId) {
        // Check if user has already reviewed this product
        const existingReview = await database_1.default.query(`
      SELECT id FROM reviews
      WHERE user_id = $1 AND product_id = $2
    `, [userId, productId]);
        if (existingReview.rows.length > 0) {
            return {
                canReview: false,
                reason: 'You have already reviewed this product',
                isVerifiedPurchase: false
            };
        }
        // Check if user has purchased this product (VERIFIED PURCHASE REQUIRED)
        const purchaseCheck = await database_1.default.query(`
      SELECT o.id, o.payment_status
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1 AND oi.product_id = $2 AND o.payment_status = 'paid'
      LIMIT 1
    `, [userId, productId]);
        const isVerifiedPurchase = purchaseCheck.rows.length > 0;
        if (!isVerifiedPurchase) {
            return {
                canReview: false,
                reason: 'You can only review products you have purchased',
                isVerifiedPurchase: false
            };
        }
        return {
            canReview: true,
            isVerifiedPurchase
        };
    }
    static async incrementHelpfulCount(id) {
        const result = await database_1.default.query(`
      UPDATE reviews
      SET helpful_count = helpful_count + 1
      WHERE id = $1
      RETURNING *
    `, [id]);
        return result.rows[0] || null;
    }
    // Update product review summary when reviews change
    static async updateProductReviewSummary(productId) {
        // Calculate new summary stats
        const statsResult = await database_1.default.query(`
      SELECT
        AVG(rating)::numeric(3,2) as average_rating,
        COUNT(*) as total_reviews
      FROM reviews
      WHERE product_id = $1 AND is_approved = true
    `, [productId]);
        // Get rating distribution
        const distributionResult = await database_1.default.query(`
      SELECT rating, COUNT(*) as count
      FROM reviews
      WHERE product_id = $1 AND is_approved = true
      GROUP BY rating
      ORDER BY rating
    `, [productId]);
        const ratingDistribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
        distributionResult.rows.forEach(row => {
            ratingDistribution[row.rating.toString()] = parseInt(row.count);
        });
        const averageRating = parseFloat(statsResult.rows[0].average_rating) || 0;
        const totalReviews = parseInt(statsResult.rows[0].total_reviews) || 0;
        // Upsert the summary
        await database_1.default.query(`
      INSERT INTO product_reviews_summary (product_id, average_rating, total_reviews, rating_distribution, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (product_id)
      DO UPDATE SET
        average_rating = EXCLUDED.average_rating,
        total_reviews = EXCLUDED.total_reviews,
        rating_distribution = EXCLUDED.rating_distribution,
        updated_at = NOW()
    `, [productId, averageRating, totalReviews, JSON.stringify(ratingDistribution)]);
    }
}
exports.ReviewModel = ReviewModel;
//# sourceMappingURL=Review.js.map