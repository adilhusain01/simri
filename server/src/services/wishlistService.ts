import pool from '../config/database';
import { Product } from '../types';

interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: Date;
  product?: Product;
}

interface WishlistResponse {
  items: WishlistItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class WishlistService {
  
  // Add product to wishlist
  async addToWishlist(userId: string, productId: string): Promise<{ success: boolean; message?: string; item?: WishlistItem }> {
    try {
      // Check if product exists
      const productCheck = await pool.query('SELECT id FROM products WHERE id = $1 AND is_active = true', [productId]);
      if (productCheck.rows.length === 0) {
        return { success: false, message: 'Product not found' };
      }

      // Check if already in wishlist
      const existingItem = await pool.query(
        'SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2',
        [userId, productId]
      );

      if (existingItem.rows.length > 0) {
        return { success: false, message: 'Product already in wishlist' };
      }

      // Add to wishlist
      const result = await pool.query(`
        INSERT INTO wishlists (user_id, product_id)
        VALUES ($1, $2)
        RETURNING *
      `, [userId, productId]);

      return {
        success: true,
        message: 'Product added to wishlist',
        item: result.rows[0]
      };
    } catch (error) {
      console.error('Add to wishlist error:', error);
      return { success: false, message: 'Error adding product to wishlist' };
    }
  }

  // Remove product from wishlist
  async removeFromWishlist(userId: string, productId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const result = await pool.query(`
        DELETE FROM wishlists 
        WHERE user_id = $1 AND product_id = $2
        RETURNING id
      `, [userId, productId]);

      if (result.rows.length === 0) {
        return { success: false, message: 'Product not found in wishlist' };
      }

      return {
        success: true,
        message: 'Product removed from wishlist'
      };
    } catch (error) {
      console.error('Remove from wishlist error:', error);
      return { success: false, message: 'Error removing product from wishlist' };
    }
  }

