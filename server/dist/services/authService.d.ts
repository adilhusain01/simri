interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    password_hash?: string;
    google_id?: string;
    avatar_url?: string;
    role: string;
    auth_provider: 'local' | 'google';
    is_verified: boolean;
    email_verified_at?: Date;
    last_login_at?: Date;
    created_at: Date;
    updated_at: Date;
}
declare class AuthService {
    private readonly TOKEN_EXPIRY_HOURS;
    private readonly EMAIL_VERIFY_EXPIRY_HOURS;
    registerUser(userData: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        password: string;
    }): Promise<{
        success: boolean;
        message: string;
        user?: User;
    }>;
    loginUser(email: string, password: string): Promise<{
        success: boolean;
        message: string;
        user?: User;
    }>;
    createOrUpdateGoogleUser(profile: any): Promise<User>;
    verifyEmail(token: string): Promise<{
        success: boolean;
        message: string;
    }>;
    initializePasswordResetTable(): Promise<void>;
    generatePasswordResetToken(email: string): Promise<{
        success: boolean;
        message: string;
    }>;
    verifyPasswordResetToken(token: string): Promise<{
        valid: boolean;
        user?: any;
        message?: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        success: boolean;
        message: string;
    }>;
    cleanupExpiredTokens(): Promise<number>;
    getRecentResetAttempts(email: string): Promise<number>;
    validatePasswordStrength(password: string): {
        valid: boolean;
        errors: string[];
        score: number;
    };
    startPeriodicTokenCleanup(): void;
}
export declare const authService: AuthService;
export {};
