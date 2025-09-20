import nodemailer from 'nodemailer';
import { Order, User } from '../types';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure email transporter
    const config: EmailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASSWORD || ''
      }
    };

    this.transporter = nodemailer.createTransport(config);
  }

  private async sendEmail(to: string, subject: string, html: string, text?: string) {
    try {
      const mailOptions = {
        from: `"${process.env.COMPANY_NAME || 'Simri'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text: text || this.htmlToText(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Email template functions
  private getEmailHeader(): string {
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">${process.env.COMPANY_NAME || 'Simri'}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Your Gift Store</p>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
    `;
  }

  private getEmailFooter(): string {
    return `
        </div>
        <div style="background: #333; padding: 20px; text-align: center; color: #999;">
          <p style="margin: 0; font-size: 14px;">
            © ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Simri'}. All rights reserved.
          </p>
          <p style="margin: 10px 0 0 0; font-size: 12px;">
            <a href="${process.env.CLIENT_URL}/unsubscribe" style="color: #667eea; text-decoration: none;">Unsubscribe</a> |
            <a href="${process.env.CLIENT_URL}/privacy" style="color: #667eea; text-decoration: none;">Privacy Policy</a>
          </p>
        </div>
      </div>
    `;
  }

  // Welcome email for new users
  async sendWelcomeEmail(user: User): Promise<{ success: boolean; error?: string }> {
    const html = `
      ${this.getEmailHeader()}
      <h2 style="color: #667eea; margin-bottom: 20px;">Welcome to ${process.env.COMPANY_NAME || 'Simri'}! 🎉</h2>
      
      <p>Hi ${user.name},</p>
      
      <p>Thank you for joining our gift store! We're excited to help you find the perfect gifts for your loved ones.</p>
      
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
        <h3 style="margin-top: 0; color: #333;">What's Next?</h3>
        <ul style="padding-left: 20px;">
          <li>Browse our curated collection of unique gifts</li>
          <li>Create your wishlist for future purchases</li>
          <li>Enjoy free shipping on orders over ₹500</li>
          <li>Get exclusive offers and early access to sales</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL}/products" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Start Shopping</a>
      </div>
      
      <p>If you have any questions, feel free to reach out to our support team.</p>
      
      <p>Happy shopping!<br>The ${process.env.COMPANY_NAME || 'Simri'} Team</p>
      ${this.getEmailFooter()}
    `;

    return this.sendEmail(user.email, `Welcome to ${process.env.COMPANY_NAME || 'Simri'}!`, html);
  }

  // Order confirmation email
  async sendOrderConfirmationEmail(order: Order, user: User): Promise<{ success: boolean; error?: string }> {
    const html = `
      ${this.getEmailHeader()}
      <h2 style="color: #667eea; margin-bottom: 20px;">Order Confirmation 📦</h2>
      
      <p>Hi ${user.name},</p>
      
      <p>Thank you for your order! We've received your order and it's being processed.</p>
      
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #667eea;">
        <h3 style="margin-top: 0; color: #333;">Order Details</h3>
        <p><strong>Order Number:</strong> ${order.order_number}</p>
        <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
        <p><strong>Total Amount:</strong> ₹${Number(order.total_amount).toFixed(2)}</p>
        <p><strong>Payment Status:</strong> <span style="color: #28a745;">${order.payment_status.toUpperCase()}</span></p>
      </div>
      
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Shipping Address</h3>
        <p>
          ${order.shipping_address.first_name} ${order.shipping_address.last_name}<br>
          ${order.shipping_address.address_line_1}<br>
          ${order.shipping_address.address_line_2 ? order.shipping_address.address_line_2 + '<br>' : ''}
          ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postal_code}<br>
          ${order.shipping_address.country}
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL}/orders/${order.id}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Track Your Order</a>
      </div>
      
      <p>You'll receive another email once your order has been shipped with tracking information.</p>
      
      <p>Thank you for shopping with us!<br>The ${process.env.COMPANY_NAME || 'Simri'} Team</p>
      ${this.getEmailFooter()}
    `;

    return this.sendEmail(user.email, `Order Confirmation - ${order.order_number}`, html);
  }

  // Shipping notification email
  async sendShippingNotificationEmail(order: Order, user: User): Promise<{ success: boolean; error?: string }> {
    const html = `
      ${this.getEmailHeader()}
      <h2 style="color: #667eea; margin-bottom: 20px;">Your Order is on the Way! 🚚</h2>
      
      <p>Hi ${user.name},</p>
      
      <p>Great news! Your order has been shipped and is on its way to you.</p>
      
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #28a745;">
        <h3 style="margin-top: 0; color: #333;">Shipping Details</h3>
        <p><strong>Order Number:</strong> ${order.order_number}</p>
        <p><strong>Tracking Number:</strong> ${order.tracking_number}</p>
        <p><strong>Estimated Delivery:</strong> 3-5 business days</p>
        <p><strong>Shipping Status:</strong> <span style="color: #28a745;">${order.shipping_status.toUpperCase().replace('_', ' ')}</span></p>
      </div>
      
      ${order.tracking_number ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://shiprocket.co/tracking/${order.tracking_number}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Track Package</a>
      </div>
      ` : ''}
      
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <p style="margin: 0; color: #856404;"><strong>Delivery Tips:</strong></p>
        <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #856404;">
          <li>Someone should be available to receive the package</li>
          <li>Keep your phone handy for delivery updates</li>
          <li>Check the package for any damages upon delivery</li>
        </ul>
      </div>
      
      <p>Thank you for your patience and for choosing us!</p>
      
      <p>Best regards,<br>The ${process.env.COMPANY_NAME || 'Simri'} Team</p>
      ${this.getEmailFooter()}
    `;

    return this.sendEmail(user.email, `Your Order is Shipped - ${order.order_number}`, html);
  }

  // Order cancellation email
  async sendOrderCancellationEmail(order: Order, user: User): Promise<{ success: boolean; error?: string }> {
    const html = `
      ${this.getEmailHeader()}
      <h2 style="color: #dc3545; margin-bottom: 20px;">Order Cancelled ❌</h2>
      
      <p>Hi ${user.name},</p>
      
      <p>We've processed your cancellation request for order ${order.order_number}.</p>
      
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #dc3545;">
        <h3 style="margin-top: 0; color: #333;">Cancellation Details</h3>
        <p><strong>Order Number:</strong> ${order.order_number}</p>
        <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
        <p><strong>Cancellation Date:</strong> ${new Date(order.cancelled_at || new Date()).toLocaleDateString()}</p>
        <p><strong>Reason:</strong> ${order.cancellation_reason}</p>
        <p><strong>Order Total:</strong> ₹${Number(order.total_amount).toFixed(2)}</p>
      </div>
      
      ${order.refund_status && order.refund_status !== 'none' ? `
      <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
        <h3 style="margin-top: 0; color: #155724;">Refund Information</h3>
        <p><strong>Refund Status:</strong> <span style="color: #28a745; text-transform: uppercase;">${order.refund_status}</span></p>
        ${order.refund_amount ? `<p><strong>Refund Amount:</strong> ₹${Number(order.refund_amount).toFixed(2)}</p>` : ''}
        <p style="margin: 10px 0 0 0; color: #155724;">
          ${order.refund_status === 'pending' ? 
            'Your refund is being processed and will be credited to your original payment method within 5-7 business days.' : 
            order.refund_status === 'completed' ? 
            'Your refund has been processed successfully.' : 
            'Please contact our support team for refund assistance.'
          }
        </p>
      </div>
      ` : ''}
      
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <p style="margin: 0; color: #856404;"><strong>What's Next?</strong></p>
        <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #856404;">
          <li>If a refund is applicable, it will be processed automatically</li>
          <li>You'll receive a separate confirmation once the refund is completed</li>
          <li>Feel free to browse our other products for future orders</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL}/products" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Continue Shopping</a>
      </div>
      
      <p>We're sorry to see this order cancelled. If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
      
      <p>Thank you for your understanding.<br>The ${process.env.COMPANY_NAME || 'Simri'} Team</p>
      ${this.getEmailFooter()}
    `;

    return this.sendEmail(user.email, `Order Cancelled - ${order.order_number}`, html);
  }

  // Password reset email
  async sendEmailVerification(user: User, verificationToken: string): Promise<{ success: boolean; error?: string }> {
    const verificationUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${verificationToken}`;
    
    const subject = 'Verify Your Email - Welcome to Simri!';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Email Verification</title>
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6A0DAD 0%, #BFA2DB 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: linear-gradient(135deg, #6A0DAD 0%, #BFA2DB 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎁 Welcome to Simri!</h1>
              <p>Your premium gift destination</p>
            </div>
            <div class="content">
              <h2>Hello ${user.name}!</h2>
              <p>Thank you for joining Simri! We're excited to help you find the perfect gifts for your loved ones.</p>
              <p>To complete your registration and start exploring our curated collection of premium gifts, please verify your email address by clicking the button below:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 14px;">${verificationUrl}</p>
              <p><strong>This verification link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account with us, please ignore this email.</p>
              <p>Happy gifting!<br>The Simri Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Simri'}. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendPasswordResetEmail(user: User, resetToken: string): Promise<{ success: boolean; error?: string }> {
    const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password?token=${resetToken}`;
    
    const html = `
      ${this.getEmailHeader()}
      <h2 style="color: #667eea; margin-bottom: 20px;">Reset Your Password 🔐</h2>
      
      <p>Hi ${user.name},</p>
      
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
      </div>
      
      <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
        <p style="margin: 0; color: #721c24;"><strong>Security Note:</strong></p>
        <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #721c24;">
          <li>This link will expire in 1 hour for security</li>
          <li>If you didn't request this, please ignore this email</li>
          <li>Never share this link with anyone</li>
        </ul>
      </div>
      
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
      
      <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
      
      <p>Best regards,<br>The ${process.env.COMPANY_NAME || 'Simri'} Team</p>
      ${this.getEmailFooter()}
    `;

    return this.sendEmail(user.email, 'Password Reset Request', html);
  }

  // Newsletter subscription confirmation email
  async sendNewsletterConfirmationEmail(email: string, name?: string, preferences?: any): Promise<{ success: boolean; error?: string }> {
    const unsubscribeUrl = `${process.env.CLIENT_URL}/newsletter/unsubscribe?email=${encodeURIComponent(email)}`;
    
    const html = `
      ${this.getEmailHeader()}
      <h2 style="color: #667eea; margin-bottom: 20px;">Welcome to Our Newsletter! 📧</h2>
      
      <p>Hi ${name || 'there'},</p>
      
      <p>Thank you for subscribing to the ${process.env.COMPANY_NAME || 'Simri'} newsletter! You're now part of our exclusive community.</p>
      
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
        <h3 style="margin-top: 0; color: #333;">What to Expect</h3>
        <ul style="padding-left: 20px;">
          ${preferences?.product_updates ? '<li>✨ New product updates and gift ideas</li>' : ''}
          ${preferences?.promotions ? '<li>🎯 Exclusive promotions and discounts</li>' : ''}
          <li>🎁 Curated gift recommendations for special occasions</li>
          <li>🌟 Early access to sales and special events</li>
          <li>💝 Personalized gift suggestions based on your interests</li>
        </ul>
      </div>
      
      <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
        <p style="margin: 0; color: #155724;"><strong>Your Privacy Matters:</strong></p>
        <p style="margin: 10px 0 0 0; color: #155724;">We respect your privacy and will never share your email with third parties. You can update your preferences or unsubscribe at any time.</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL}/products" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Start Shopping</a>
      </div>
      
      <p>Keep an eye on your inbox for amazing deals and gift ideas!</p>
      
      <p>Happy shopping!<br>The ${process.env.COMPANY_NAME || 'Simri'} Team</p>
      
      <div style="text-align: center; margin: 30px 0; padding-top: 20px; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
          Don't want to receive these emails? 
          <a href="${unsubscribeUrl}" style="color: #667eea; text-decoration: none;">Unsubscribe here</a>
        </p>
      </div>
      ${this.getEmailFooter()}
    `;

    return this.sendEmail(email, `Welcome to ${process.env.COMPANY_NAME || 'Simri'} Newsletter! 🎁`, html);
  }

  // Low stock alert email (for admin)
  async sendLowStockAlert(productName: string, currentStock: number, adminEmail: string): Promise<{ success: boolean; error?: string }> {
    const html = `
      ${this.getEmailHeader()}
      <h2 style="color: #dc3545; margin-bottom: 20px;">⚠️ Low Stock Alert</h2>
      
      <p>Hello Admin,</p>
      
      <p>This is an automated notification that one of your products is running low on inventory.</p>
      
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #dc3545;">
        <h3 style="margin-top: 0; color: #333;">Product Details</h3>
        <p><strong>Product:</strong> ${productName}</p>
        <p><strong>Current Stock:</strong> <span style="color: #dc3545; font-weight: bold;">${currentStock} units</span></p>
        <p><strong>Alert Threshold:</strong> 5 units</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL}/admin/products" style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Update Inventory</a>
      </div>
      
      <p>Please restock this product to avoid running out of inventory.</p>
      
      <p>Best regards,<br>Your Inventory System</p>
      ${this.getEmailFooter()}
    `;

    return this.sendEmail(adminEmail, `Low Stock Alert: ${productName}`, html);
  }
}

export const emailService = new EmailService();