  // Get user's wishlist
  async getUserWishlist(userId: string, page: number = 1, limit: number = 20): Promise<WishlistResponse> {
    try {
      const offset = (page - 1) * limit;

      // Get wishlist items with product details
      const itemsResult = await pool.query(`
        SELECT 
          w.*,
          p.id as product_id,
          p.name,
          p.slug,
          p.price,
          p.discount_price,
          p.images,
          p.is_active,
          p.stock_quantity,
          p.is_featured,
          c.name as category_name
        FROM wishlists w
        JOIN products p ON w.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE w.user_id = $1 AND p.is_active = true
        ORDER BY w.created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      // Get total count
      const countResult = await pool.query(`
        SELECT COUNT(w.id) 
        FROM wishlists w
        JOIN products p ON w.product_id = p.id
        WHERE w.user_id = $1 AND p.is_active = true
      `, [userId]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      // Format the response
      const items: WishlistItem[] = itemsResult.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        product_id: row.product_id,
        created_at: row.created_at,
        product: {
          id: row.product_id,
          name: row.name,
          slug: row.slug,
          price: parseFloat(row.price),
          discount_price: row.discount_price ? parseFloat(row.discount_price) : undefined,
          images: row.images || [],
          is_active: row.is_active,
          stock_quantity: parseInt(row.stock_quantity),
          is_featured: row.is_featured,
          category_name: row.category_name
        } as any
      }));

      return {
        items,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      console.error('Get wishlist error:', error);
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      };
    }
  }

  // Check if product is in user's wishlist
  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2',
        [userId, productId]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Check wishlist error:', error);
      return false;
    }
  }

  // Get wishlist count for user
  async getWishlistCount(userId: string): Promise<number> {
    try {
      const result = await pool.query(`
        SELECT COUNT(w.id) 
        FROM wishlists w
        JOIN products p ON w.product_id = p.id
        WHERE w.user_id = $1 AND p.is_active = true
      `, [userId]);
      
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Get wishlist count error:', error);
      return 0;
    }
  }

  // Clear entire wishlist
  async clearWishlist(userId: string): Promise<{ success: boolean; message?: string; deletedCount?: number }> {
    try {
      const result = await pool.query(`
        DELETE FROM wishlists 
        WHERE user_id = $1
        RETURNING id
      `, [userId]);

      return {
        success: true,
        message: 'Wishlist cleared successfully',
        deletedCount: result.rows.length
      };
    } catch (error) {
      console.error('Clear wishlist error:', error);
      return { success: false, message: 'Error clearing wishlist' };
    }
  }

  // Move single wishlist item to cart by item ID
  async moveItemToCart(userId: string, itemId: string, quantity: number = 1): Promise<{ success: boolean; message?: string; cartItem?: any }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get the wishlist item and product details
      const itemResult = await client.query(`
        SELECT w.id, w.product_id, p.price, p.stock_quantity, p.name
        FROM wishlists w
        JOIN products p ON w.product_id = p.id
        WHERE w.id = $1 AND w.user_id = $2 AND p.is_active = true
      `, [itemId, userId]);

      if (itemResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Wishlist item not found' };
      }

      const item = itemResult.rows[0];
      
      if (parseInt(item.stock_quantity) < quantity) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Insufficient stock' };
      }

      // Get or create user's cart
      let cartResult = await client.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
      let cartId: string;

      if (cartResult.rows.length === 0) {
        const newCart = await client.query(
          'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
          [userId]
        );
        cartId = newCart.rows[0].id;
      } else {
        cartId = cartResult.rows[0].id;
      }

      // Check if already in cart
      const cartItemCheck = await client.query(
        'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
        [cartId, item.product_id]
      );

      let cartItem;
      if (cartItemCheck.rows.length > 0) {
        // Update quantity if already in cart
        const updateResult = await client.query(
          'UPDATE cart_items SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
          [quantity, cartItemCheck.rows[0].id]
        );
        cartItem = updateResult.rows[0];
      } else {
        // Add new item to cart
        const insertResult = await client.query(`
          INSERT INTO cart_items (cart_id, product_id, quantity, price_at_time)
          VALUES ($1, $2, $3, $4) RETURNING *
        `, [cartId, item.product_id, quantity, item.price]);
        cartItem = insertResult.rows[0];
      }

      // Remove from wishlist
      await client.query(
        'DELETE FROM wishlists WHERE id = $1',
        [itemId]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: `${item.name} moved to cart`,
        cartItem
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error moving item to cart:', error);
      return { success: false, message: 'Error moving item to cart' };
    } finally {
      client.release();
    }
  }

  // Move wishlist items to cart
  async moveToCart(userId: string, productIds: string[]): Promise<{ success: boolean; message?: string; movedCount?: number; errors?: string[] }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get or create user's cart
      let cartResult = await client.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
      let cartId: string;

      if (cartResult.rows.length === 0) {
        const newCart = await client.query(
          'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
          [userId]
        );
        cartId = newCart.rows[0].id;
      } else {
        cartId = cartResult.rows[0].id;
      }

      let movedCount = 0;
      const errors: string[] = [];

      for (const productId of productIds) {
        try {
          // Check if product is in wishlist
          const wishlistCheck = await client.query(
            'SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
          );

          if (wishlistCheck.rows.length === 0) {
            errors.push(`Product ${productId} not found in wishlist`);
            continue;
          }

          // Get product details
          const productResult = await client.query(
            'SELECT price, stock_quantity FROM products WHERE id = $1 AND is_active = true',
            [productId]
          );

          if (productResult.rows.length === 0) {
            errors.push(`Product ${productId} not available`);
            continue;
          }

          const product = productResult.rows[0];
          if (parseInt(product.stock_quantity) <= 0) {
            errors.push(`Product ${productId} out of stock`);
            continue;
          }

          // Check if already in cart
          const cartItemCheck = await client.query(
            'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
            [cartId, productId]
          );

          if (cartItemCheck.rows.length > 0) {
            // Update quantity if already in cart
            await client.query(
              'UPDATE cart_items SET quantity = quantity + 1, updated_at = NOW() WHERE id = $1',
              [cartItemCheck.rows[0].id]
            );
          } else {
            // Add new item to cart
            await client.query(`
              INSERT INTO cart_items (cart_id, product_id, quantity, price_at_time)
              VALUES ($1, $2, 1, $3)
            `, [cartId, productId, product.price]);
          }

          // Remove from wishlist
          await client.query(
            'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
          );

          movedCount++;
        } catch (itemError) {
          console.error(`Error processing product ${productId}:`, itemError);
          errors.push(`Error processing product ${productId}`);
        }
      }

      await client.query('COMMIT');

      return {
        success: true,
        message: `${movedCount} items moved to cart`,
        movedCount,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Move to cart error:', error);
      return { success: false, message: 'Error moving items to cart' };
    } finally {
      client.release();
    }
  }

  // Get wishlist insights (for analytics)
  async getWishlistInsights(userId: string): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN p.stock_quantity > 0 THEN 1 END) as available_items,
          COUNT(CASE WHEN p.stock_quantity = 0 THEN 1 END) as out_of_stock_items,
          COUNT(CASE WHEN p.discount_price IS NOT NULL THEN 1 END) as discounted_items,
          COALESCE(AVG(CASE WHEN p.discount_price IS NOT NULL THEN p.discount_price ELSE p.price END), 0) as avg_price,
          COALESCE(SUM(CASE WHEN p.discount_price IS NOT NULL THEN p.discount_price ELSE p.price END), 0) as total_value
        FROM wishlists w
        JOIN products p ON w.product_id = p.id
        WHERE w.user_id = $1 AND p.is_active = true
      `, [userId]);

      return result.rows[0];
    } catch (error) {
      console.error('Get wishlist insights error:', error);
      return {
        total_items: 0,
        available_items: 0,
        out_of_stock_items: 0,
        discounted_items: 0,
        avg_price: 0,
        total_value: 0
      };
    }
  }
}

export const wishlistService = new WishlistService();