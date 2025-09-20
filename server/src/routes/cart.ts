import express from 'express';
import { CartModel, CartItemModel } from '../models/Cart';
import { ProductModel } from '../models/Product';
import { User } from '../types';
import { cartAbandonmentService } from '../services/cartAbandonmentService';

const router = express.Router();

// Get user's cart
router.get('/', async (req, res) => {
  try {
    let cart;
    
    if (req.isAuthenticated() && req.user) {
      const user = req.user as User;
      cart = await CartModel.getOrCreateUserCart(user.id);
    } else {
      // For guests, use session ID
      const sessionId = req.sessionID;
      cart = await CartModel.getOrCreateSessionCart(sessionId);
    }
    
    const items = await CartItemModel.findByCartId(cart.id);
    
    // Calculate totals
    const subtotal = items.reduce((total, item) => total + (item.price_at_time * item.quantity), 0);
    
    res.json({ 
      success: true, 
      data: {
        cart_id: cart.id,
        items,
        subtotal,
        item_count: items.reduce((count, item) => count + item.quantity, 0)
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Error fetching cart' });
  }
});

// Add item to cart
router.post('/add', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    if (!productId || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid product ID or quantity' });
    }
    
    // Get product to verify it exists and get current price
    const product = await ProductModel.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    if (product.stock_quantity < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }
    
    let cart;
    
    if (req.isAuthenticated() && req.user) {
      const user = req.user as User;
      cart = await CartModel.getOrCreateUserCart(user.id);
    } else {
      const sessionId = req.sessionID;
      cart = await CartModel.getOrCreateSessionCart(sessionId);
    }
    
    const cartItem = await CartItemModel.addItem(
      cart.id, 
      productId, 
      quantity, 
      product.discount_price || product.price
    );
    
    // Track cart activity for abandonment detection (only for authenticated users)
    if (req.isAuthenticated() && req.user) {
      await cartAbandonmentService.trackCartActivity((req.user as User).id);
    }
    
    res.json({ success: true, message: 'Item added to cart', data: cartItem });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, message: 'Error adding item to cart' });
  }
});

// Update cart item quantity
router.put('/update/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid quantity' });
    }
    
    const updatedItem = await CartItemModel.updateQuantity(itemId, quantity);
    
    if (!updatedItem) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }
    
    // Track cart activity for abandonment detection (only for authenticated users)
    if (req.isAuthenticated() && req.user) {
      await cartAbandonmentService.trackCartActivity((req.user as User).id);
    }
    
    res.json({ success: true, message: 'Cart item updated', data: updatedItem });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ success: false, message: 'Error updating cart item' });
  }
});

// Remove item from cart
router.delete('/remove/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const removed = await CartItemModel.removeItem(itemId);
    
    if (!removed) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }
    
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({ success: false, message: 'Error removing item from cart' });
  }
});

// Clear entire cart
router.delete('/clear', async (req, res) => {
  try {
    let cart;
    
    if (req.isAuthenticated() && req.user) {
      const user = req.user as User;
      cart = await CartModel.findByUserId(user.id);
    } else {
      const sessionId = req.sessionID;
      cart = await CartModel.findBySessionId(sessionId);
    }
    
    if (cart) {
      await CartItemModel.clearCart(cart.id);
    }
    
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, message: 'Error clearing cart' });
  }
});

export default router;