"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.razorpayService = exports.RazorpayService = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});
class RazorpayService {
    /**
     * Create a refund for a payment
     * @param paymentId - Razorpay payment ID
     * @param amount - Amount to refund in paisa (optional, defaults to full amount)
     * @param notes - Additional notes for the refund
     * @returns Razorpay refund object
     */
    async createRefund(paymentId, amount, notes) {
        try {
            const refundData = {};
            // If amount is specified, add it to refund data
            if (amount) {
                refundData.amount = amount;
            }
            // If notes are provided, add them to refund data
            if (notes && Object.keys(notes).length > 0) {
                refundData.notes = notes;
            }
            // console.log('Creating refund with data:', {
            //   paymentId,
            //   refundData: JSON.stringify(refundData)
            // });
            const refund = await razorpay.payments.refund(paymentId, refundData);
            // console.log('Refund created successfully:', {
            //   refundId: refund.id,
            //   paymentId: refund.payment_id,
            //   amount: refund.amount,
            //   status: refund.status
            // });
            return refund;
        }
        catch (error) {
            console.error('Razorpay refund error:', error);
            // console.error('Error details:', {
            //   paymentId,
            //   refundData: {
            //     amount,
            //     notes
            //   },
            //   errorType: typeof error,
            //   errorMessage: error instanceof Error ? error.message : 'Unknown error'
            // });
            throw new Error(`Failed to create refund: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get refund details by refund ID
     * @param refundId - Razorpay refund ID
     * @returns Razorpay refund object
     */
    async getRefund(refundId) {
        try {
            const refund = await razorpay.refunds.fetch(refundId);
            return refund;
        }
        catch (error) {
            console.error('Failed to fetch refund:', error);
            throw new Error(`Failed to fetch refund: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get all refunds for a payment
     * @param paymentId - Razorpay payment ID
     * @returns Array of refund objects
     */
    async getRefundsForPayment(paymentId) {
        try {
            const refunds = await razorpay.payments.fetchMultipleRefund(paymentId);
            return refunds;
        }
        catch (error) {
            console.error('Failed to fetch refunds for payment:', error);
            throw new Error(`Failed to fetch refunds: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get payment details
     * @param paymentId - Razorpay payment ID
     * @returns Razorpay payment object
     */
    async getPayment(paymentId) {
        try {
            const payment = await razorpay.payments.fetch(paymentId);
            return payment;
        }
        catch (error) {
            console.error('Failed to fetch payment:', error);
            throw new Error(`Failed to fetch payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Process automatic refund for order cancellation
     * @param paymentId - Razorpay payment ID
     * @param orderId - Internal order ID for notes
     * @param reason - Reason for refund
     * @returns Refund result with status
     */
    async processOrderCancellationRefund(paymentId, orderId, reason = 'Order cancelled') {
        try {
            // First get payment details to check status and amount
            const payment = await this.getPayment(paymentId);
            if (payment.status !== 'captured') {
                throw new Error(`Cannot refund payment with status: ${payment.status}`);
            }
            // Check if payment has already been fully refunded
            const existingRefunds = await this.getRefundsForPayment(paymentId);
            const totalRefunded = existingRefunds.items.reduce((sum, refund) => sum + Number(refund.amount), 0);
            if (totalRefunded >= Number(payment.amount)) {
                throw new Error(`Cannot refund payment with status: refunded`);
            }
            // Create full refund with order cancellation notes
            const refund = await this.createRefund(paymentId, undefined, {
                order_id: orderId,
                reason: reason,
                refund_type: 'order_cancellation',
                processed_at: new Date().toISOString()
            });
            return {
                success: true,
                refundId: refund.id,
                amount: refund.amount,
                status: refund.status,
                message: 'Refund processed successfully'
            };
        }
        catch (error) {
            console.error('Order cancellation refund failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                message: 'Failed to process refund'
            };
        }
    }
}
exports.RazorpayService = RazorpayService;
exports.razorpayService = new RazorpayService();
//# sourceMappingURL=razorpayService.js.map