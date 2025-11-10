"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartAbandonmentService = void 0;
const database_1 = __importDefault(require("../config/database"));
const emailService_1 = require("./emailService");
class CartAbandonmentService {
    constructor() {
        this.ABANDONMENT_THRESHOLD_HOURS = 2; // Consider cart abandoned after 2 hours
        this.MAX_REMINDERS = 3;
        this.REMINDER_INTERVALS = [24, 72, 168]; // 1 day, 3 days, 1 week (in hours)
    }
    /**
     * Track cart activity (called when user adds/updates cart)
     */
    async trackCartActivity(userId) {
        try {
            await database_1.default.query(`
        INSERT INTO cart_abandonment_tracking (user_id, last_activity)
        VALUES ($1, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET 
          last_activity = NOW(),
          is_abandoned = false
      `, [userId]);
        }
        catch (error) {
            console.error('Track cart activity error:', error);
        }
    }
    /**
     * Mark cart as abandoned (called by scheduled job)
     */
    async markAbandonedCarts() {
        try {
            const result = await database_1.default.query(`
        UPDATE cart_abandonment_tracking 
        SET is_abandoned = true, abandoned_at = NOW()
        WHERE last_activity < NOW() - INTERVAL '${this.ABANDONMENT_THRESHOLD_HOURS} hours'
          AND is_abandoned = false
          AND user_id IN (
            SELECT DISTINCT c.user_id 
            FROM carts c 
            JOIN cart_items ci ON c.id = ci.cart_id 
            WHERE ci.quantity > 0
          )
        RETURNING user_id
      `);
            console.log(`Marked ${result.rows.length} carts as abandoned`);
            return result.rows.length;
        }
        catch (error) {
            console.error('Mark abandoned carts error:', error);
            return 0;
        }
    }
    /**
     * Get abandoned carts eligible for reminders
     */
    async getAbandonedCartsForReminders() {
        try {
            const result = await database_1.default.query(`
        WITH abandoned_cart_details AS (
          SELECT 
            cat.user_id,
            u.email as user_email,
            u.name as user_name,
            cat.abandoned_at,
            cat.reminder_count,
            c.id as cart_id,
            COUNT(ci.id) as total_items,
            SUM(ci.quantity * p.price) as total_value
          FROM cart_abandonment_tracking cat
          JOIN users u ON cat.user_id = u.id
          JOIN carts c ON cat.user_id = c.user_id
          JOIN cart_items ci ON c.id = ci.cart_id
          JOIN products p ON ci.product_id = p.id
          WHERE cat.is_abandoned = true
            AND cat.reminder_count < $1
            AND (
              (cat.reminder_count = 0 AND cat.abandoned_at <= NOW() - INTERVAL '${this.REMINDER_INTERVALS[0]} hours') OR
              (cat.reminder_count = 1 AND cat.abandoned_at <= NOW() - INTERVAL '${this.REMINDER_INTERVALS[1]} hours') OR
              (cat.reminder_count = 2 AND cat.abandoned_at <= NOW() - INTERVAL '${this.REMINDER_INTERVALS[2]} hours')
            )
          GROUP BY cat.user_id, u.email, u.name, cat.abandoned_at, cat.reminder_count, c.id
        ),
        cart_items_details AS (
          SELECT 
            acd.user_id,
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'product_id', p.id,
                'product_name', p.name,
                'product_image', p.images,
                'quantity', ci.quantity,
                'price', p.price
              )
            ) as items
          FROM abandoned_cart_details acd
          JOIN carts c ON acd.user_id = c.user_id
          JOIN cart_items ci ON c.id = ci.cart_id
          JOIN products p ON ci.product_id = p.id
          GROUP BY acd.user_id
        )
        SELECT 
          acd.*,
          cid.items
        FROM abandoned_cart_details acd
        JOIN cart_items_details cid ON acd.user_id = cid.user_id
        ORDER BY acd.total_value DESC
      `, [this.MAX_REMINDERS]);
            return result.rows.map(row => ({
                id: row.cart_id,
                user_id: row.user_id,
                user_email: row.user_email,
                user_name: row.user_name,
                total_items: parseInt(row.total_items),
                total_value: parseFloat(row.total_value),
                last_activity: row.abandoned_at,
                reminder_count: row.reminder_count,
                items: row.items
            }));
        }
        catch (error) {
            console.error('Get abandoned carts for reminders error:', error);
            return [];
        }
    }
    /**
     * Send cart abandonment reminder email
     */
    async sendAbandonmentReminder(abandonedCart) {
        try {
            const reminderType = this.getReminderType(abandonedCart.reminder_count);
            // Create discount code for the reminder
            const discountCode = await this.createReminderDiscount(abandonedCart.user_id, abandonedCart.reminder_count);
            const emailContent = this.generateReminderEmail(abandonedCart, reminderType, discountCode);
            await emailService_1.emailService.sendEmail({
                to: abandonedCart.user_email,
                subject: emailContent.subject,
                html: emailContent.html
            });
            // Update reminder count
            await database_1.default.query(`
        UPDATE cart_abandonment_tracking 
        SET reminder_count = reminder_count + 1, last_reminder_sent = NOW()
        WHERE user_id = $1
      `, [abandonedCart.user_id]);
            return true;
        }
        catch (error) {
            console.error('Send abandonment reminder error:', error);
            return false;
        }
    }
    /**
     * Mark cart as recovered (called when user completes purchase)
     */
    async markCartRecovered(userId) {
        try {
            await database_1.default.query(`
        UPDATE cart_abandonment_tracking 
        SET is_recovered = true, recovered_at = NOW()
        WHERE user_id = $1 AND is_abandoned = true
      `, [userId]);
        }
        catch (error) {
            console.error('Mark cart recovered error:', error);
        }
    }
    /**
     * Get cart abandonment analytics
     */
    async getAbandonmentAnalytics(days = 30) {
        try {
            const [overview, dailyData] = await Promise.all([
                // Overview statistics
                database_1.default.query(`
          SELECT 
            COUNT(*) as total_abandoned_carts,
            COUNT(CASE WHEN is_recovered = true THEN 1 END) as recovered_carts,
            ROUND(
              (COUNT(CASE WHEN is_recovered = true THEN 1 END)::DECIMAL / 
               NULLIF(COUNT(*), 0)) * 100, 2
            ) as recovery_rate,
            ROUND(AVG(
              CASE WHEN cart_value IS NOT NULL THEN cart_value ELSE 0 END
            ), 2) as average_abandoned_value,
            ROUND(SUM(
              CASE WHEN is_recovered = false AND cart_value IS NOT NULL 
                   THEN cart_value ELSE 0 END
            ), 2) as total_lost_revenue
          FROM cart_abandonment_tracking cat
          LEFT JOIN (
            SELECT 
              c.user_id,
              SUM(ci.quantity * p.price) as cart_value
            FROM carts c
            JOIN cart_items ci ON c.id = ci.cart_id
            JOIN products p ON ci.product_id = p.id
            GROUP BY c.user_id
          ) cv ON cat.user_id = cv.user_id
          WHERE cat.abandoned_at >= NOW() - INTERVAL '${days} days'
        `),
                // Daily abandonment data
                database_1.default.query(`
          SELECT 
            DATE_TRUNC('day', abandoned_at) as date,
            COUNT(*) as abandoned_count,
            COUNT(CASE WHEN is_recovered = true THEN 1 END) as recovered_count,
            ROUND(SUM(
              CASE WHEN cart_value IS NOT NULL THEN cart_value ELSE 0 END
            ), 2) as total_value
          FROM cart_abandonment_tracking cat
          LEFT JOIN (
            SELECT 
              c.user_id,
              SUM(ci.quantity * p.price) as cart_value
            FROM carts c
            JOIN cart_items ci ON c.id = ci.cart_id
            JOIN products p ON ci.product_id = p.id
            GROUP BY c.user_id
          ) cv ON cat.user_id = cv.user_id
          WHERE cat.abandoned_at >= NOW() - INTERVAL '${days} days'
          GROUP BY DATE_TRUNC('day', abandoned_at)
          ORDER BY date DESC
        `)
            ]);
            const stats = overview.rows[0];
            return {
                total_abandoned_carts: parseInt(stats.total_abandoned_carts) || 0,
                recovered_carts: parseInt(stats.recovered_carts) || 0,
                recovery_rate: parseFloat(stats.recovery_rate) || 0,
                average_abandoned_value: parseFloat(stats.average_abandoned_value) || 0,
                total_lost_revenue: parseFloat(stats.total_lost_revenue) || 0,
                daily_abandonment: dailyData.rows.map(row => ({
                    date: row.date.toISOString().split('T')[0],
                    abandoned_count: parseInt(row.abandoned_count),
                    recovered_count: parseInt(row.recovered_count),
                    total_value: parseFloat(row.total_value) || 0
                }))
            };
        }
        catch (error) {
            console.error('Get abandonment analytics error:', error);
            return {
                total_abandoned_carts: 0,
                recovered_carts: 0,
                recovery_rate: 0,
                average_abandoned_value: 0,
                total_lost_revenue: 0,
                daily_abandonment: []
            };
        }
    }
    /**
     * Process abandonment reminders (called by scheduled job)
     */
    async processAbandonmentReminders() {
        try {
            const abandonedCarts = await this.getAbandonedCartsForReminders();
            let sent = 0;
            let failed = 0;
            for (const cart of abandonedCarts) {
                const success = await this.sendAbandonmentReminder(cart);
                if (success) {
                    sent++;
                }
                else {
                    failed++;
                }
            }
            console.log(`Processed ${abandonedCarts.length} abandonment reminders: ${sent} sent, ${failed} failed`);
            return { sent, failed };
        }
        catch (error) {
            console.error('Process abandonment reminders error:', error);
            return { sent: 0, failed: 0 };
        }
    }
    /**
     * Clean up old abandonment records
     */
    async cleanupOldRecords(daysToKeep = 90) {
        try {
            const result = await database_1.default.query(`
        DELETE FROM cart_abandonment_tracking 
        WHERE abandoned_at < NOW() - INTERVAL '${daysToKeep} days'
        RETURNING user_id
      `);
            console.log(`Cleaned up ${result.rows.length} old abandonment records`);
            return result.rows.length;
        }
        catch (error) {
            console.error('Cleanup old records error:', error);
            return 0;
        }
    }
    /**
     * Generate reminder email content based on reminder count
     */
    generateReminderEmail(cart, reminderType, discountCode) {
        const itemsList = cart.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <img src="${item.product_image}" alt="${item.product_name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${item.product_name}</strong><br>
          Quantity: ${item.quantity}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
          ₹${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `).join('');
        const discountSection = discountCode ? `
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <h3 style="color: #28a745; margin: 0 0 10px 0;">Special Discount for You!</h3>
        <p style="margin: 0 0 10px 0;">Use code <strong style="font-size: 18px; color: #dc3545;">${discountCode}</strong> and save!</p>
        <p style="margin: 0; font-size: 14px; color: #6c757d;">Limited time offer</p>
      </div>
    ` : '';
        const subjects = {
            first: "You left something special in your cart! 🛍️",
            second: "Still thinking? Your cart is waiting... 💭",
            final: "Last chance! Your cart expires soon ⏰"
        };
        const messages = {
            first: "Don't let these amazing gifts slip away!",
            second: "We saved your favorite items, but they won't wait forever.",
            final: "This is your final reminder - complete your purchase before it's too late!"
        };
        return {
            subject: subjects[reminderType],
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center; margin-bottom: 20px;">
              Hi ${cart.user_name}! 👋
            </h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6; text-align: center;">
              ${messages[reminderType]}
            </p>

            ${discountSection}

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Your Cart (${cart.total_items} items)</h3>
              <table style="width: 100%; border-collapse: collapse;">
                ${itemsList}
                <tr style="border-top: 2px solid #dee2e6;">
                  <td colspan="2" style="padding: 15px; font-weight: bold; font-size: 16px;">Total</td>
                  <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 16px;">₹${cart.total_value.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/cart" 
                 style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Complete Your Purchase
              </a>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="color: #6c757d; font-size: 14px; margin: 0;">
                Questions? Contact us at <a href="mailto:support@simri.com">support@simri.com</a>
              </p>
            </div>
          </div>
        </div>
      `
        };
    }
    /**
     * Get reminder type based on count
     */
    getReminderType(reminderCount) {
        switch (reminderCount) {
            case 0: return 'first';
            case 1: return 'second';
            case 2: return 'final';
            default: return 'first';
        }
    }
    /**
     * Create discount code for abandonment recovery
     */
    async createReminderDiscount(userId, reminderCount) {
        try {
            const discountPercentages = [5, 10, 15]; // Increasing discount with each reminder
            const discount = discountPercentages[reminderCount] || 5;
            const code = `COMEBACK${discount}-${userId.substr(-6).toUpperCase()}`;
            await database_1.default.query(`
        INSERT INTO coupons (code, type, value, minimum_order_amount, max_uses, expires_at, is_active, created_for_user)
        VALUES ($1, 'percentage', $2, 500, 1, NOW() + INTERVAL '7 days', true, $3)
        ON CONFLICT (code) DO NOTHING
      `, [code, discount, userId]);
            return code;
        }
        catch (error) {
            console.error('Create reminder discount error:', error);
            return null;
        }
    }
}
exports.cartAbandonmentService = new CartAbandonmentService();
//# sourceMappingURL=cartAbandonmentService.js.map