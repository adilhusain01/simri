interface Coupon {
    id: string;
    code: string;
    name: string;
    description?: string;
    type: 'percentage' | 'fixed';
    value: number;
    minimum_order_amount?: number;
    maximum_discount_amount?: number;
    usage_limit?: number;
    used_count: number;
    is_active: boolean;
    valid_from?: Date;
    valid_until?: Date;
    created_at: Date;
    updated_at: Date;
}
interface CouponValidationResult {
    isValid: boolean;
    coupon?: Coupon;
    discountAmount?: number;
    error?: string;
}
declare class CouponService {
    validateCoupon(code: string, orderAmount: number, userId?: string): Promise<CouponValidationResult>;
    applyCoupon(couponId: string, orderId: string, userId: string, discountAmount: number): Promise<boolean>;
    getActiveCoupons(isPublic?: boolean): Promise<Coupon[]>;
    createCoupon(couponData: Partial<Coupon>, _adminId: string): Promise<{
        success: boolean;
        coupon?: Coupon;
        error?: string;
    }>;
    updateCoupon(couponId: string, updateData: Partial<Coupon>): Promise<{
        success: boolean;
        coupon?: Coupon;
        error?: string;
    }>;
    deleteCoupon(couponId: string, hardDelete?: boolean): Promise<boolean>;
    getOverallCouponStats(): Promise<any>;
    getCouponStats(couponId: string): Promise<any>;
    getBestCouponForOrder(orderAmount: number, userId?: string): Promise<{
        coupon?: Coupon;
        discountAmount?: number;
    }>;
}
export declare const couponService: CouponService;
export {};
