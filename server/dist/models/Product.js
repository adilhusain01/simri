"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductModel = void 0;
const database_1 = __importDefault(require("../config/database"));
const inventoryService_1 = require("../services/inventoryService");
const uploadService_1 = require("../services/uploadService");
class ProductModel {
    static async findAll(limit = 20, offset = 0) {
        const result = await database_1.default.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = true 
      ORDER BY p.created_at DESC 
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
        return result.rows;
    }
    static async findById(id) {
        const result = await database_1.default.query(`
      SELECT p.*, c.name as category_name,
             COALESCE(rs.average_rating, 0) as average_rating,
             COALESCE(rs.total_reviews, 0) as total_reviews
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN (
        SELECT 
          product_id,
          AVG(rating::numeric)::numeric(3,2) as average_rating,
          COUNT(*)::int as total_reviews
        FROM reviews 
        WHERE is_approved = true
        GROUP BY product_id
      ) rs ON p.id = rs.product_id
      WHERE p.id = $1 AND p.is_active = true
    `, [id]);
        return result.rows[0] || null;
    }
    static async findBySlug(slug) {
        const result = await database_1.default.query(`
      SELECT p.*, c.name as category_name,
             COALESCE(rs.average_rating, 0) as average_rating,
             COALESCE(rs.total_reviews, 0) as total_reviews
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN (
        SELECT 
          product_id,
          AVG(rating::numeric)::numeric(3,2) as average_rating,
          COUNT(*)::int as total_reviews
        FROM reviews 
        WHERE is_approved = true
        GROUP BY product_id
      ) rs ON p.id = rs.product_id
      WHERE p.slug = $1 AND p.is_active = true
    `, [slug]);
        return result.rows[0] || null;
    }
    static async search(query, filters = {}, limit = 20, offset = 0) {
        let sql = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = true
    `;
        const params = [];
        let paramCount = 1;
        if (query) {
            sql += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount} OR p.tags && ARRAY[$${paramCount}])`;
            params.push(`%${query}%`);
            paramCount++;
        }
        if (filters.category_id) {
            sql += ` AND p.category_id = $${paramCount}`;
            params.push(filters.category_id);
            paramCount++;
        }
        if (filters.min_price) {
            sql += ` AND p.price >= $${paramCount}`;
            params.push(filters.min_price);
            paramCount++;
        }
        if (filters.max_price) {
            sql += ` AND p.price <= $${paramCount}`;
            params.push(filters.max_price);
            paramCount++;
        }
        sql += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);
        const result = await database_1.default.query(sql, params);
        return result.rows;
    }
    static async findFeatured(limit = 10) {
        const result = await database_1.default.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = true AND p.is_featured = true 
      ORDER BY p.created_at DESC 
      LIMIT $1
    `, [limit]);
        return result.rows;
    }
    static async findByCategory(categoryId, limit = 20, offset = 0) {
        const result = await database_1.default.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.category_id = $1 AND p.is_active = true 
      ORDER BY p.created_at DESC 
      LIMIT $2 OFFSET $3
    `, [categoryId, limit, offset]);
        return result.rows;
    }
    static async create(productData) {
        const { name, slug, description, short_description, sku, price, discount_price, stock_quantity, category_id, images, is_featured = false, is_active = true, weight, dimensions, tags, meta_title, meta_description } = productData;
        const result = await database_1.default.query(`
      INSERT INTO products (
        name, slug, description, short_description, sku, price, discount_price,
        stock_quantity, category_id, images, is_featured, is_active,
        weight, dimensions, tags, meta_title, meta_description
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
      RETURNING *
    `, [
            name, slug, description, short_description, sku, price, discount_price,
            stock_quantity, category_id, JSON.stringify(images), is_featured, is_active,
            weight, JSON.stringify(dimensions), tags, meta_title, meta_description
        ]);
        return result.rows[0];
    }
    static async updateStock(id, quantity, orderId) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get current stock
            const currentStockResult = await client.query('SELECT stock_quantity FROM products WHERE id = $1', [id]);
            if (currentStockResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }
            const previousQuantity = parseInt(currentStockResult.rows[0].stock_quantity);
            // Check if we have enough stock
            if (previousQuantity < quantity) {
                await client.query('ROLLBACK');
                return null;
            }
            const newQuantity = previousQuantity - quantity;
            // Update product stock
            const result = await client.query(`
        UPDATE products 
        SET stock_quantity = $1, updated_at = NOW()
        WHERE id = $2 
        RETURNING *
      `, [newQuantity, id]);
            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }
            // Record inventory history using the inventory service
            await inventoryService_1.inventoryService.recordInventoryChange({
                product_id: id,
                change_type: 'sale',
                quantity_change: -quantity,
                previous_quantity: previousQuantity,
                new_quantity: newQuantity,
                notes: 'Stock reduced for order',
                order_id: orderId
            });
            await client.query('COMMIT');
            // Check for low stock alerts
            if (newQuantity <= 5) {
                console.log(`Low stock alert for product ${id}: ${newQuantity} remaining`);
            }
            return result.rows[0];
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Update stock error:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    static async update(id, productData) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        // If images are being updated, handle Cloudinary deletion for removed images
        if (productData.images !== undefined) {
            try {
                // Get current product to compare images
                const currentProduct = await this.findById(id);
                if (currentProduct && currentProduct.images) {
                    const currentImages = Array.isArray(currentProduct.images) ? currentProduct.images : [];
                    const newImages = Array.isArray(productData.images) ? productData.images : [];
                    // Find images that were removed (exist in current but not in new)
                    const removedImages = currentImages.filter(currentImg => {
                        const currentUrl = typeof currentImg === 'object' ? currentImg.medium || currentImg.original : currentImg;
                        return !newImages.some(newImg => {
                            const newUrl = typeof newImg === 'object' ? newImg.medium || newImg.original : newImg;
                            return currentUrl === newUrl;
                        });
                    });
                    // Delete removed images from Cloudinary
                    if (removedImages.length > 0) {
                        console.log(`🗑️ Deleting ${removedImages.length} removed images for product ${id}`);
                        await uploadService_1.uploadService.deleteProductImages(removedImages);
                    }
                }
            }
            catch (error) {
                console.error('Error cleaning up removed images:', error);
                // Continue with update even if cleanup fails
            }
        }
        for (const [key, value] of Object.entries(productData)) {
            if (value !== undefined && key !== 'id') {
                if (key === 'images' || key === 'dimensions') {
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
        const query = `UPDATE products SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        const result = await database_1.default.query(query, values);
        return result.rows[0] || null;
    }
    static async delete(id) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get the product to access its images before deleting
            const productResult = await client.query('SELECT images FROM products WHERE id = $1', [id]);
            if (productResult.rows.length > 0 && productResult.rows[0].images) {
                try {
                    // Delete all product images from Cloudinary
                    console.log(`🗑️ Deleting all images for product ${id} before deletion`);
                    await uploadService_1.uploadService.deleteProductImages(productResult.rows[0].images);
                }
                catch (error) {
                    console.error('Error deleting product images:', error);
                    // Continue with deletion even if image cleanup fails
                }
            }
            // Delete related reviews first
            await client.query('DELETE FROM reviews WHERE product_id = $1', [id]);
            // Delete from cart items
            await client.query('DELETE FROM cart_items WHERE product_id = $1', [id]);
            // Delete from order items
            await client.query('DELETE FROM order_items WHERE product_id = $1', [id]);
            // Delete from wishlist items
            await client.query('DELETE FROM wishlists WHERE product_id = $1', [id]);
            // Delete from purchase patterns (customers also bought)
            await client.query('DELETE FROM product_purchase_patterns WHERE product_id = $1 OR co_purchased_with = $1', [id]);
            // Delete from reviews summary
            await client.query('DELETE FROM product_reviews_summary WHERE product_id = $1', [id]);
            // Finally delete the product
            const result = await client.query('DELETE FROM products WHERE id = $1', [id]);
            await client.query('COMMIT');
            return result.rowCount > 0;
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error deleting product:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    // Advanced search with comprehensive filters and sorting
    static async searchAdvanced(query, filters = {}, sortBy = 'relevance', limit = 20, offset = 0) {
        let sql = `
      SELECT p.*, c.name as category_name,
        COALESCE(ratings.avg_rating, 0) as avg_rating,
        COALESCE(ratings.review_count, 0) as review_count
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN (
        SELECT product_id, AVG(rating) as avg_rating, COUNT(*) as review_count
        FROM reviews 
        WHERE is_approved = true 
        GROUP BY product_id
      ) ratings ON p.id = ratings.product_id
      WHERE p.is_active = true
    `;
        const params = [];
        let paramCount = 1;
        const conditions = [];
        // Text search with full-text search capabilities
        if (query) {
            conditions.push(`(
        p.name ILIKE $${paramCount} OR 
        p.description ILIKE $${paramCount} OR 
        p.short_description ILIKE $${paramCount} OR
        p.sku ILIKE $${paramCount} OR
        EXISTS (
          SELECT 1 FROM unnest(p.tags) AS tag 
          WHERE tag ILIKE $${paramCount}
        )
      )`);
            params.push(`%${query}%`);
            paramCount++;
        }
        // Category filter with hierarchy check (only show products if category and all parents are active)
        if (filters.category_id) {
            conditions.push(`
        p.category_id = $${paramCount} AND 
        NOT EXISTS (
          WITH RECURSIVE category_path AS (
            SELECT id, parent_id, is_active FROM categories WHERE id = p.category_id
            UNION ALL
            SELECT c.id, c.parent_id, c.is_active 
            FROM categories c
            INNER JOIN category_path cp ON c.id = cp.parent_id
          )
          SELECT 1 FROM category_path WHERE is_active = false
        )
      `);
            params.push(filters.category_id);
            paramCount++;
        }
        // Price range filters
        if (filters.min_price) {
            conditions.push(`(CASE WHEN p.discount_price IS NOT NULL THEN p.discount_price ELSE p.price END) >= $${paramCount}`);
            params.push(filters.min_price);
            paramCount++;
        }
        if (filters.max_price) {
            conditions.push(`(CASE WHEN p.discount_price IS NOT NULL THEN p.discount_price ELSE p.price END) <= $${paramCount}`);
            params.push(filters.max_price);
            paramCount++;
        }
        // Stock availability filter
        if (filters.in_stock) {
            conditions.push(`p.stock_quantity > 0`);
        }
        // Featured products filter
        if (filters.is_featured) {
            conditions.push(`p.is_featured = true`);
        }
        // On sale filter (has discount price)
        if (filters.on_sale) {
            conditions.push(`p.discount_price IS NOT NULL AND p.discount_price < p.price`);
        }
        // Minimum rating filter
        if (filters.min_rating) {
            conditions.push(`p.id IN (
        SELECT product_id FROM reviews 
        WHERE is_approved = true 
        GROUP BY product_id 
        HAVING AVG(rating) >= $${paramCount}
      )`);
            params.push(filters.min_rating);
            paramCount++;
        }
        // Tags filter
        if (filters.tags && filters.tags.length > 0) {
            conditions.push(`p.tags && $${paramCount}`);
            params.push(filters.tags);
            paramCount++;
        }
        // Add all conditions to the query
        if (conditions.length > 0) {
            sql += ' AND ' + conditions.join(' AND ');
        }
        // Save the parameters before adding any sorting parameters
        const countParams = params.slice();
        // Sorting
        let orderBy = 'ORDER BY ';
        switch (sortBy) {
            case 'price_asc':
                orderBy += '(CASE WHEN p.discount_price IS NOT NULL THEN p.discount_price ELSE p.price END)::DECIMAL ASC';
                break;
            case 'price_desc':
                orderBy += '(CASE WHEN p.discount_price IS NOT NULL THEN p.discount_price ELSE p.price END)::DECIMAL DESC';
                break;
            case 'name_asc':
                orderBy += 'p.name ASC';
                break;
            case 'name_desc':
                orderBy += 'p.name DESC';
                break;
            case 'rating':
                orderBy += 'avg_rating DESC, review_count DESC';
                break;
            case 'newest':
                orderBy += 'p.created_at DESC';
                break;
            case 'oldest':
                orderBy += 'p.created_at ASC';
                break;
            case 'popularity':
                orderBy += 'review_count DESC, avg_rating DESC';
                break;
            case 'relevance':
            default:
                if (query) {
                    orderBy += `
            (CASE 
              WHEN p.name ILIKE $${paramCount} THEN 3 
              WHEN p.short_description ILIKE $${paramCount} THEN 2 
              ELSE 1 
            END) DESC, avg_rating DESC, p.created_at DESC`;
                    params.push(`%${query}%`);
                    paramCount++;
                }
                else {
                    orderBy += 'p.is_featured DESC, avg_rating DESC, p.created_at DESC';
                }
                break;
        }
        // Get total count
        const countSql = `SELECT COUNT(p.id) FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = true${conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : ''}`;
        const countResult = await database_1.default.query(countSql, countParams);
        const total = parseInt(countResult.rows[0].count);
        // Add pagination
        sql += ` ${orderBy} LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);
        const result = await database_1.default.query(sql, params);
        // Get available filters for frontend
        const availableFilters = await this.getAvailableFilters();
        return {
            items: result.rows,
            total,
            availableFilters
        };
    }
    // Get available filter options
    static async getAvailableFilters() {
        try {
            // Get price range
            const priceRange = await database_1.default.query(`
        SELECT 
          MIN(CASE WHEN discount_price IS NOT NULL THEN discount_price ELSE price END) as min_price,
          MAX(CASE WHEN discount_price IS NOT NULL THEN discount_price ELSE price END) as max_price
        FROM products WHERE is_active = true
      `);
            // Get categories with product counts
            const categories = await database_1.default.query(`
        SELECT c.id, c.name, c.slug, COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
        WHERE c.is_active = true
        GROUP BY c.id, c.name, c.slug
        HAVING COUNT(p.id) > 0
        ORDER BY c.name
      `);
            // Get available tags
            const tags = await database_1.default.query(`
        SELECT DISTINCT unnest(tags) as tag, COUNT(*) as count
        FROM products 
        WHERE is_active = true AND tags IS NOT NULL
        GROUP BY tag
        ORDER BY count DESC, tag
        LIMIT 20
      `);
            // Get rating distribution
            const ratings = await database_1.default.query(`
        SELECT 
          FLOOR(rating) as rating,
          COUNT(DISTINCT product_id) as product_count
        FROM reviews 
        WHERE is_approved = true
        GROUP BY FLOOR(rating)
        ORDER BY rating DESC
      `);
            return {
                priceRange: {
                    min: parseFloat(priceRange.rows[0]?.min_price || '0'),
                    max: parseFloat(priceRange.rows[0]?.max_price || '10000')
                },
                categories: categories.rows,
                tags: tags.rows,
                ratings: ratings.rows,
                sortOptions: [
                    { value: 'relevance', label: 'Most Relevant' },
                    { value: 'price_asc', label: 'Price: Low to High' },
                    { value: 'price_desc', label: 'Price: High to Low' },
                    { value: 'rating', label: 'Highest Rated' },
                    { value: 'popularity', label: 'Most Popular' },
                    { value: 'newest', label: 'Newest First' },
                    { value: 'name_asc', label: 'Name: A to Z' }
                ]
            };
        }
        catch (error) {
            console.error('Get available filters error:', error);
            return {
                priceRange: { min: 0, max: 10000 },
                categories: [],
                tags: [],
                ratings: [],
                sortOptions: []
            };
        }
    }
}
exports.ProductModel = ProductModel;
//# sourceMappingURL=Product.js.map