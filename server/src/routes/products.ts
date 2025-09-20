import express from 'express';
import { ProductModel } from '../models/Product';
import pool from '../config/database';

const router = express.Router();

// Advanced product search with filters
router.get('/search', async (req, res) => {
  try {
    const { 
      q, 
      category, 
      minPrice, 
      maxPrice, 
      sortBy = 'relevance',
      inStock,
      featured,
      onSale,
      rating,
      tags,
      page = 1, 
      limit = 20,
      sort_by,
      sort_order = 'desc'
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const filters: any = {};

    // Map frontend filter names to backend names
    if (category) {
      // Find category by name and get its ID
      const availableFilters = await ProductModel.getAvailableFilters();
      const categoryObj = availableFilters.categories.find((cat: any) => cat.name === category);
      if (categoryObj) {
        filters.category_id = categoryObj.id;
      }
    }
    if (minPrice) filters.min_price = parseFloat(minPrice as string);
    if (maxPrice) filters.max_price = parseFloat(maxPrice as string);
    if (inStock === 'true') filters.in_stock = true;
    if (featured === 'true') filters.is_featured = true;
    if (onSale === 'true') filters.on_sale = true;
    if (rating) filters.min_rating = parseFloat(rating as string);
    if (tags) filters.tags = (tags as string).split(',');

    // Map frontend sort values to backend sort values
    let backendSort = sortBy as string;
    switch (sortBy) {
      case 'price_low':
        backendSort = 'price_asc';
        break;
      case 'price_high':
        backendSort = 'price_desc';
        break;
      case 'rating':
        backendSort = 'rating';
        break;
      case 'newest':
        backendSort = 'newest';
        break;
      case 'relevance':
      default:
        backendSort = 'relevance';
        break;
    }

    const products = await ProductModel.searchAdvanced(
      q as string || '', 
      filters,
      backendSort,
      parseInt(limit as string), 
      offset
    );
    
    res.json({ 
      success: true, 
      data: { products: products.items },
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: products.total,
        totalPages: Math.ceil(products.total / parseInt(limit as string)),
        hasMore: offset + products.items.length < products.total
      }
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ success: false, message: 'Error searching products' });
  }
});

// Get featured products
router.get('/featured', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const products = await ProductModel.findFeatured(parseInt(limit as string));
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ success: false, message: 'Error fetching featured products' });
  }
});

// Get products by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const products = await ProductModel.findByCategory(
      categoryId, 
      parseInt(limit as string), 
      parseInt(offset as string)
    );
    
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({ success: false, message: 'Error fetching products by category' });
  }
});

// Get product categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, slug, description, image_url, parent_id, is_active, created_at, updated_at
      FROM categories 
      WHERE is_active = true 
      ORDER BY name
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Error fetching categories' });
  }
});

// Get all products
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      minPrice, 
      maxPrice, 
      sortBy = 'relevance',
      inStock,
      rating,
      tags,
      page = 1, 
      limit = 20,
      search,
      sort_by,
      sort_order = 'desc'
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const filters: any = {};
    
    // Map frontend filter names to backend names
    if (category) {
      // Find category by name and get its ID
      const availableFilters = await ProductModel.getAvailableFilters();
      const categoryObj = availableFilters.categories.find((cat: any) => cat.name === category);
      if (categoryObj) {
        filters.category_id = categoryObj.id;
      }
    }
    if (minPrice) filters.min_price = parseFloat(minPrice as string);
    if (maxPrice) filters.max_price = parseFloat(maxPrice as string);
    if (inStock === 'true') filters.in_stock = true;
    if (rating) filters.min_rating = parseFloat(rating as string);
    if (tags) filters.tags = (tags as string).split(',');

    // Map frontend sort values to backend sort values
    let backendSort = sortBy as string;
    switch (sortBy) {
      case 'price_low':
        backendSort = 'price_asc';
        break;
      case 'price_high':
        backendSort = 'price_desc';
        break;
      case 'rating':
        backendSort = 'rating';
        break;
      case 'newest':
        backendSort = 'newest';
        break;
      case 'relevance':
      default:
        backendSort = 'relevance';
        break;
    }

    const products = await ProductModel.searchAdvanced(
      search as string || '', // support search in general product listing too
      filters,
      backendSort,
      parseInt(limit as string), 
      offset
    );
    
    res.json({ 
      success: true, 
      data: products.items,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: products.total,
        totalPages: Math.ceil(products.total / parseInt(limit as string)),
        hasMore: offset + products.items.length < products.total
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Error fetching products' });
  }
});

// Get product by ID or slug
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by ID first, then by slug
    let product = await ProductModel.findById(identifier);
    if (!product) {
      product = await ProductModel.findBySlug(identifier);
    }
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Error fetching product' });
  }
});

export default router;