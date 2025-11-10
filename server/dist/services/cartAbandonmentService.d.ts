interface AbandonedCart {
    id: string;
    user_id: string;
    user_email: string;
    user_name: string;
    total_items: number;
    total_value: number;
    last_activity: Date;
    reminder_count: number;
    items: Array<{
        product_id: string;
        product_name: string;
        product_image: string;
        quantity: number;
        price: number;
    }>;
}
interface CartAnalytics {
    total_abandoned_carts: number;
    recovered_carts: number;
    recovery_rate: number;
    average_abandoned_value: number;
    total_lost_revenue: number;
    daily_abandonment: Array<{
        date: string;
        abandoned_count: number;
        recovered_count: number;
        total_value: number;
    }>;
}
declare class CartAbandonmentService {
    private readonly ABANDONMENT_THRESHOLD_HOURS;
    private readonly MAX_REMINDERS;
    private readonly REMINDER_INTERVALS;
    /**
     * Track cart activity (called when user adds/updates cart)
     */
    trackCartActivity(userId: string): Promise<void>;
    /**
     * Mark cart as abandoned (called by scheduled job)
     */
    markAbandonedCarts(): Promise<number>;
    /**
     * Get abandoned carts eligible for reminders
     */
    getAbandonedCartsForReminders(): Promise<AbandonedCart[]>;
    /**
     * Send cart abandonment reminder email
     */
    sendAbandonmentReminder(abandonedCart: AbandonedCart): Promise<boolean>;
    /**
     * Mark cart as recovered (called when user completes purchase)
     */
    markCartRecovered(userId: string): Promise<void>;
    /**
     * Get cart abandonment analytics
     */
    getAbandonmentAnalytics(days?: number): Promise<CartAnalytics>;
    /**
     * Process abandonment reminders (called by scheduled job)
     */
    processAbandonmentReminders(): Promise<{
        sent: number;
        failed: number;
    }>;
    /**
     * Clean up old abandonment records
     */
    cleanupOldRecords(daysToKeep?: number): Promise<number>;
    /**
     * Generate reminder email content based on reminder count
     */
    private generateReminderEmail;
    /**
     * Get reminder type based on count
     */
    private getReminderType;
    /**
     * Create discount code for abandonment recovery
     */
    private createReminderDiscount;
}
export declare const cartAbandonmentService: CartAbandonmentService;
export {};
