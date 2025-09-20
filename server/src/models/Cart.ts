import pool from '../config/database';
import { Cart, CartItem } from '../types';

export class CartModel {
  static async findByUserId(userId: string): Promise<Cart | null> {
    const result = await pool.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
    return result.rows[0] || null;
  }

  static async findBySessionId(sessionId: string): Promise<Cart | null> {
    const result = await pool.query('SELECT * FROM carts WHERE session_id = $1', [sessionId]);
    return result.rows[0] || null;
  }

  static async create(cartData: Partial<Cart>): Promise<Cart> {
    const { user_id, session_id } = cartData;
    
    const result = await pool.query(`
      INSERT INTO carts (user_id, session_id) 
      VALUES ($1, $2) 
      RETURNING *
    `, [user_id, session_id]);
    
    return result.rows[0];
  }

  static async getOrCreateUserCart(userId: string): Promise<Cart> {
    let cart = await this.findByUserId(userId);
    if (!cart) {
      cart = await this.create({ user_id: userId });
    }
    return cart;
  }

  static async getOrCreateSessionCart(sessionId: string): Promise<Cart> {
    let cart = await this.findBySessionId(sessionId);
    if (!cart) {
      cart = await this.create({ session_id: sessionId });
    }
    return cart;
  }
}

export class CartItemModel {
  static async findByCartId(cartId: string): Promise<CartItem[]> {
    const result = await pool.query(`
      SELECT ci.*, p.name, p.images, p.price as current_price, p.stock_quantity 
      FROM cart_items ci 
      JOIN products p ON ci.product_id = p.id 
      WHERE ci.cart_id = $1 
      ORDER BY ci.created_at DESC
    `, [cartId]);
    return result.rows;
  }

  static async findByCartAndProduct(cartId: string, productId: string): Promise<CartItem | null> {
    const result = await pool.query(`
      SELECT * FROM cart_items 
      WHERE cart_id = $1 AND product_id = $2
    `, [cartId, productId]);
    return result.rows[0] || null;
  }

  static async addItem(cartId: string, productId: string, quantity: number, price: number): Promise<CartItem> {
    const result = await pool.query(`
      INSERT INTO cart_items (cart_id, product_id, quantity, price_at_time) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (cart_id, product_id) 
      DO UPDATE SET 
        quantity = cart_items.quantity + $3,
        updated_at = NOW()
      RETURNING *
    `, [cartId, productId, quantity, price]);
    
    return result.rows[0];
  }

  static async updateQuantity(id: string, quantity: number): Promise<CartItem | null> {
    const result = await pool.query(`
      UPDATE cart_items 
      SET quantity = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `, [quantity, id]);
    
    return result.rows[0] || null;
  }

  static async removeItem(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM cart_items WHERE id = $1', [id]);
    return result.rowCount! > 0;
  }

  static async clearCart(cartId: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    return result.rowCount! > 0;
  }
}