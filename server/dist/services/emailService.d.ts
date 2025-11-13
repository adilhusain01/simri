import { Order, User } from '../types';
declare class EmailService {
    private transporter;
    constructor();
    sendEmail(to: string, subject: string, html: string, text?: string): Promise<{
        success: boolean;
        messageId: any;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        messageId?: undefined;
    }>;
    private htmlToText;
    private getEmailHeader;
    private getEmailFooter;
    sendWelcomeEmail(user: User): Promise<{
        success: boolean;
        error?: string;
    }>;
    sendOrderConfirmationEmail(order: Order, user: User): Promise<{
        success: boolean;
        error?: string;
    }>;
    sendShippingNotificationEmail(order: Order, user: User): Promise<{
        success: boolean;
        error?: string;
    }>;
    sendOrderCancellationEmail(order: Order, user: User): Promise<{
        success: boolean;
        error?: string;
    }>;
    sendEmailVerification(user: User, verificationToken: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    sendPasswordResetEmail(user: User, resetToken: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    sendNewsletterConfirmationEmail(email: string, name?: string, preferences?: any): Promise<{
        success: boolean;
        error?: string;
    }>;
    sendLowStockAlert(productName: string, currentStock: number, adminEmail: string): Promise<{
        success: boolean;
        error?: string;
    }>;
}
export declare const emailService: EmailService;
export {};
