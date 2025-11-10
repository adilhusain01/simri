import { User } from '../types';
export declare class UserModel {
    static findById(id: string): Promise<User | null>;
    static findByEmail(email: string): Promise<User | null>;
    static findByGoogleId(googleId: string): Promise<User | null>;
    static create(userData: Partial<User>): Promise<User>;
    static update(id: string, userData: Partial<User>): Promise<User | null>;
    static delete(id: string): Promise<boolean>;
}
