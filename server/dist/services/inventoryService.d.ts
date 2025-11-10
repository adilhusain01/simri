interface InventoryUpdate {
    product_id: string;
    change_type: 'adjustment' | 'sale' | 'return' | 'restock';
    quantity_change: number;
    previous_quantity: number;
    new_quantity: number;
    notes?: string;
    user_id?: string;
    order_id?: string;
}
declare class InventoryService {
    private readonly LOW_STOCK_THRESHOLD;
    initializeTables(): Promise<void>;
    getAvailableStock(productId: string): Promise<number>;
    updateStock(productId: string, quantityChange: number, changeType?: 'adjustment' | 'sale' | 'return' | 'restock', options?: {
        notes?: string;
        userId?: string;
        orderId?: string;
    }): Promise<{
        success: boolean;
        newStock: number;
    }>;
    handleOrderCancellation(orderId: string): Promise<void>;
    getInventoryHistory(productId: string, limit?: number, offset?: number): Promise<InventoryUpdate[]>;
    getLowStockProducts(threshold?: number): Promise<any[]>;
    private sendLowStockAlert;
    getStockStatistics(): Promise<{
        totalProducts: number;
        inStock: number;
        lowStock: number;
        outOfStock: number;
        totalValue: number;
    }>;
    recordInventoryChange(data: {
        product_id: string;
        change_type: 'adjustment' | 'sale' | 'return' | 'restock';
        quantity_change: number;
        previous_quantity: number;
        new_quantity: number;
        notes?: string;
        user_id?: string;
        order_id?: string;
    }): Promise<void>;
    startPeriodicCleanup(): void;
    private cleanupOldInventoryHistory;
}
export declare const inventoryService: InventoryService;
export {};
