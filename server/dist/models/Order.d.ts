import { Order, OrderItem } from '../types';
export declare class OrderModel {
    static findByUserId(userId: string, limit?: number, offset?: number, sortBy?: string, sortOrder?: string): Promise<Order[]>;
    static findById(id: string): Promise<Order | null>;
    static findByOrderNumber(orderNumber: string): Promise<Order | null>;
    static create(orderData: Partial<Order>): Promise<Order>;
    static updateStatus(id: string, status: Order['status']): Promise<Order | null>;
    static updatePaymentStatus(id: string, paymentStatus: Order['payment_status'], paymentId?: string): Promise<Order | null>;
    static updateRazorpayOrderId(id: string, razorpayOrderId: string): Promise<Order | null>;
    static updatePaymentComplete(id: string, paymentStatus: Order['payment_status'], razorpayPaymentId: string): Promise<Order | null>;
    static updateShippingStatus(id: string, shippingStatus: Order['shipping_status'], trackingNumber?: string): Promise<Order | null>;
    static updateShiprocketInfo(id: string, shiprocketOrderId: string, shiprocketShipmentId?: string, awbNumber?: string, courierName?: string): Promise<Order | null>;
    static updateCancellation(id: string, cancellationReason: string, refundAmount?: number, refundStatus?: Order['refund_status']): Promise<Order | null>;
    static updateRefundStatus(id: string, refundStatus: Order['refund_status']): Promise<Order | null>;
    static initiateReturn(id: string, returnId: string, cancellationReason: string): Promise<Order | null>;
    static updateReturnStatus(id: string, returnStatus: string, returnAwb?: string, returnCourier?: string): Promise<Order | null>;
    static generateOrderNumber(): Promise<string>;
}
export declare class OrderItemModel {
    static findByOrderId(orderId: string): Promise<OrderItem[]>;
    static create(orderItemData: Partial<OrderItem>): Promise<OrderItem>;
}
