import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config();
import {RedisStore} from 'connect-redis';

import redisClient from './config/redis';
import './config/passport';
import passport from 'passport';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import cartRoutes from './routes/cart';
import orderRoutes from './routes/orders';
import paymentRoutes from './routes/payments';
import adminRoutes from './routes/admin';
import reviewRoutes from './routes/reviews';
import uploadRoutes from './routes/upload';
import inventoryRoutes from './routes/inventory';
import couponRoutes from './routes/coupons';
import wishlistRoutes from './routes/wishlist';
import profileRoutes from './routes/profile';
import addressRoutes from './routes/addresses';
import newsletterRoutes from './routes/newsletter';
import recommendationRoutes from './routes/recommendations';
import cartAbandonmentRoutes from './routes/cartAbandonment';
import path from 'path';
import { inventoryService } from './services/inventoryService';
import { authService } from './services/authService';
import { scheduledJobsService } from './services/scheduledJobsService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Trust proxy for deployment behind reverse proxy (AWS ALB, CloudFront, etc.)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'https://simri-beta.adilhusain.xyz', // Production frontend
    'https://simri-dashboard.adilhusain.xyz', // Production dashboard
    'http://localhost:3001', // Dashboard
    'http://localhost:3002', // Dashboard fallback
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));

// Session configuration with Redis
app.use(session({
  store: new RedisStore({
    client: redisClient,
    prefix: 'simri:',
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  name: 'simri.sid', // Custom session name
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/cart-abandonment', cartAbandonmentRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Initialize services
async function initializeServices() {
  try {
    // Connect to Redis
    await redisClient.connect();
    
    // Initialize inventory management tables
    await inventoryService.initializeTables();
    
    // Initialize auth service tables
    await authService.initializePasswordResetTable();
    
    // Start periodic cleanup of expired reservations
    inventoryService.startPeriodicCleanup();
    
    // Start periodic cleanup of expired tokens
    authService.startPeriodicTokenCleanup();
    
    // Start scheduled jobs for cart abandonment and other automation
    scheduledJobsService.startAllJobs();
    
    console.log('✅ All services initialized successfully');
  } catch (error) {
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

export default app;