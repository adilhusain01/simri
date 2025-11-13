import express from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import { body } from 'express-validator';
import { handleValidation } from '../middleware/validation';
import { authService } from '../services/authService';
import pool from '../config/database';

const router = express.Router();

// Google OAuth routes
router.get('/google', (req, res, next) => {
  // Capture the state parameter from the query string
  const state = req.query.state as string || '/';

  // Store the state in the session to retrieve after OAuth callback
  req.session.oauthState = state;

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: state // Pass state to Google OAuth
  })(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login' }),
  (req, res) => {
    // Get the original redirect URL from session or query state
    const redirectTo = req.session.oauthState || (typeof req.query.state === 'string' ? req.query.state : '/') || '/';

    // Clean up the session state
    delete req.session.oauthState;

    // Redirect to the original intended page
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?success=true&redirect=${encodeURIComponent(redirectTo)}`);
  }
);

// Email/Password Registration
router.post('/register', [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Invalid phone number format'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    const result = await authService.registerUser({
      firstName,
      lastName,
      email,
      phone,
      password
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    // Don't log in after registration, just return success message
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: {
        email: result.user!.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Email/Password Login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    const result = await authService.loginUser(email, password);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message
      });
    }

    // Log in the user
    req.login(result.user, (err: any) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({
          success: false,
          message: 'Login failed'
        });
      }

      res.json({
        success: true,
        message: result.message,
        data: {
          user: {
            id: result.user!.id,
            name: result.user!.name,
            email: result.user!.email,
            phone: result.user!.phone,
            role: result.user!.role,
            isVerified: result.user!.is_verified,
            createdAt: result.user!.created_at
          }
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Email verification
router.get('/verify-email/:token', async (req: any, res: any) => {
  try {
    const { token } = req.params;

    const result = await authService.verifyEmail(token);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying email'
    });
  }
});

// Get current user
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ success: true, user: req.user });
  } else {
    res.status(401).json({ success: false, message: 'Not authenticated' });
  }
});

// Password reset request
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const { email } = req.body;

    // Rate limiting check
    const recentAttempts = await authService.getRecentResetAttempts(email);
    if (recentAttempts >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many password reset attempts. Please try again later.'
      });
    }

    const result = await authService.generatePasswordResetToken(email);

    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing password reset request'
    });
  }
});

// Verify password reset token
router.get('/reset-password/:token', async (req: any, res: any) => {
  try {
    const { token } = req.params;

    const verification = await authService.verifyPasswordResetToken(token);

    if (verification.valid) {
      res.json({
        success: true,
        message: 'Valid reset token',
        data: {
          email: verification.user.email,
          name: verification.user.name
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: verification.message
      });
    }
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying reset token'
    });
  }
});

// Reset password with token
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  }),
  handleValidation
], async (req: any, res: any) => {
  try {
    const { token, newPassword } = req.body;

    // Validate password strength
    const passwordValidation = authService.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    const result = await authService.resetPassword(token, newPassword);

    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
});

// Validate password strength endpoint
router.post('/validate-password', [
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const { password } = req.body;

    const validation = authService.validatePasswordStrength(password);

    res.json({
      success: true,
      data: {
        valid: validation.valid,
        score: validation.score,
        errors: validation.errors,
        strength: validation.score >= 4 ? 'strong' : validation.score >= 3 ? 'medium' : 'weak'
      }
    });
  } catch (error) {
    console.error('Validate password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating password'
    });
  }
});

export default router;