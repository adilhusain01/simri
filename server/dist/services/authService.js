"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const database_1 = __importDefault(require("../config/database"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const emailService_1 = require("./emailService");
class AuthService {
    constructor() {
        this.TOKEN_EXPIRY_HOURS = 1;
        this.EMAIL_VERIFY_EXPIRY_HOURS = 24;
    }
    // Register new user with email/password
    async registerUser(userData) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            const { firstName, lastName, email, phone, password } = userData;
            // Check if user already exists
            const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
            if (existingUser.rows.length > 0) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: 'User with this email already exists'
                };
            }
            // Validate password strength
            const passwordValidation = this.validatePasswordStrength(password);
            if (!passwordValidation.valid) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: `Password validation failed: ${passwordValidation.errors.join(', ')}`
                };
            }
            // Hash password
            const saltRounds = 12;
            const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
            // Create user
            const userResult = await client.query(`
        INSERT INTO users (
          name, email, phone, password_hash, auth_provider, 
          is_verified, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id, name, email, phone, role, auth_provider, 
                 is_verified, created_at, updated_at
      `, [
                `${firstName} ${lastName}`.trim(),
                email,
                phone || null,
                passwordHash,
                'local',
                false
            ]);
            const user = userResult.rows[0];
            // Generate email verification token
            const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
            const verifyExpiresAt = new Date();
            verifyExpiresAt.setHours(verifyExpiresAt.getHours() + this.EMAIL_VERIFY_EXPIRY_HOURS);
            await client.query(`
        INSERT INTO email_verification_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
      `, [user.id, verificationToken, verifyExpiresAt]);
            await client.query('COMMIT');
            // Send verification email
            await emailService_1.emailService.sendEmailVerification(user, verificationToken);
            return {
                success: true,
                message: 'User registered successfully. Please check your email to verify your account.',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    auth_provider: user.auth_provider,
                    is_verified: user.is_verified,
                    created_at: user.created_at,
                    updated_at: user.updated_at
                }
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Register user error:', error);
            return {
                success: false,
                message: 'Registration failed. Please try again.'
            };
        }
        finally {
            client.release();
        }
    }
    // Login user with email/password
    async loginUser(email, password) {
        try {
            // Find user by email
            const result = await database_1.default.query(`
        SELECT id, name, email, phone, password_hash, role, auth_provider, 
               is_verified, email_verified_at, created_at, updated_at
        FROM users 
        WHERE email = $1 AND auth_provider = $2
      `, [email, 'local']);
            if (result.rows.length === 0) {
                return {
                    success: false,
                    message: 'Invalid email or password'
                };
            }
            const user = result.rows[0];
            // Check if user is verified
            if (!user.is_verified) {
                return {
                    success: false,
                    message: 'Please verify your email address before logging in. Check your inbox for the verification link.'
                };
            }
            // Verify password
            const passwordMatch = await bcryptjs_1.default.compare(password, user.password_hash);
            if (!passwordMatch) {
                return {
                    success: false,
                    message: 'Invalid email or password'
                };
            }
            // Update last login
            await database_1.default.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
            return {
                success: true,
                message: 'Login successful',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    auth_provider: user.auth_provider,
                    is_verified: user.is_verified,
                    email_verified_at: user.email_verified_at,
                    created_at: user.created_at,
                    updated_at: user.updated_at
                }
            };
        }
        catch (error) {
            console.error('Login user error:', error);
            return {
                success: false,
                message: 'Login failed. Please try again.'
            };
        }
    }
    // Create or update Google OAuth user
    async createOrUpdateGoogleUser(profile) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Check if user exists by Google ID
            let userResult = await client.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
            let user;
            if (userResult.rows.length > 0) {
                // Update existing user
                user = await client.query(`
          UPDATE users 
          SET name = $1, avatar_url = $2, last_login_at = NOW(), updated_at = NOW()
          WHERE google_id = $3
          RETURNING *
        `, [profile.displayName, profile.photos?.[0]?.value, profile.id]);
                user = user.rows[0];
            }
            else {
                // Check if user exists by email
                const emailResult = await client.query('SELECT * FROM users WHERE email = $1', [profile.emails[0].value]);
                if (emailResult.rows.length > 0) {
                    // Link Google account to existing user
                    user = await client.query(`
            UPDATE users 
            SET google_id = $1, name = $2, avatar_url = $3, auth_provider = $4,
                is_verified = true, email_verified_at = NOW(), 
                last_login_at = NOW(), updated_at = NOW()
            WHERE email = $5
            RETURNING *
          `, [
                        profile.id,
                        profile.displayName,
                        profile.photos?.[0]?.value,
                        'google',
                        profile.emails[0].value
                    ]);
                    user = user.rows[0];
                }
                else {
                    // Create new user
                    user = await client.query(`
            INSERT INTO users (
              google_id, email, name, avatar_url, auth_provider,
              is_verified, email_verified_at, created_at, updated_at, last_login_at
            )
            VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW(), NOW(), NOW())
            RETURNING *
          `, [
                        profile.id,
                        profile.emails[0].value,
                        profile.displayName,
                        profile.photos?.[0]?.value,
                        'google'
                    ]);
                    user = user.rows[0];
                }
            }
            await client.query('COMMIT');
            return user;
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Create or update Google user error:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    // Verify email with token
    async verifyEmail(token) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Find valid token
            const tokenResult = await client.query(`
        SELECT evt.*, u.id as user_id, u.email, u.name
        FROM email_verification_tokens evt
        JOIN users u ON evt.user_id = u.id
        WHERE evt.token = $1 AND evt.used = false AND evt.expires_at > NOW()
      `, [token]);
            if (tokenResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: 'Invalid or expired verification token'
                };
            }
            const tokenData = tokenResult.rows[0];
            // Mark user as verified
            await client.query(`
        UPDATE users 
        SET is_verified = true, email_verified_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [tokenData.user_id]);
            // Mark token as used
            await client.query(`
        UPDATE email_verification_tokens 
        SET used = true 
        WHERE token = $1
      `, [token]);
            await client.query('COMMIT');
            return {
                success: true,
                message: 'Email verified successfully'
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Verify email error:', error);
            return {
                success: false,
                message: 'Email verification failed'
            };
        }
        finally {
            client.release();
        }
    }
    // Initialize password reset tokens table
    async initializePasswordResetTable() {
        try {
            await database_1.default.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          used BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
            // Create index for better performance
            await database_1.default.query(`
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
      `);
            console.log('Password reset tokens table initialized');
        }
        catch (error) {
            console.error('Error initializing password reset table:', error);
        }
    }
    // Generate password reset token
    async generatePasswordResetToken(email) {
        try {
            // Find user by email
            const userResult = await database_1.default.query('SELECT id, name, email, google_id, auth_provider FROM users WHERE email = $1 AND is_verified = true', [email]);
            if (userResult.rows.length === 0) {
                // Don't reveal if email exists or not for security
                return {
                    success: true,
                    message: 'If an account with that email exists, a password reset link has been sent.'
                };
            }
            const user = userResult.rows[0];
            // Check if user is OAuth user (no password reset for OAuth users)
            if (user.auth_provider === 'google') {
                return {
                    success: false,
                    message: 'Cannot reset password for Google OAuth accounts. Please sign in with Google.'
                };
            }
            // Generate secure random token
            const token = crypto_1.default.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);
            // Invalidate any existing tokens for this user
            await database_1.default.query('UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false', [user.id]);
            // Create new token
            await database_1.default.query(`
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
      `, [user.id, token, expiresAt]);
            // Send password reset email
            await emailService_1.emailService.sendPasswordResetEmail(user, token);
            return {
                success: true,
                message: 'Password reset link has been sent to your email address.'
            };
        }
        catch (error) {
            console.error('Generate password reset token error:', error);
            return {
                success: false,
                message: 'Error generating password reset token. Please try again.'
            };
        }
    }
    // Verify password reset token
    async verifyPasswordResetToken(token) {
        try {
            const result = await database_1.default.query(`
        SELECT prt.*, u.id as user_id, u.email, u.name
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > NOW()
      `, [token]);
            if (result.rows.length === 0) {
                return {
                    valid: false,
                    message: 'Invalid or expired password reset token'
                };
            }
            return {
                valid: true,
                user: result.rows[0]
            };
        }
        catch (error) {
            console.error('Verify password reset token error:', error);
            return {
                valid: false,
                message: 'Error verifying token'
            };
        }
    }
    // Reset password using token
    async resetPassword(token, newPassword) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Verify token
            const tokenResult = await client.query(`
        SELECT prt.*, u.id as user_id, u.email, u.name
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > NOW()
      `, [token]);
            if (tokenResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    message: 'Invalid or expired password reset token'
                };
            }
            const tokenData = tokenResult.rows[0];
            // Hash new password
            const saltRounds = 12;
            const passwordHash = await bcryptjs_1.default.hash(newPassword, saltRounds);
            // Update user password
            await client.query(`
        UPDATE users 
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
      `, [passwordHash, tokenData.user_id]);
            // Mark token as used
            await client.query(`
        UPDATE password_reset_tokens 
        SET used = true 
        WHERE token = $1
      `, [token]);
            // Invalidate all other tokens for this user
            await client.query(`
        UPDATE password_reset_tokens 
        SET used = true 
        WHERE user_id = $1 AND token != $2
      `, [tokenData.user_id, token]);
            await client.query('COMMIT');
            return {
                success: true,
                message: 'Password has been reset successfully. You can now sign in with your new password.'
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Reset password error:', error);
            return {
                success: false,
                message: 'Error resetting password. Please try again.'
            };
        }
        finally {
            client.release();
        }
    }
    // Clean up expired tokens (call this periodically)
    async cleanupExpiredTokens() {
        try {
            const result = await database_1.default.query(`
        DELETE FROM password_reset_tokens 
        WHERE expires_at < NOW() OR used = true
        RETURNING id
      `);
            const deletedCount = result.rows.length;
            if (deletedCount > 0) {
                console.log(`Cleaned up ${deletedCount} expired password reset tokens`);
            }
            return deletedCount;
        }
        catch (error) {
            console.error('Cleanup expired tokens error:', error);
            return 0;
        }
    }
    // Get user's password reset attempts (for rate limiting)
    async getRecentResetAttempts(email) {
        try {
            const result = await database_1.default.query(`
        SELECT COUNT(*)
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE u.email = $1 AND prt.created_at > NOW() - INTERVAL '1 hour'
      `, [email]);
            return parseInt(result.rows[0].count);
        }
        catch (error) {
            console.error('Get recent reset attempts error:', error);
            return 0;
        }
    }
    // Validate password strength
    validatePasswordStrength(password) {
        const errors = [];
        let score = 0;
        // Minimum length
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        else {
            score += 1;
        }
        // Maximum length
        if (password.length > 128) {
            errors.push('Password must be less than 128 characters');
        }
        // Contains lowercase
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        else {
            score += 1;
        }
        // Contains uppercase
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        else {
            score += 1;
        }
        // Contains numbers
        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        else {
            score += 1;
        }
        // Contains special characters
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        else {
            score += 1;
        }
        // Common password check (basic)
        const commonPasswords = [
            'password', '123456', 'password123', 'admin', 'qwerty',
            'letmein', 'welcome', 'monkey', '12345678', 'password1'
        ];
        if (commonPasswords.includes(password.toLowerCase())) {
            errors.push('Password is too common. Please choose a more unique password');
            score = Math.max(0, score - 2);
        }
        return {
            valid: errors.length === 0,
            errors,
            score: Math.min(5, score)
        };
    }
    // Start periodic cleanup
    startPeriodicTokenCleanup() {
        // Run cleanup every hour
        setInterval(async () => {
            await this.cleanupExpiredTokens();
        }, 60 * 60 * 1000);
        console.log('Started periodic password reset token cleanup');
    }
}
exports.authService = new AuthService();
//# sourceMappingURL=authService.js.map