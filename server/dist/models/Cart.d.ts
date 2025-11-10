import { Cart, CartItem } from '../types';
export declare class CartModel {
    static findByUserId(userId: string): Promise<Cart | null>;
    static findBySessionId(sessionId: string): Promise<Cart | null>;
    static create(cartData: Partial<Cart>): Promise<Cart>;
    static getOrCreateUserCart(userId: string): Promise<Cart>;
    static getOrCreateSessionCart(sessionId: string): Promise<Cart>;
}
export declare class CartItemModel {
    static findByCartId(cartId: string): Promise<CartItem[]>;
    static findByCartAndProduct(cartId: string, productId: string): Promise<CartItem | null>;
    static addItem(cartId: string, productId: string, quantity: number, price: number): Promise<CartItem>;
    static updateQuantity(id: string, quantity: number): Promise<CartItem | null>;
    static removeItem(id: string): Promise<boolean>;
    static clearCart(cartId: string): Promise<boolean>;
}
