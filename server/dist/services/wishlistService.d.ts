import { Product } from '../types';
interface WishlistItem {
    id: string;
    user_id: string;
    product_id: string;
    created_at: Date;
    product?: Product;
}
interface WishlistResponse {
    items: WishlistItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
declare class WishlistService {
    addToWishlist(userId: string, productId: string): Promise<{
        success: boolean;
        message?: string;
        item?: WishlistItem;
    }>;
    removeFromWishlist(userId: string, productId: string): Promise<{
        success: boolean;
        message?: string;
    }>;
    getUserWishlist(userId: string, page?: number, limit?: number): Promise<WishlistResponse>;
    isInWishlist(userId: string, productId: string): Promise<boolean>;
    getWishlistCount(userId: string): Promise<number>;
    clearWishlist(userId: string): Promise<{
        success: boolean;
        message?: string;
        deletedCount?: number;
    }>;
    moveItemToCart(userId: string, itemId: string, quantity?: number): Promise<{
        success: boolean;
        message?: string;
        cartItem?: any;
    }>;
    moveToCart(userId: string, productIds: string[]): Promise<{
        success: boolean;
        message?: string;
        movedCount?: number;
        errors?: string[];
    }>;
    getWishlistInsights(userId: string): Promise<any>;
}
export declare const wishlistService: WishlistService;
export {};
