import pool from '../config/database';
import { Review } from '../types';

export class ReviewModel {
  static async findByProductId(productId: string, limit: number = 20, offset: number = 0): Promise<Review[]> {
    const result = await pool.query(`
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
            } else {
              // Plain string path, convert to array
              parsedImages = [review.images];
            }
          } else if (Array.isArray(review.images)) {
            // Already an array
            parsedImages = review.images;
          } else {
            // Single string path, convert to array
            parsedImages = [review.images];
          }
        } catch (error) {
          console.warn('Failed to parse review images:', review.images, error);
          // If JSON parse fails, treat as single image path
          if (typeof review.images === 'string') {
            parsedImages = [review.images];
          } else {
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

  static async findByUserId(userId: string, limit: number = 10, offset: number = 0): Promise<Review[]> {
    const result = await pool.query(`
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
            } else {
              // Plain string path, convert to array
              parsedImages = [review.images];
            }
          } else if (Array.isArray(review.images)) {
            // Already an array
            parsedImages = review.images;
          } else {
            // Single string path, convert to array
            parsedImages = [review.images];
          }
        } catch (error) {
          console.warn('Failed to parse review images:', review.images, error);
          // If JSON parse fails, treat as single image path
          if (typeof review.images === 'string') {
            parsedImages = [review.images];
          } else {
            parsedImages = null;
          }
        }
      }
      
      if (review.product_images) {
        try {
          parsedProductImages = typeof review.product_images === 'string' ? JSON.parse(review.product_images) : review.product_images;
        } catch (error) {
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

  static async findById(id: string): Promise<Review | null> {
    const result = await pool.query(`
      SELECT r.*, u.name as user_name, u.avatar_url as user_avatar,
             p.name as product_name 
      FROM reviews r 
      JOIN users u ON r.user_id = u.id 
      JOIN products p ON r.product_id = p.id 
      WHERE r.id = $1
    `, [id]);
    
    const review = result.rows[0];
    if (!review) return null;
    
    // Parse JSON images field
    let parsedImages = null;
    if (review.images) {
      try {
        if (typeof review.images === 'string') {
          // Check if it looks like a JSON string (starts with [ or {)
          if (review.images.trim().startsWith('[') || review.images.trim().startsWith('{')) {
            parsedImages = JSON.parse(review.images);
          } else {
            // Plain string path, convert to array
            parsedImages = [review.images];
          }
        } else if (Array.isArray(review.images)) {
          // Already an array
          parsedImages = review.images;
        } else {
          // Single string path, convert to array
          parsedImages = [review.images];
        }
      } catch (error) {
        console.warn('Failed to parse review images:', review.images, error);
        // If JSON parse fails, treat as single image path
        if (typeof review.images === 'string') {
          parsedImages = [review.images];
        } else {
          parsedImages = null;
        }
      }
    }
    
    return {
      ...review,
      images: parsedImages
    };
  }

  static async create(reviewData: Partial<Review>): Promise<Review> {
    const {
      user_id, product_id, order_id, rating, title, comment, 
      images, is_verified_purchase = false
    } = reviewData;
    
    const result = await pool.query(`
      INSERT INTO reviews (
        user_id, product_id, order_id, rating, title, comment, 
        images, is_verified_purchase
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *
    `, [
      user_id, product_id, order_id, rating, title, comment, 
      JSON.stringify(images), is_verified_purchase
    ]);
    
    const review = result.rows[0];
    // Parse JSON images field
    let parsedImages = null;
    if (review.images) {
      try {
        parsedImages = typeof review.images === 'string' ? JSON.parse(review.images) : review.images;
      } catch (error) {
        console.warn('Failed to parse review images:', review.images, error);
        parsedImages = null;
      }
    }
    
    return {
      ...review,
      images: parsedImages
    };
  }

  static async update(id: string, reviewData: Partial<Review>): Promise<Review | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(reviewData)) {
      if (value !== undefined && key !== 'id') {
        if (key === 'images') {
          fields.push(`${key} = $${paramCount++}`);
          values.push(JSON.stringify(value));
        } else {
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
    
    const result = await pool.query(query, values);
    const review = result.rows[0];
    if (!review) return null;
    
    // Parse JSON images field
    return {
      ...review,
      images: review.images ? JSON.parse(review.images) : null
    };
  }

  static async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
    return result.rowCount! > 0;
  }

  static async getProductRatingStats(productId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { [key: number]: number };
  }> {
    // Get average rating and total reviews
    const statsResult = await pool.query(`
      SELECT 
        AVG(rating)::numeric(3,2) as average_rating,
        COUNT(*) as total_reviews
      FROM reviews 
      WHERE product_id = $1 AND is_approved = true
    `, [productId]);

    // Get rating distribution
    const distributionResult = await pool.query(`
      SELECT rating, COUNT(*) as count
      FROM reviews 
      WHERE product_id = $1 AND is_approved = true
      GROUP BY rating
      ORDER BY rating DESC
    `, [productId]);

    const ratingDistribution: { [key: number]: number } = {};
    distributionResult.rows.forEach(row => {
      ratingDistribution[row.rating] = parseInt(row.count);
    });

    return {
      averageRating: parseFloat(statsResult.rows[0].average_rating) || 0,
      totalReviews: parseInt(statsResult.rows[0].total_reviews) || 0,
      ratingDistribution
    };
  }

  static async checkUserCanReview(userId: string, productId: string): Promise<{
    canReview: boolean;
    reason?: string;
    isVerifiedPurchase: boolean;
  }> {
    // Check if user has already reviewed this product
    const existingReview = await pool.query(`
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

    // Check if user has purchased this product
    const purchaseCheck = await pool.query(`
      SELECT o.id, o.payment_status 
      FROM orders o 
      JOIN order_items oi ON o.id = oi.order_id 
      WHERE o.user_id = $1 AND oi.product_id = $2 AND o.payment_status = 'paid'
      LIMIT 1
    `, [userId, productId]);

    const isVerifiedPurchase = purchaseCheck.rows.length > 0;

    return {
      canReview: true,
      isVerifiedPurchase
    };
  }

  static async incrementHelpfulCount(id: string): Promise<Review | null> {
    const result = await pool.query(`
      UPDATE reviews 
      SET helpful_count = helpful_count + 1 
      WHERE id = $1 
      RETURNING *
    `, [id]);
    
    return result.rows[0] || null;
  }
}