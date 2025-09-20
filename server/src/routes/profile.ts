import express from 'express';
import { requireAuth } from '../middleware/auth';
import { body, param } from 'express-validator';
import { handleValidation } from '../middleware/validation';
import pool from '../config/database';
import bcrypt from 'bcryptjs';
import { emailService } from '../services/emailService';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Validation middleware
const validateProfileUpdate = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  handleValidation
];

const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  }),
  handleValidation
];

const validateEmailChange = [
  body('newEmail').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required for email change'),
  handleValidation
];

// Get user profile
router.get('/', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT 
        id, email, name, avatar_url, role, is_verified, created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];
    
    // Get additional user statistics
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM orders WHERE user_id = $1 AND payment_status = 'paid') as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = $1 AND payment_status = 'paid') as total_spent,
        (SELECT COUNT(*) FROM wishlists WHERE user_id = $1) as wishlist_count,
        (SELECT COUNT(*) FROM reviews WHERE user_id = $1) as review_count
    `, [userId]);

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        ...user,
        stats: {
          total_orders: parseInt(stats.total_orders),
          total_spent: parseFloat(stats.total_spent),
          wishlist_count: parseInt(stats.wishlist_count),
          review_count: parseInt(stats.review_count)
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

// Update user profile
router.put('/', validateProfileUpdate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { name, email, avatar } = req.body;

    // Block email updates - email changes should go through verification process
    if (email !== undefined) {
      return res.status(400).json({
        success: false,
        message: 'Email updates are not allowed through this endpoint. Use the email change endpoint for verified email updates.'
      });
    }

    // Block avatar updates - avatars are managed through OAuth providers
    if (avatar !== undefined) {
      return res.status(400).json({
        success: false,
        message: 'Avatar updates are not supported. Profile pictures are managed through your OAuth provider.'
      });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, name, avatar_url, role, is_verified, created_at, updated_at
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
});

// Change password
router.put('/password', validatePasswordChange, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Check if user has a password (OAuth users might not)
    if (!user.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change password for OAuth accounts'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(`
      UPDATE users 
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
    `, [newPasswordHash, userId]);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
});

// Change email
router.put('/email', validateEmailChange, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { newEmail, password } = req.body;

    // Get current user data
    const userResult = await pool.query('SELECT email, password_hash FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // For OAuth users, they might not have a password
    if (user.password_hash) {
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password is incorrect'
        });
      }
    }

    // Check if new email is already taken
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [newEmail, userId]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email is already in use'
      });
    }

    // Update email and mark as unverified
    await pool.query(`
      UPDATE users 
      SET email = $1, is_verified = false, updated_at = NOW()
      WHERE id = $2
    `, [newEmail, userId]);

    // TODO: Send email verification email
    // await emailService.sendEmailVerification(user, verificationToken);

    res.json({
      success: true,
      message: 'Email updated successfully. Please verify your new email address.'
    });
  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing email'
    });
  }
});

// Upload avatar
router.post('/avatar', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { avatar_url } = req.body;

    if (!avatar_url) {
      return res.status(400).json({
        success: false,
        message: 'Avatar URL is required'
      });
    }

    await pool.query(`
      UPDATE users 
      SET avatar_url = $1, updated_at = NOW()
      WHERE id = $2
    `, [avatar_url, userId]);

    res.json({
      success: true,
      data: { avatar_url },
      message: 'Avatar updated successfully'
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating avatar'
    });
  }
});

// Delete account
router.delete('/account', [
  body('password').notEmpty().withMessage('Password is required for account deletion'),
  body('confirmDelete').equals('DELETE').withMessage('Confirmation must be "DELETE"'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    // Get user data
    const userResult = await pool.query('SELECT email, name, password_hash FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Verify password for non-OAuth users
    if (user.password_hash) {
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password is incorrect'
        });
      }
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Soft delete - anonymize user data instead of hard delete
      await client.query(`
        UPDATE users 
        SET 
          email = CONCAT('deleted_', id, '@deleted.local'),
          name = 'Deleted User',
          avatar_url = NULL,
          phone = NULL,
          date_of_birth = NULL,
          preferences = NULL,
          is_verified = false,
          google_id = NULL,
          password_hash = NULL,
          updated_at = NOW()
        WHERE id = $1
      `, [userId]);

      // Keep orders for business records but anonymize
      await client.query(`
        UPDATE orders 
        SET notes = CONCAT(COALESCE(notes, ''), ' [User account deleted]')
        WHERE user_id = $1
      `, [userId]);

      // Delete personal data
      await client.query('DELETE FROM wishlists WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1)', [userId]);
      await client.query('DELETE FROM carts WHERE user_id = $1', [userId]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account'
    });
  }
});

// Get user activity/order history
router.get('/activity', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type = 'all' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let activities: any[] = [];

    // Get orders
    if (type === 'all' || type === 'orders') {
      const orderResult = await pool.query(`
        SELECT 
          'order' as type,
          id,
          order_number as reference,
          status,
          payment_status,
          total_amount as amount,
          created_at,
          'Order ' || status as description
        FROM orders 
        WHERE user_id = $1
      `, [userId]);
      
      activities = activities.concat(orderResult.rows);
    }

    // Get reviews
    if (type === 'all' || type === 'reviews') {
      const reviewResult = await pool.query(`
        SELECT 
          'review' as type,
          r.id,
          p.name as reference,
          r.rating as status,
          NULL as payment_status,
          NULL as amount,
          r.created_at,
          'Reviewed ' || p.name as description
        FROM reviews r
        JOIN products p ON r.product_id = p.id
        WHERE r.user_id = $1
      `, [userId]);
      
      activities = activities.concat(reviewResult.rows);
    }

    // Sort by created_at and paginate
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const total = activities.length;
    const paginatedActivities = activities.slice(offset, offset + parseInt(limit as string));

    res.json({
      success: true,
      data: {
        activities: paginatedActivities,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user activity'
    });
  }
});

export default router;