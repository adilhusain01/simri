import express from 'express';
import { requireAuth } from '../middleware/auth';
import { body, param } from 'express-validator';
import { handleValidation } from '../middleware/validation';
import pool from '../config/database';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Validation middleware
const validateAddress = [
  body('type').isIn(['shipping', 'billing']).withMessage('Type must be shipping or billing'),
  body('first_name').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('last_name').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('company').optional().trim().isLength({ max: 100 }).withMessage('Company name must be less than 100 characters'),
  body('address_line_1').trim().isLength({ min: 5, max: 255 }).withMessage('Address line 1 must be 5-255 characters'),
  body('address_line_2').optional().trim().isLength({ max: 255 }).withMessage('Address line 2 must be less than 255 characters'),
  body('city').trim().isLength({ min: 2, max: 100 }).withMessage('City must be 2-100 characters'),
  body('state').trim().isLength({ min: 2, max: 100 }).withMessage('State must be 2-100 characters'),
  body('postal_code').trim().isLength({ min: 4, max: 20 }).withMessage('Postal code must be 4-20 characters'),
  body('country').trim().isLength({ min: 2, max: 100 }).withMessage('Country must be 2-100 characters'),
  body('phone').optional().trim().matches(/^\+?[\d\s-()]+$/).withMessage('Invalid phone number format'),
  body('is_default').optional().isBoolean().withMessage('is_default must be boolean'),
  handleValidation
];

const validateAddressId = [
  param('id').isUUID().withMessage('Invalid address ID'),
  handleValidation
];

// Get all addresses for user
router.get('/', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { type } = req.query;

    let query = 'SELECT * FROM addresses WHERE user_id = $1';
    const params = [userId];

    if (type && ['shipping', 'billing'].includes(type as string)) {
      query += ' AND type = $2';
      params.push(type as string);
    }

    query += ' ORDER BY is_default DESC, created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching addresses'
    });
  }
});

// Get single address
router.get('/:id', validateAddressId, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching address'
    });
  }
});

// Create new address
router.post('/', validateAddress, async (req: any, res: any) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const {
      type,
      first_name,
      last_name,
      company,
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      country,
      phone,
      is_default = false
    } = req.body;

    await client.query('BEGIN');

    // If this is set as default, unset other defaults of the same type
    if (is_default) {
      await client.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1 AND type = $2',
        [userId, type]
      );
    }

    // If this is the first address of this type, make it default
    const existingCount = await client.query(
      'SELECT COUNT(*) FROM addresses WHERE user_id = $1 AND type = $2',
      [userId, type]
    );
    
    const shouldBeDefault = is_default || parseInt(existingCount.rows[0].count) === 0;

    // Create the address
    const result = await client.query(`
      INSERT INTO addresses (
        user_id, type, first_name, last_name, company, address_line_1, 
        address_line_2, city, state, postal_code, country, phone, is_default
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      userId, type, first_name, last_name, company, address_line_1,
      address_line_2, city, state, postal_code, country, phone, shouldBeDefault
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Address created successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating address'
    });
  } finally {
    client.release();
  }
});

// Update address
router.put('/:id', validateAddressId.concat(validateAddress), async (req: any, res: any) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      type,
      first_name,
      last_name,
      company,
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      country,
      phone,
      is_default
    } = req.body;

    await client.query('BEGIN');

    // Check if address exists and belongs to user
    const existingAddress = await client.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingAddress.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // If setting as default, unset other defaults of the same type
    if (is_default) {
      await client.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1 AND type = $2 AND id != $3',
        [userId, type, id]
      );
    }

    // Update the address
    const result = await client.query(`
      UPDATE addresses 
      SET 
        type = $1, first_name = $2, last_name = $3, company = $4, 
        address_line_1 = $5, address_line_2 = $6, city = $7, state = $8, 
        postal_code = $9, country = $10, phone = $11, is_default = $12, 
        updated_at = NOW()
      WHERE id = $13 AND user_id = $14
      RETURNING *
    `, [
      type, first_name, last_name, company, address_line_1, address_line_2,
      city, state, postal_code, country, phone, is_default, id, userId
    ]);

    await client.query('COMMIT');

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Address updated successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating address'
    });
  } finally {
    client.release();
  }
});

// Delete address
router.delete('/:id', validateAddressId, async (req: any, res: any) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await client.query('BEGIN');

    // Check if address exists and belongs to user
    const existingAddress = await client.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingAddress.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    const address = existingAddress.rows[0];

    // Delete the address
    await client.query('DELETE FROM addresses WHERE id = $1', [id]);

    // If this was the default address, set another address of the same type as default
    if (address.is_default) {
      await client.query(`
        UPDATE addresses 
        SET is_default = true 
        WHERE user_id = $1 AND type = $2 AND id = (
          SELECT id FROM addresses 
          WHERE user_id = $1 AND type = $2 
          ORDER BY created_at ASC 
          LIMIT 1
        )
      `, [userId, address.type]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting address'
    });
  } finally {
    client.release();
  }
});

// Set address as default
router.put('/:id/default', validateAddressId, async (req: any, res: any) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await client.query('BEGIN');

    // Check if address exists and belongs to user
    const existingAddress = await client.query(
      'SELECT type FROM addresses WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingAddress.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    const addressType = existingAddress.rows[0].type;

    // Unset current default for this type
    await client.query(
      'UPDATE addresses SET is_default = false WHERE user_id = $1 AND type = $2',
      [userId, addressType]
    );

    // Set this address as default
    const result = await client.query(`
      UPDATE addresses 
      SET is_default = true, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, userId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Default address updated successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Set default address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting default address'
    });
  } finally {
    client.release();
  }
});

