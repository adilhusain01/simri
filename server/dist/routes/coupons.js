"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const couponService_1 = require("../services/couponService");
const auth_1 = require("../middleware/auth");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const database_1 = __importDefault(require("../config/database"));
const router = express_1.default.Router();
// Validation middleware
const validateCouponCode = [
    (0, express_validator_1.body)('code').trim().isLength({ min: 3, max: 50 }).withMessage('Coupon code must be 3-50 characters'),
    validation_1.handleValidation
];
const validateCouponCreate = [
    (0, express_validator_1.body)('code').trim().isLength({ min: 3, max: 50 }).withMessage('Coupon code must be 3-50 characters'),
    (0, express_validator_1.body)('name').trim().isLength({ min: 3, max: 255 }).withMessage('Coupon name must be 3-255 characters'),
    (0, express_validator_1.body)('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
    (0, express_validator_1.body)('type').isIn(['percentage', 'fixed']).withMessage('Type must be percentage or fixed'),
    (0, express_validator_1.body)('value').isFloat({ min: 0 }).withMessage('Value must be a positive number'),
    (0, express_validator_1.body)('minimum_order_amount').optional().isFloat({ min: 0 }).withMessage('Minimum order amount must be positive'),
    (0, express_validator_1.body)('maximum_discount_amount').optional().isFloat({ min: 0 }).withMessage('Maximum discount amount must be positive'),
    (0, express_validator_1.body)('usage_limit').optional().isInt({ min: 1 }).withMessage('Usage limit must be at least 1'),
    (0, express_validator_1.body)('valid_from').optional().isISO8601().withMessage('Invalid valid_from date'),
    (0, express_validator_1.body)('valid_until').optional().isISO8601().withMessage('Invalid valid_until date'),
    validation_1.handleValidation
];
const validateCouponUpdate = [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid coupon ID'),
    (0, express_validator_1.body)('name').optional().trim().isLength({ min: 3, max: 255 }).withMessage('Coupon name must be 3-255 characters'),
    (0, express_validator_1.body)('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
    (0, express_validator_1.body)('value').optional().isFloat({ min: 0 }).withMessage('Value must be a positive number'),
    (0, express_validator_1.body)('minimum_order_amount').optional().isFloat({ min: 0 }).withMessage('Minimum order amount must be positive'),
    (0, express_validator_1.body)('maximum_discount_amount').optional().isFloat({ min: 0 }).withMessage('Maximum discount amount must be positive'),
    (0, express_validator_1.body)('usage_limit').optional().isInt({ min: 1 }).withMessage('Usage limit must be at least 1'),
    (0, express_validator_1.body)('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
    (0, express_validator_1.body)('valid_from').optional().isISO8601().withMessage('Invalid valid_from date'),
    (0, express_validator_1.body)('valid_until').optional().isISO8601().withMessage('Invalid valid_until date'),
    validation_1.handleValidation
];
// Public routes
// Validate coupon code and get discount
router.post('/validate', validateCouponCode, async (req, res) => {
    try {
        const { code, orderAmount } = req.body;
        const userId = req.user ? req.user.id : undefined;
        if (!orderAmount || orderAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid order amount is required'
            });
        }
        const validation = await couponService_1.couponService.validateCoupon(code, orderAmount, userId);
        if (validation.isValid) {
            res.json({
                success: true,
                data: {
                    coupon: {
                        id: validation.coupon.id,
                        code: validation.coupon.code,
                        name: validation.coupon.name,
                        description: validation.coupon.description,
                        type: validation.coupon.type,
                        value: validation.coupon.value
                    },
                    discount_amount: validation.discountAmount,
                    final_amount: orderAmount - validation.discountAmount
                },
                message: 'Coupon is valid'
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: validation.error
            });
        }
    }
    catch (error) {
        console.error('Validate coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating coupon'
        });
    }
});
// Get best available coupon for order
router.get('/best-for-order', async (req, res) => {
    try {
        const { orderAmount } = req.query;
        const userId = req.user ? req.user.id : undefined;
        if (!orderAmount || parseFloat(orderAmount) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid order amount is required'
            });
        }
        const result = await couponService_1.couponService.getBestCouponForOrder(parseFloat(orderAmount), userId);
        if (result.coupon) {
            res.json({
                success: true,
                data: {
                    coupon: {
                        id: result.coupon.id,
                        code: result.coupon.code,
                        name: result.coupon.name,
                        description: result.coupon.description,
                        type: result.coupon.type,
                        value: result.coupon.value
                    },
                    discount_amount: result.discountAmount,
                    savings_message: `Save ₹${result.discountAmount} with code ${result.coupon.code}`
                },
                message: 'Best coupon found'
            });
        }
        else {
            res.json({
                success: true,
                data: null,
                message: 'No applicable coupons found'
            });
        }
    }
    catch (error) {
        console.error('Get best coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Error finding best coupon'
        });
    }
});
// Get active coupons (public)
router.get('/active', async (req, res) => {
    try {
        const coupons = await couponService_1.couponService.getActiveCoupons(true);
        // Filter sensitive information for public API
        const publicCoupons = coupons.map(coupon => ({
            id: coupon.id,
            code: coupon.code,
            name: coupon.name,
            description: coupon.description,
            type: coupon.type,
            value: coupon.value,
            minimum_order_amount: coupon.minimum_order_amount,
            maximum_discount_amount: coupon.maximum_discount_amount,
            valid_until: coupon.valid_until
        }));
        res.json({
            success: true,
            data: publicCoupons,
            count: publicCoupons.length
        });
    }
    catch (error) {
        console.error('Get active coupons error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching active coupons'
        });
    }
});
// Admin routes
// Get all coupons (admin only)
router.get('/admin/all', auth_1.requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, active, search, type, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let query = 'SELECT * FROM coupons';
        let countQuery = 'SELECT COUNT(*) FROM coupons';
        const queryParams = [];
        const countParams = [];
        const conditions = [];
        // Search by code, name, or description
        if (search && search.toString().trim()) {
            const searchParam = `%${search.toString().trim().toLowerCase()}%`;
            conditions.push(`(LOWER(code) LIKE $${queryParams.length + 1} OR LOWER(name) LIKE $${queryParams.length + 1} OR LOWER(description) LIKE $${queryParams.length + 1})`);
            queryParams.push(searchParam);
            countParams.push(searchParam);
        }
        // Filter by type
        if (type && ['percentage', 'fixed'].includes(type.toString())) {
            conditions.push(`type = $${queryParams.length + 1}`);
            queryParams.push(type.toString());
            countParams.push(type.toString());
        }
        // Filter by active status
        if (active !== undefined) {
            conditions.push(`is_active = $${queryParams.length + 1}`);
            queryParams.push(active === 'true');
            countParams.push(active === 'true');
        }
        // Apply WHERE conditions
        if (conditions.length > 0) {
            const whereClause = ' WHERE ' + conditions.join(' AND ');
            query += whereClause;
            countQuery += whereClause;
        }
        // Validate and apply sorting
        const allowedSortFields = ['created_at', 'updated_at', 'code', 'name', 'type', 'value', 'used_count'];
        const sortField = allowedSortFields.includes(sortBy.toString()) ? sortBy.toString() : 'created_at';
        const sortDirection = sortOrder.toString().toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortField} ${sortDirection}`;
        // Add pagination
        query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(parseInt(limit), offset);
        const result = await database_1.default.query(query, queryParams);
        const countResult = await database_1.default.query(countQuery, countParams);
        res.json({
            success: true,
            data: {
                coupons: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(countResult.rows[0].count),
                    pages: Math.ceil(countResult.rows[0].count / parseInt(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('Get all coupons error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching coupons'
        });
    }
});
// Create new coupon (admin only)
router.post('/admin/create', auth_1.requireAdmin, validateCouponCreate, async (req, res) => {
    try {
        const adminId = req.user.id;
        const result = await couponService_1.couponService.createCoupon(req.body, adminId);
        if (result.success) {
            res.status(201).json({
                success: true,
                data: result.coupon,
                message: 'Coupon created successfully'
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: result.error
            });
        }
    }
    catch (error) {
        console.error('Create coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating coupon'
        });
    }
});
// Update coupon (admin only)
router.put('/admin/:id', auth_1.requireAdmin, validateCouponUpdate, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await couponService_1.couponService.updateCoupon(id, req.body);
        if (result.success) {
            res.json({
                success: true,
                data: result.coupon,
                message: 'Coupon updated successfully'
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: result.error
            });
        }
    }
    catch (error) {
        console.error('Update coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating coupon'
        });
    }
});
// Delete coupon (admin only)
router.delete('/admin/:id', auth_1.requireAdmin, [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid coupon ID'),
    validation_1.handleValidation
], async (req, res) => {
    try {
        const { id } = req.params;
        const { hard } = req.query; // ?hard=true for permanent deletion
        const hardDelete = hard === 'true';
        const deleted = await couponService_1.couponService.deleteCoupon(id, hardDelete);
        if (deleted) {
            res.json({
                success: true,
                message: hardDelete
                    ? 'Coupon permanently deleted (all usage records removed, orders preserved)'
                    : 'Coupon deactivated successfully'
            });
        }
        else {
            res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }
    }
    catch (error) {
        console.error('Delete coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting coupon'
        });
    }
});
// Get coupon statistics (admin only)
router.get('/admin/:id/stats', auth_1.requireAdmin, [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid coupon ID'),
    validation_1.handleValidation
], async (req, res) => {
    try {
        const { id } = req.params;
        const stats = await couponService_1.couponService.getCouponStats(id);
        if (stats) {
            res.json({
                success: true,
                data: stats
            });
        }
        else {
            res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }
    }
    catch (error) {
        console.error('Get coupon stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching coupon statistics'
        });
    }
});
// Get overall coupon statistics (admin only)
router.get('/admin/stats', auth_1.requireAdmin, async (req, res) => {
    try {
        const stats = await couponService_1.couponService.getOverallCouponStats();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Get overall coupon stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching overall coupon statistics'
        });
    }
});
exports.default = router;
//# sourceMappingURL=coupons.js.map