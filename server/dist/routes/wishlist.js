"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const wishlistService_1 = require("../services/wishlistService");
const auth_1 = require("../middleware/auth");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.requireAuth);
// Validation middleware
const validateProductId = [
    (0, express_validator_1.param)('productId').isUUID().withMessage('Invalid product ID'),
    validation_1.handleValidation
];
const validateAddToWishlist = [
    (0, express_validator_1.body)('productId').isUUID().withMessage('Invalid product ID'),
    validation_1.handleValidation
];
const validateMoveToCart = [
    (0, express_validator_1.body)('productIds').isArray({ min: 1 }).withMessage('Product IDs array is required'),
    (0, express_validator_1.body)('productIds.*').isUUID().withMessage('Each product ID must be a valid UUID'),
    validation_1.handleValidation
];
const validatePagination = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    validation_1.handleValidation
];
// Get user's wishlist
router.get('/', validatePagination, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const wishlist = await wishlistService_1.wishlistService.getUserWishlist(userId, page, limit);
        res.json({
            success: true,
            data: wishlist,
            message: `Found ${wishlist.total} items in wishlist`
        });
    }
    catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching wishlist'
        });
    }
});
// Add product to wishlist
router.post('/add', validateAddToWishlist, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.body;
        const result = await wishlistService_1.wishlistService.addToWishlist(userId, productId);
        if (result.success) {
            res.status(201).json({
                success: true,
                data: result.item,
                message: result.message
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    }
    catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding product to wishlist'
        });
    }
});
// Remove product from wishlist
router.delete('/remove/:productId', validateProductId, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;
        const result = await wishlistService_1.wishlistService.removeFromWishlist(userId, productId);
        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        }
        else {
            res.status(404).json({
                success: false,
                message: result.message
            });
        }
    }
    catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing product from wishlist'
        });
    }
});
// Check if product is in wishlist
router.get('/check/:productId', validateProductId, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;
        const isInWishlist = await wishlistService_1.wishlistService.isInWishlist(userId, productId);
        res.json({
            success: true,
            data: {
                product_id: productId,
                is_in_wishlist: isInWishlist
            }
        });
    }
    catch (error) {
        console.error('Check wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking wishlist status'
        });
    }
});
// Get wishlist count
router.get('/count', async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await wishlistService_1.wishlistService.getWishlistCount(userId);
        res.json({
            success: true,
            data: {
                count
            }
        });
    }
    catch (error) {
        console.error('Get wishlist count error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching wishlist count'
        });
    }
});
// Clear entire wishlist
router.delete('/clear', async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await wishlistService_1.wishlistService.clearWishlist(userId);
        if (result.success) {
            res.json({
                success: true,
                data: {
                    deleted_count: result.deletedCount
                },
                message: result.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: result.message
            });
        }
    }
    catch (error) {
        console.error('Clear wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Error clearing wishlist'
        });
    }
});
// Move single item to cart by item ID
router.post('/move-to-cart/:itemId', [
    (0, express_validator_1.param)('itemId').isUUID().withMessage('Invalid item ID'),
    (0, express_validator_1.body)('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    validation_1.handleValidation
], async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId } = req.params;
        const quantity = parseInt(req.body.quantity) || 1;
        const result = await wishlistService_1.wishlistService.moveItemToCart(userId, itemId, quantity);
        if (result.success) {
            res.json({
                success: true,
                data: result.cartItem,
                message: result.message
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    }
    catch (error) {
        console.error('Move item to cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error moving item to cart'
        });
    }
});
// Move multiple items to cart
router.post('/move-to-cart', validateMoveToCart, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productIds } = req.body;
        const result = await wishlistService_1.wishlistService.moveToCart(userId, productIds);
        if (result.success) {
            res.json({
                success: true,
                data: {
                    moved_count: result.movedCount,
                    errors: result.errors
                },
                message: result.message
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    }
    catch (error) {
        console.error('Move to cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error moving items to cart'
        });
    }
});
// Get wishlist insights
router.get('/insights', async (req, res) => {
    try {
        const userId = req.user.id;
        const insights = await wishlistService_1.wishlistService.getWishlistInsights(userId);
        res.json({
            success: true,
            data: {
                ...insights,
                avg_price: parseFloat(insights.avg_price),
                total_value: parseFloat(insights.total_value)
            }
        });
    }
    catch (error) {
        console.error('Get wishlist insights error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching wishlist insights'
        });
    }
});
// Toggle wishlist (add if not present, remove if present)
router.post('/toggle', validateAddToWishlist, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.body;
        const isInWishlist = await wishlistService_1.wishlistService.isInWishlist(userId, productId);
        let result;
        if (isInWishlist) {
            result = await wishlistService_1.wishlistService.removeFromWishlist(userId, productId);
            if (result.success) {
                res.json({
                    success: true,
                    data: {
                        action: 'removed',
                        is_in_wishlist: false
                    },
                    message: result.message
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: result.message
                });
            }
        }
        else {
            result = await wishlistService_1.wishlistService.addToWishlist(userId, productId);
            if (result.success) {
                res.json({
                    success: true,
                    data: {
                        action: 'added',
                        is_in_wishlist: true,
                        item: result.item
                    },
                    message: result.message
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: result.message
                });
            }
        }
    }
    catch (error) {
        console.error('Toggle wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling wishlist'
        });
    }
});
exports.default = router;
//# sourceMappingURL=wishlist.js.map