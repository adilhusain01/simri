"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_session_1 = __importDefault(require("express-session"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const connect_redis_1 = require("connect-redis");
const redis_1 = __importDefault(require("./config/redis"));
require("./config/passport");
const passport_1 = __importDefault(require("passport"));
const errorHandler_1 = require("./middleware/errorHandler");
const notFound_1 = require("./middleware/notFound");
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const cart_1 = __importDefault(require("./routes/cart"));
const orders_1 = __importDefault(require("./routes/orders"));
const payments_1 = __importDefault(require("./routes/payments"));
const admin_1 = __importDefault(require("./routes/admin"));
const reviews_1 = __importDefault(require("./routes/reviews"));
const upload_1 = __importDefault(require("./routes/upload"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const coupons_1 = __importDefault(require("./routes/coupons"));
const wishlist_1 = __importDefault(require("./routes/wishlist"));
const profile_1 = __importDefault(require("./routes/profile"));
const addresses_1 = __importDefault(require("./routes/addresses"));
const newsletter_1 = __importDefault(require("./routes/newsletter"));
const recommendations_1 = __importDefault(require("./routes/recommendations"));
const cartAbandonment_1 = __importDefault(require("./routes/cartAbandonment"));
const path_1 = __importDefault(require("path"));
const inventoryService_1 = require("./services/inventoryService");
const authService_1 = require("./services/authService");
const scheduledJobsService_1 = require("./services/scheduledJobsService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8000;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: [
        process.env.CLIENT_URL || 'http://localhost:3000',
        'http://localhost:3001', // Dashboard
        'http://localhost:3002', // Dashboard fallback
    ],
    credentials: true
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Logging
app.use((0, morgan_1.default)('combined'));
// Session configuration with Redis
app.use((0, express_session_1.default)({
    store: new connect_redis_1.RedisStore({
        client: redis_1.default,
        prefix: 'simri:',
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
// Passport middleware
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Static file serving for uploads
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/products', products_1.default);
app.use('/api/cart', cart_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/reviews', reviews_1.default);
app.use('/api/upload', upload_1.default);
app.use('/api/inventory', inventory_1.default);
app.use('/api/coupons', coupons_1.default);
app.use('/api/wishlist', wishlist_1.default);
app.use('/api/profile', profile_1.default);
app.use('/api/addresses', addresses_1.default);
app.use('/api/newsletter', newsletter_1.default);
app.use('/api/recommendations', recommendations_1.default);
app.use('/api/cart-abandonment', cartAbandonment_1.default);
// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use(notFound_1.notFound);
app.use(errorHandler_1.errorHandler);
// Initialize services
async function initializeServices() {
    try {
        // Connect to Redis
        await redis_1.default.connect();
        // Initialize inventory management tables
        await inventoryService_1.inventoryService.initializeTables();
        // Initialize auth service tables
        await authService_1.authService.initializePasswordResetTable();
        // Start periodic cleanup of expired reservations
        inventoryService_1.inventoryService.startPeriodicCleanup();
        // Start periodic cleanup of expired tokens
        authService_1.authService.startPeriodicTokenCleanup();
        // Start scheduled jobs for cart abandonment and other automation
        scheduledJobsService_1.scheduledJobsService.startAllJobs();
        console.log('✅ All services initialized successfully');
    }
    catch (error) {
        console.error('❌ Service initialization error:', error);
    }
}
initializeServices();
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Database UI: http://localhost:8080`);
    console.log(`📁 File uploads: http://localhost:${PORT}/uploads`);
});
exports.default = app;
//# sourceMappingURL=index.js.map