// Get default addresses
router.get('/default/:type', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { type } = req.params;

    let query = 'SELECT * FROM addresses WHERE user_id = $1 AND is_default = true';
    const params = [userId];

    if (type && ['shipping', 'billing'].includes(type)) {
      query += ' AND type = $2';
      params.push(type);
    }

    const result = await pool.query(query, params);

    if (type) {
      // Return single default address for specific type
      res.json({
        success: true,
        data: result.rows[0] || null
      });
    } else {
      // Return all default addresses
      res.json({
        success: true,
        data: result.rows
      });
    }
  } catch (error) {
    console.error('Get default addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching default addresses'
    });
  }
});

// Validate address (basic validation service)
router.post('/validate', [
  body('address').isObject().withMessage('Address object is required'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const { address } = req.body;
    
    // Basic validation logic (can be enhanced with external services)
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Check required fields
    const requiredFields = ['first_name', 'last_name', 'address_line_1', 'city', 'state', 'postal_code', 'country'];
    for (const field of requiredFields) {
      if (!address[field]) {
        errors.push(`${field.replace('_', ' ')} is required`);
      }
    }

    // Postal code validation for India
    if (address.country === 'India' && address.postal_code) {
      const pinRegex = /^[1-9][0-9]{5}$/;
      if (!pinRegex.test(address.postal_code)) {
        errors.push('Invalid PIN code format for India');
      }
    }

    // Phone number validation
    if (address.phone) {
      const phoneRegex = /^\+?[\d\s-()]+$/;
      if (!phoneRegex.test(address.phone)) {
        errors.push('Invalid phone number format');
      }
    }

    // Generate suggestions for improvement
    if (address.address_line_1 && address.address_line_1.length < 10) {
      suggestions.push('Consider providing a more detailed address for better delivery accuracy');
    }

    if (!address.phone) {
      suggestions.push('Adding a phone number helps with delivery coordination');
    }

    const isValid = errors.length === 0;

    res.json({
      success: true,
      data: {
        is_valid: isValid,
        errors: errors,
        suggestions: suggestions,
        confidence_score: isValid ? (10 - suggestions.length * 2) / 10 : 0
      }
    });
  } catch (error) {
    console.error('Validate address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating address'
    });
  }
});

export default router;