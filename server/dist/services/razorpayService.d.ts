export declare class RazorpayService {
    /**
     * Create a refund for a payment
     * @param paymentId - Razorpay payment ID
     * @param amount - Amount to refund in paisa (optional, defaults to full amount)
     * @param notes - Additional notes for the refund
     * @returns Razorpay refund object
     */
    createRefund(paymentId: string, amount?: number, notes?: Record<string, string>): Promise<import("razorpay/dist/types/refunds").Refunds.RazorpayRefund>;
    /**
     * Get refund details by refund ID
     * @param refundId - Razorpay refund ID
     * @returns Razorpay refund object
     */
    getRefund(refundId: string): Promise<import("razorpay/dist/types/refunds").Refunds.RazorpayRefund>;
    /**
     * Get all refunds for a payment
     * @param paymentId - Razorpay payment ID
     * @returns Array of refund objects
     */
    getRefundsForPayment(paymentId: string): Promise<{
        entity: string;
        count: number;
        items: Array<import("razorpay/dist/types/refunds").Refunds.RazorpayRefund>;
    }>;
    /**
     * Get payment details
     * @param paymentId - Razorpay payment ID
     * @returns Razorpay payment object
     */
    getPayment(paymentId: string): Promise<import("razorpay/dist/types/payments").Payments.RazorpayPayment>;
    /**
     * Process automatic refund for order cancellation
     * @param paymentId - Razorpay payment ID
     * @param orderId - Internal order ID for notes
     * @param reason - Reason for refund
     * @returns Refund result with status
     */
    processOrderCancellationRefund(paymentId: string, orderId: string, reason?: string): Promise<{
        success: boolean;
        refundId: string;
        amount: number | undefined;
        status: "pending" | "failed" | "processed";
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message: string;
        refundId?: undefined;
        amount?: undefined;
        status?: undefined;
    }>;
}
export declare const razorpayService: RazorpayService;
