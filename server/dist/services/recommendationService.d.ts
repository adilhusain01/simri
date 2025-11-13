interface ProductRecommendation {
    id: string;
    name: string;
    price: number;
    discount_price?: number;
    images: string;
    category_id: string;
    category_name?: string;
    average_rating: number;
    total_reviews: number;
    score: number;
}
declare class RecommendationService {
    /**
     * Get related products based on category and tags
     */
    getRelatedProducts(productId: string, limit?: number): Promise<ProductRecommendation[]>;
    /**
     * Get "Customers Also Bought" recommendations
     */
    getCustomersAlsoBought(productId: string, limit?: number): Promise<ProductRecommendation[]>;
    /**
     * Get personalized recommendations for a user
     */
    getPersonalizedRecommendations(userId: string, limit?: number): Promise<ProductRecommendation[]>;
    /**
     * Get trending products (popular items)
     */
    getTrendingProducts(limit?: number): Promise<ProductRecommendation[]>;
    /**
     * Update purchase patterns (to be called after order completion)
     */
    updatePurchasePatterns(orderId: string): Promise<void>;
    /**
     * Get recommendation analytics for admin
     */
    getRecommendationAnalytics(): Promise<any>;
}
export declare const recommendationService: RecommendationService;
export {};
