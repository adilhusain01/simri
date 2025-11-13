import pool from '../config/database';

interface ProductRecommendation {
  id: string;
  name: string;
  price: number;
  discount_price?: number;
  images: string;
  category_id: string;
  category_name?: string;
  average_rating: number;
  total_reviews: number;
  score: number;
}

interface PurchasePattern {
  product_id: string;
  co_purchased_with: string;
  frequency: number;
}

class RecommendationService {
  /**
   * Get related products based on category and tags
   */
  async getRelatedProducts(
    productId: string, 
    limit: number = 8
  ): Promise<ProductRecommendation[]> {
    try {
      const result = await pool.query(`
        WITH current_product AS (
          SELECT category_id, tags, price
          FROM products 
          WHERE id = $1 AND is_active = true
        ),
        similar_products AS (
          SELECT
            p.id,
            p.name,
            p.price,
            p.discount_price,
            p.images,
            p.category_id,
            c.name as category_name,
            COALESCE(pr.average_rating, 0) as average_rating,
            COALESCE(pr.total_reviews, 0) as total_reviews,
            -- Scoring algorithm
            CASE
              WHEN p.category_id = cp.category_id THEN 10
              ELSE 0
            END +
            CASE
              WHEN p.tags && cp.tags THEN 5 * array_length(array(SELECT unnest(p.tags) INTERSECT SELECT unnest(cp.tags)), 1)
              ELSE 0
            END +
            CASE
              WHEN ABS(p.price - cp.price) <= cp.price * 0.3 THEN 3
              ELSE 0
            END +
            COALESCE(pr.average_rating, 0) as score
          FROM products p
          CROSS JOIN current_product cp
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN product_reviews_summary pr ON p.id = pr.product_id
          WHERE p.id != $1
            AND p.is_active = true
            AND p.stock_quantity > 0
        )
        SELECT * FROM similar_products
        WHERE score > 0
        ORDER BY score DESC, average_rating DESC
        LIMIT $2
      `, [productId, limit]);

      return result.rows;
    } catch (error) {
      console.error('Get related products error:', error);
      return [];
    }
  }

  /**
   * Get "Customers Also Bought" recommendations
   */
  async getCustomersAlsoBought(
    productId: string, 
    limit: number = 6
  ): Promise<ProductRecommendation[]> {
    try {
      const result = await pool.query(`
        WITH product_pairs AS (
          -- Find orders that contain the target product
          SELECT DISTINCT oi2.product_id, COUNT(*) as frequency
          FROM order_items oi1
          JOIN order_items oi2 ON oi1.order_id = oi2.order_id
          WHERE oi1.product_id = $1 
            AND oi2.product_id != $1
          GROUP BY oi2.product_id
        ),
        recommended_products AS (
          SELECT
            p.id,
            p.name,
            p.price,
            p.discount_price,
            p.images,
            p.category_id,
            c.name as category_name,
            COALESCE(pr.average_rating, 0) as average_rating,
            COALESCE(pr.total_reviews, 0) as total_reviews,
            pp.frequency * 2 + COALESCE(pr.average_rating, 0) as score
          FROM product_pairs pp
          JOIN products p ON pp.product_id = p.id
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN product_reviews_summary pr ON p.id = pr.product_id
          WHERE p.is_active = true AND p.stock_quantity > 0
        )
        SELECT * FROM recommended_products
        ORDER BY score DESC, frequency DESC
        LIMIT $2
      `, [productId, limit]);

      return result.rows;
    } catch (error) {
      console.error('Get customers also bought error:', error);
      return [];
    }
  }

  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(
    userId: string, 
    limit: number = 10
  ): Promise<ProductRecommendation[]> {
    try {
      const result = await pool.query(`
        WITH user_preferences AS (
          -- Get user's purchase history and preferences
          SELECT 
            p.category_id,
            COUNT(*) as category_frequency,
            AVG(p.price) as avg_price_range
          FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          JOIN products p ON oi.product_id = p.id
          WHERE o.user_id = $1 AND o.status = 'delivered'
          GROUP BY p.category_id
        ),
        user_interactions AS (
          -- Include wishlist and cart items as preference indicators
          SELECT DISTINCT product_id
          FROM (
            SELECT product_id FROM wishlists WHERE user_id = $1
            UNION
            SELECT product_id FROM cart_items ci JOIN carts c ON ci.cart_id = c.id WHERE c.user_id = $1
          ) interactions
        ),
        recommended_products AS (
          SELECT
            p.id,
            p.name,
            p.price,
            p.discount_price,
            p.images,
            p.category_id,
            c.name as category_name,
            COALESCE(pr.average_rating, 0) as average_rating,
            COALESCE(pr.total_reviews, 0) as total_reviews,
            -- Scoring based on user preferences
            COALESCE(up.category_frequency * 3, 0) +
            CASE
              WHEN p.price BETWEEN COALESCE(up.avg_price_range * 0.7, 0)
                               AND COALESCE(up.avg_price_range * 1.3, 999999) THEN 2
              ELSE 0
            END +
            COALESCE(pr.average_rating, 0) +
            CASE WHEN ui.product_id IS NOT NULL THEN 5 ELSE 0 END as score
          FROM products p
          LEFT JOIN user_preferences up ON p.category_id = up.category_id
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN product_reviews_summary pr ON p.id = pr.product_id
          LEFT JOIN user_interactions ui ON p.id = ui.product_id
          WHERE p.is_active = true
            AND p.stock_quantity > 0
            AND p.id NOT IN (
              -- Exclude already purchased products
              SELECT DISTINCT oi.product_id
              FROM orders o
              JOIN order_items oi ON o.id = oi.order_id
              WHERE o.user_id = $1
            )
        )
        SELECT * FROM recommended_products
        WHERE score > 0
        ORDER BY score DESC, average_rating DESC
        LIMIT $2
      `, [userId, limit]);

      return result.rows;
    } catch (error) {
      console.error('Get personalized recommendations error:', error);
      return [];
    }
  }

