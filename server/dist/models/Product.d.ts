import { Product } from '../types';
export declare class ProductModel {
    static findAll(limit?: number, offset?: number): Promise<Product[]>;
    static findById(id: string): Promise<Product | null>;
    static findBySlug(slug: string): Promise<Product | null>;
    static search(query: string, filters?: any, limit?: number, offset?: number): Promise<Product[]>;
    static findFeatured(limit?: number): Promise<Product[]>;
    static findByCategory(categoryId: string, limit?: number, offset?: number): Promise<Product[]>;
    static create(productData: Partial<Product>): Promise<Product>;
    static updateStock(id: string, quantity: number, orderId?: string): Promise<Product | null>;
    static update(id: string, productData: Partial<Product>): Promise<Product | null>;
    static delete(id: string): Promise<boolean>;
    static searchAdvanced(query: string, filters?: any, sortBy?: string, limit?: number, offset?: number): Promise<{
        items: Product[];
        total: number;
        availableFilters: any;
    }>;
    static getAvailableFilters(): Promise<any>;
}
