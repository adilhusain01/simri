import pool from '../config/database';
import { emailService } from './emailService';

interface InventoryUpdate {
  product_id: string;
  change_type: 'adjustment' | 'sale' | 'return' | 'restock';
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  notes?: string;
  user_id?: string;
  order_id?: string;
}

class InventoryService {
  private readonly LOW_STOCK_THRESHOLD = 5;

  // Create inventory history table if not exists
  async initializeTables(): Promise<void> {
    try {
      // Create inventory history table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS inventory_history (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          product_id UUID REFERENCES products(id) ON DELETE CASCADE,
          change_type VARCHAR(20) NOT NULL,
          quantity_change INTEGER NOT NULL,
          previous_quantity INTEGER NOT NULL,
          new_quantity INTEGER NOT NULL,
          notes TEXT,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create indexes for better performance
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_inventory_history_product_id ON inventory_history(product_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_history_created_at ON inventory_history(created_at);
      `);

      console.log('✅ Inventory tables initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing inventory tables:', error);
      throw error;
    }
  }

  // Get available stock for a product
  async getAvailableStock(productId: string): Promise<number> {
    try {
      const result = await pool.query(
        'SELECT stock_quantity FROM products WHERE id = $1 AND is_active = true',
        [productId]
      );

      if (result.rows.length === 0) {
        throw new Error('Product not found or inactive');
      }

      return parseInt(result.rows[0].stock_quantity) || 0;
    } catch (error) {
      console.error('Error getting available stock:', error);
      throw new Error('Failed to get stock information');
    }
  }

  // Update stock quantity
  async updateStock(
    productId: string, 
    quantityChange: number, 
    changeType: 'adjustment' | 'sale' | 'return' | 'restock' = 'adjustment',
    options: {
      notes?: string;
      userId?: string;
      orderId?: string;
    } = {}
  ): Promise<{ success: boolean; newStock: number }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current stock
      const currentStockResult = await client.query(
        'SELECT stock_quantity FROM products WHERE id = $1',
        [productId]
      );

      if (currentStockResult.rows.length === 0) {
        throw new Error('Product not found');
      }

      const currentStock = parseInt(currentStockResult.rows[0].stock_quantity) || 0;
      const newStock = Math.max(0, currentStock + quantityChange); // Prevent negative stock

      // Update product stock
      await client.query(
        'UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2',
        [newStock, productId]
      );

      // Record in inventory history
      await client.query(`
        INSERT INTO inventory_history (
          product_id, change_type, quantity_change, previous_quantity, 
          new_quantity, notes, user_id, order_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        productId, changeType, quantityChange, currentStock, 
        newStock, options.notes, options.userId, options.orderId
      ]);

      await client.query('COMMIT');

      // Check for low stock and send alerts
      if (newStock <= this.LOW_STOCK_THRESHOLD && newStock > 0) {
        console.log(`⚠️ Low stock alert for product ${productId}: ${newStock} remaining`);
        try {
          await this.sendLowStockAlert(productId, newStock);
        } catch (alertError) {
          console.error('Failed to send low stock alert:', alertError);
        }
      }

      return { success: true, newStock };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating stock:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Handle order cancellation - restore stock
  async handleOrderCancellation(orderId: string): Promise<void> {
    try {
      // Get order items to restore stock
      const orderItemsResult = await pool.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [orderId]
      );

      for (const item of orderItemsResult.rows) {
        await this.updateStock(
          item.product_id,
          item.quantity, // Add back the quantity
          'return',
          { 
            notes: `Stock restored from cancelled order ${orderId}`,
            orderId 
          }
        );
      }

      console.log(`✅ Stock restored for cancelled order ${orderId}`);
    } catch (error) {
      console.error('Error handling order cancellation:', error);
      throw error;
    }
  }

  // Get inventory history for a product
  async getInventoryHistory(
    productId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<InventoryUpdate[]> {
    try {
      const result = await pool.query(`
        SELECT 
          ih.*,
          u.name as user_name,
          p.name as product_name
        FROM inventory_history ih
        LEFT JOIN users u ON ih.user_id = u.id
        LEFT JOIN products p ON ih.product_id = p.id
        WHERE ih.product_id = $1
        ORDER BY ih.created_at DESC
        LIMIT $2 OFFSET $3
      `, [productId, limit, offset]);

      return result.rows;
    } catch (error) {
      console.error('Error getting inventory history:', error);
      throw error;
    }
  }

  // Get low stock products
  async getLowStockProducts(threshold: number = this.LOW_STOCK_THRESHOLD): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.stock_quantity,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.stock_quantity <= $1 AND p.stock_quantity > 0 AND p.is_active = true
        ORDER BY p.stock_quantity ASC, p.name ASC
      `, [threshold]);

      return result.rows;
    } catch (error) {
      console.error('Error getting low stock products:', error);
      throw error;
    }
  }

  // Send low stock alert
  private async sendLowStockAlert(productId: string, currentStock: number): Promise<void> {
    try {
      // Get product details
      const productResult = await pool.query(
        'SELECT name, sku FROM products WHERE id = $1',
        [productId]
      );

      if (productResult.rows.length === 0) return;

      const product = productResult.rows[0];
      const subject = `Low Stock Alert: ${product.name}`;
      const message = `
        Product: ${product.name} (SKU: ${product.sku})
        Current Stock: ${currentStock}
        
        Please restock this product soon to avoid stockouts.
      `;

      // You can customize this to send to specific admin emails
      // await emailService.sendSystemAlert(subject, message);
      
    } catch (error) {
      console.error('Error sending low stock alert:', error);
    }
  }

  // Get stock statistics
  async getStockStatistics(): Promise<{
    totalProducts: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  }> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_products,
          COUNT(CASE WHEN stock_quantity > ${this.LOW_STOCK_THRESHOLD} THEN 1 END) as in_stock,
          COUNT(CASE WHEN stock_quantity > 0 AND stock_quantity <= ${this.LOW_STOCK_THRESHOLD} THEN 1 END) as low_stock,
          COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock,
          SUM(stock_quantity * price) as total_value
        FROM products 
        WHERE is_active = true
      `);

      const stats = result.rows[0];
      return {
        totalProducts: parseInt(stats.total_products),
        inStock: parseInt(stats.in_stock),
        lowStock: parseInt(stats.low_stock),
        outOfStock: parseInt(stats.out_of_stock),
        totalValue: parseFloat(stats.total_value) || 0
      };
    } catch (error) {
      console.error('Error getting stock statistics:', error);
      throw error;
    }
  }

  // Record inventory change (called by Product model)
  async recordInventoryChange(data: {
    product_id: string;
    change_type: 'adjustment' | 'sale' | 'return' | 'restock';
    quantity_change: number;
    previous_quantity: number;
    new_quantity: number;
    notes?: string;
    user_id?: string;
    order_id?: string;
  }): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO inventory_history (
          product_id, change_type, quantity_change, previous_quantity, 
          new_quantity, notes, user_id, order_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        data.product_id, 
        data.change_type, 
        data.quantity_change, 
        data.previous_quantity,
        data.new_quantity, 
        data.notes, 
        data.user_id, 
        data.order_id
      ]);

      console.log(`📦 Recorded inventory change: ${data.change_type} ${data.quantity_change} for product ${data.product_id}`);
    } catch (error) {
      console.error('Error recording inventory change:', error);
      throw error;
    }
  }

  // Start periodic cleanup (placeholder method)
  startPeriodicCleanup(): void {
    console.log('✅ Inventory periodic cleanup started');
    // This is a placeholder - in a real implementation you might clean up old inventory history records
    // setInterval(() => {
    //   // Clean up old inventory history records older than 1 year
    //   this.cleanupOldInventoryHistory();
    // }, 24 * 60 * 60 * 1000); // Run daily
  }

  // Clean up old inventory history (placeholder)
  private async cleanupOldInventoryHistory(): Promise<void> {
    try {
      // Remove inventory history older than 1 year
      const result = await pool.query(`
        DELETE FROM inventory_history 
        WHERE created_at < NOW() - INTERVAL '1 year'
      `);
      console.log(`🧹 Cleaned up ${result.rowCount} old inventory history records`);
    } catch (error) {
      console.error('Error cleaning up inventory history:', error);
    }
  }
}

export const inventoryService = new InventoryService();