  /**
   * Get trending products (popular items)
   */
  async getTrendingProducts(limit: number = 8): Promise<ProductRecommendation[]> {
    try {
      const result = await pool.query(`
        WITH trending_products AS (
          SELECT
            p.id,
            p.name,
            p.price,
            p.discount_price,
            p.images,
            p.category_id,
            c.name as category_name,
            COALESCE(pr.average_rating, 0) as average_rating,
            COALESCE(pr.total_reviews, 0) as total_reviews,
            -- Trending score based on recent sales and reviews
            COALESCE(recent_sales.sales_count, 0) * 3 +
            COALESCE(pr.total_reviews, 0) * 0.5 +
            COALESCE(pr.average_rating, 0) * 2 as score
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN product_reviews_summary pr ON p.id = pr.product_id
          LEFT JOIN (
            SELECT 
              oi.product_id,
              COUNT(*) as sales_count
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.created_at >= NOW() - INTERVAL '30 days'
              AND o.status IN ('completed', 'delivered')
            GROUP BY oi.product_id
          ) recent_sales ON p.id = recent_sales.product_id
          WHERE p.is_active = true AND p.stock_quantity > 0
        )
        SELECT * FROM trending_products
        ORDER BY score DESC, average_rating DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      console.error('Get trending products error:', error);
      return [];
    }
  }

  /**
   * Update purchase patterns (to be called after order completion)
   */
  async updatePurchasePatterns(orderId: string): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO product_purchase_patterns (product_id, co_purchased_with, frequency)
        SELECT 
          oi1.product_id,
          oi2.product_id,
          1
        FROM order_items oi1
        CROSS JOIN order_items oi2
        WHERE oi1.order_id = $1 
          AND oi2.order_id = $1
          AND oi1.product_id != oi2.product_id
        ON CONFLICT (product_id, co_purchased_with)
        DO UPDATE SET 
          frequency = product_purchase_patterns.frequency + 1,
          updated_at = NOW()
      `, [orderId]);
    } catch (error) {
      console.error('Update purchase patterns error:', error);
    }
  }

  /**
   * Get recommendation analytics for admin
   */
  async getRecommendationAnalytics(): Promise<any> {
    try {
      const [patterns, topRecommended, performance] = await Promise.all([
        // Purchase patterns
        pool.query(`
          SELECT 
            p1.name as product_name,
            p2.name as co_purchased_with,
            ppp.frequency
          FROM product_purchase_patterns ppp
          JOIN products p1 ON ppp.product_id = p1.id
          JOIN products p2 ON ppp.co_purchased_with = p2.id
          ORDER BY ppp.frequency DESC
          LIMIT 20
        `),
        
        // Most recommended products
        pool.query(`
          SELECT 
            p.name,
            p.category_id,
            COUNT(*) as recommendation_count
          FROM products p
          JOIN product_reviews_summary pr ON p.id = pr.product_id
          WHERE pr.average_rating >= 4.0
          GROUP BY p.id, p.name, p.category_id
          ORDER BY recommendation_count DESC
          LIMIT 10
        `),

        // Recommendation performance
        pool.query(`
          SELECT 
            DATE_TRUNC('day', created_at) as date,
            COUNT(*) as total_orders,
            COUNT(CASE WHEN recommended_product = true THEN 1 END) as recommended_purchases
          FROM orders
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE_TRUNC('day', created_at)
          ORDER BY date DESC
        `)
      ]);

      return {
        purchase_patterns: patterns.rows,
        top_recommended: topRecommended.rows,
        performance: performance.rows
      };
    } catch (error) {
      console.error('Get recommendation analytics error:', error);
      return {
        purchase_patterns: [],
        top_recommended: [],
        performance: []
      };
    }
  }
}

export const recommendationService = new RecommendationService();