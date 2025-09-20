import express from 'express';
import { inventoryService } from '../services/inventoryService';
import { requireAdmin } from '../middleware/auth';
import { body, param } from 'express-validator';
import { handleValidation } from '../middleware/validation';

const router = express.Router();

// Validation middleware
const validateInventoryUpdate = [
  param('productId').isUUID().withMessage('Product ID must be a valid UUID'),
  body('quantity').isInt().withMessage('Quantity must be an integer'),
  body('changeType').isIn(['adjustment', 'restock', 'return', 'sale']).withMessage('Invalid change type'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters'),
  handleValidation
];

// Get available stock for a product
router.get('/available/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const availableStock = await inventoryService.getAvailableStock(productId);
    
    res.json({
      success: true,
      data: {
        available: availableStock
      }
    });
  } catch (error) {
    console.error('Get available stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available stock'
    });
  }
});

// Admin: Update inventory
router.put('/admin/:productId', requireAdmin, validateInventoryUpdate, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, changeType, notes } = req.body;
    const userId = (req.user as any).id;

    const result = await inventoryService.updateStock(
      productId, 
      quantity, 
      changeType,
      { notes, userId }
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          new_stock: result.newStock
        },
        message: 'Inventory updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to update inventory'
      });
    }
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating inventory'
    });
  }
});

// Admin: Get inventory history
router.get('/admin/history/:productId', requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const history = await inventoryService.getInventoryHistory(
      productId, 
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get inventory history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inventory history'
    });
  }
});

// Admin: Get low stock products
router.get('/admin/low-stock', requireAdmin, async (req, res) => {
  try {
    const { threshold = 5 } = req.query;
    const lowStockProducts = await inventoryService.getLowStockProducts(
      parseInt(threshold as string)
    );

    res.json({
      success: true,
      data: lowStockProducts
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching low stock products'
    });
  }
});

// Admin: Get stock statistics
router.get('/admin/statistics', requireAdmin, async (req, res) => {
  try {
    const statistics = await inventoryService.getStockStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Get stock statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock statistics'
    });
  }
});

export default router;