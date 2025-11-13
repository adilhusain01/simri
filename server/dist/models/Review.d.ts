import { Review } from '../types';
export declare class ReviewModel {
    static findByProductId(productId: string, limit?: number, offset?: number): Promise<Review[]>;
    static findByUserId(userId: string, limit?: number, offset?: number): Promise<Review[]>;
    static findById(id: string): Promise<Review | null>;
    static create(reviewData: Partial<Review>): Promise<Review>;
    static update(id: string, reviewData: Partial<Review>): Promise<Review | null>;
    static delete(id: string): Promise<boolean>;
    static getProductRatingStats(productId: string): Promise<{
        averageRating: number;
        totalReviews: number;
        ratingDistribution: {
            [key: number]: number;
        };
    }>;
    static checkUserCanReview(userId: string, productId: string): Promise<{
        canReview: boolean;
        reason?: string;
        isVerifiedPurchase: boolean;
    }>;
    static incrementHelpfulCount(id: string): Promise<Review | null>;
    static updateProductReviewSummary(productId: string): Promise<void>;
}
