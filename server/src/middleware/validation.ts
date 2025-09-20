import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

// Middleware to check validation results
export const handleValidation = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

// Product validation
export const validateProduct = [
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Product name is required and must be less than 255 characters'),
  body('sku').trim().isLength({ min: 1, max: 100 }).withMessage('SKU is required and must be less than 100 characters'),
  body('price').toFloat().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock_quantity').toInt().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('category_id').optional().isUUID().withMessage('Category ID must be a valid UUID'),
  body('slug').optional().trim().isLength({ max: 255 }).withMessage('Slug must be less than 255 characters'),
  handleValidation
];

// Cart validation
export const validateAddToCart = [
  body('productId').isUUID().withMessage('Product ID must be a valid UUID'),
  body('quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),
  handleValidation
];

export const validateUpdateCartItem = [
  param('itemId').isUUID().withMessage('Item ID must be a valid UUID'),
  body('quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),
  handleValidation
];

// Order validation
export const validateCreateOrder = [
  body('shipping_address').isObject().withMessage('Shipping address is required'),
  body('shipping_address.first_name').trim().isLength({ min: 1, max: 100 }).withMessage('First name is required'),
  body('shipping_address.last_name').trim().isLength({ min: 1, max: 100 }).withMessage('Last name is required'),
  body('shipping_address.address_line_1').trim().isLength({ min: 1, max: 255 }).withMessage('Address line 1 is required'),
  body('shipping_address.city').trim().isLength({ min: 1, max: 100 }).withMessage('City is required'),
  body('shipping_address.state').trim().isLength({ min: 1, max: 100 }).withMessage('State is required'),
  body('shipping_address.postal_code').trim().isLength({ min: 1, max: 20 }).withMessage('Postal code is required'),
  body('shipping_address.country').trim().isLength({ min: 1, max: 100 }).withMessage('Country is required'),
  body('shipping_address.phone').optional().trim().isLength({ max: 20 }).withMessage('Phone number must be less than 20 characters'),
  handleValidation
];

// Payment validation
export const validatePaymentVerification = [
  body('razorpay_order_id').trim().isLength({ min: 1 }).withMessage('Razorpay order ID is required'),
  body('razorpay_payment_id').trim().isLength({ min: 1 }).withMessage('Razorpay payment ID is required'),
  body('razorpay_signature').trim().isLength({ min: 1 }).withMessage('Razorpay signature is required'),
  body('order_id').isUUID().withMessage('Order ID must be a valid UUID'),
  handleValidation
];

// Common validations
export const validateUUID = (paramName: string) => [
  param(paramName).isUUID().withMessage(`${paramName} must be a valid UUID`),
  handleValidation
];

export const validatePagination = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer'),
  handleValidation
];

export const validateSearch = [
  query('q').optional().trim().isLength({ max: 255 }).withMessage('Search query must be less than 255 characters'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
  validatePagination
];