"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSearch = exports.validatePagination = exports.validateUUID = exports.validatePaymentVerification = exports.validateCreateOrder = exports.validateUpdateCartItem = exports.validateAddToCart = exports.validateProduct = exports.handleValidation = void 0;
const express_validator_1 = require("express-validator");
// Middleware to check validation results
const handleValidation = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }
    next();
};
exports.handleValidation = handleValidation;
// Product validation
exports.validateProduct = [
    (0, express_validator_1.body)('name').trim().isLength({ min: 1, max: 255 }).withMessage('Product name is required and must be less than 255 characters'),
    (0, express_validator_1.body)('sku').trim().isLength({ min: 1, max: 100 }).withMessage('SKU is required and must be less than 100 characters'),
    (0, express_validator_1.body)('price').toFloat().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    (0, express_validator_1.body)('stock_quantity').toInt().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
    (0, express_validator_1.body)('category_id').optional().isUUID().withMessage('Category ID must be a valid UUID'),
    (0, express_validator_1.body)('slug').optional().trim().isLength({ max: 255 }).withMessage('Slug must be less than 255 characters'),
    exports.handleValidation
];
// Cart validation
exports.validateAddToCart = [
    (0, express_validator_1.body)('productId').isUUID().withMessage('Product ID must be a valid UUID'),
    (0, express_validator_1.body)('quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),
    exports.handleValidation
];
exports.validateUpdateCartItem = [
    (0, express_validator_1.param)('itemId').isUUID().withMessage('Item ID must be a valid UUID'),
    (0, express_validator_1.body)('quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),
    exports.handleValidation
];
// Order validation
exports.validateCreateOrder = [
    (0, express_validator_1.body)('shipping_address').isObject().withMessage('Shipping address is required'),
    (0, express_validator_1.body)('shipping_address.first_name').trim().isLength({ min: 1, max: 100 }).withMessage('First name is required'),
    (0, express_validator_1.body)('shipping_address.last_name').trim().isLength({ min: 1, max: 100 }).withMessage('Last name is required'),
    (0, express_validator_1.body)('shipping_address.address_line_1').trim().isLength({ min: 1, max: 255 }).withMessage('Address line 1 is required'),
    (0, express_validator_1.body)('shipping_address.city').trim().isLength({ min: 1, max: 100 }).withMessage('City is required'),
    (0, express_validator_1.body)('shipping_address.state').trim().isLength({ min: 1, max: 100 }).withMessage('State is required'),
    (0, express_validator_1.body)('shipping_address.postal_code').trim().isLength({ min: 1, max: 20 }).withMessage('Postal code is required'),
    (0, express_validator_1.body)('shipping_address.country').trim().isLength({ min: 1, max: 100 }).withMessage('Country is required'),
    (0, express_validator_1.body)('shipping_address.phone').optional().trim().isLength({ max: 20 }).withMessage('Phone number must be less than 20 characters'),
    exports.handleValidation
];
// Payment validation
exports.validatePaymentVerification = [
    (0, express_validator_1.body)('razorpay_order_id').trim().isLength({ min: 1 }).withMessage('Razorpay order ID is required'),
    (0, express_validator_1.body)('razorpay_payment_id').trim().isLength({ min: 1 }).withMessage('Razorpay payment ID is required'),
    (0, express_validator_1.body)('razorpay_signature').trim().isLength({ min: 1 }).withMessage('Razorpay signature is required'),
    (0, express_validator_1.body)('order_id').isUUID().withMessage('Order ID must be a valid UUID'),
    exports.handleValidation
];
// Common validations
const validateUUID = (paramName) => [
    (0, express_validator_1.param)(paramName).isUUID().withMessage(`${paramName} must be a valid UUID`),
    exports.handleValidation
];
exports.validateUUID = validateUUID;
exports.validatePagination = [
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer'),
    exports.handleValidation
];
exports.validateSearch = [
    (0, express_validator_1.query)('q').optional().trim().isLength({ max: 255 }).withMessage('Search query must be less than 255 characters'),
    (0, express_validator_1.query)('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
    (0, express_validator_1.query)('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
    exports.validatePagination
];
//# sourceMappingURL=validation.js.map