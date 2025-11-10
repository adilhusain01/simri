"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const inventoryService_1 = require("../services/inventoryService");
const auth_1 = require("../middleware/auth");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
// Validation middleware
const validateInventoryUpdate = [
    (0, express_validator_1.param)('productId').isUUID().withMessage('Product ID must be a valid UUID'),
    (0, express_validator_1.body)('quantity').isInt().withMessage('Quantity must be an integer'),
    (0, express_validator_1.body)('changeType').isIn(['adjustment', 'restock', 'return', 'sale']).withMessage('Invalid change type'),
    (0, express_validator_1.body)('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters'),
    validation_1.handleValidation
];
// Get available stock for a product
router.get('/available/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const availableStock = await inventoryService_1.inventoryService.getAvailableStock(productId);
        res.json({
            success: true,
            data: {
                available: availableStock
            }
        });
    }
    catch (error) {
        console.error('Get available stock error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching available stock'
        });
    }
});
// Admin: Update inventory
router.put('/admin/:productId', auth_1.requireAdmin, validateInventoryUpdate, async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity, changeType, notes } = req.body;
        const userId = req.user.id;
        const result = await inventoryService_1.inventoryService.updateStock(productId, quantity, changeType, { notes, userId });
        if (result.success) {
            res.json({
                success: true,
                data: {
                    new_stock: result.newStock
                },
                message: 'Inventory updated successfully'
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: 'Failed to update inventory'
            });
        }
    }
    catch (error) {
        console.error('Update inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating inventory'
        });
    }
});
// Admin: Get inventory history
router.get('/admin/history/:productId', auth_1.requireAdmin, async (req, res) => {
    try {
        const { productId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        const history = await inventoryService_1.inventoryService.getInventoryHistory(productId, parseInt(limit), parseInt(offset));
        res.json({
            success: true,
            data: history
        });
    }
    catch (error) {
        console.error('Get inventory history error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching inventory history'
        });
    }
});
// Admin: Get low stock products
router.get('/admin/low-stock', auth_1.requireAdmin, async (req, res) => {
    try {
        const { threshold = 5 } = req.query;
        const lowStockProducts = await inventoryService_1.inventoryService.getLowStockProducts(parseInt(threshold));
        res.json({
            success: true,
            data: lowStockProducts
        });
    }
    catch (error) {
        console.error('Get low stock products error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching low stock products'
        });
    }
});
// Admin: Get stock statistics
router.get('/admin/statistics', auth_1.requireAdmin, async (req, res) => {
    try {
        const statistics = await inventoryService_1.inventoryService.getStockStatistics();
        res.json({
            success: true,
            data: statistics
        });
    }
    catch (error) {
        console.error('Get stock statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching stock statistics'
        });
    }
});
exports.default = router;
//# sourceMappingURL=inventory.js.map