# Simri E-Commerce Backend

A complete gift selling e-commerce backend built with Node.js, TypeScript, Express.js, PostgreSQL, Redis, and integrated with Razorpay payments and Shiprocket delivery.

## 🚀 Features

- **Authentication**: Google OAuth integration
- **Database**: PostgreSQL with Docker setup
- **Caching**: Redis for sessions and caching
- **Payments**: Razorpay integration with signature verification
- **Shipping**: Shiprocket API integration for delivery tracking
- **Security**: Helmet, CORS, rate limiting, input validation
- **Architecture**: Clean architecture with models, controllers, middleware

## 🛠️ Tech Stack

- **Backend**: Node.js, TypeScript, Express.js
- **Database**: PostgreSQL 15 with UUID support
- **Caching**: Redis 7
- **Authentication**: Passport.js with Google OAuth 2.0
- **Payments**: Razorpay
- **Shipping**: Shiprocket API
- **Validation**: Express Validator
- **Development**: ts-node-dev, Docker Compose

## 📋 Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- Google OAuth credentials
- Razorpay account (for payments)
- Shiprocket account (for delivery)

## 🔧 Installation & Setup

### 1. Clone and Install Dependencies

```bash
cd server
npm install
```

### 2. Environment Configuration

Copy the environment file and configure your credentials:

```bash
cp .env.example .env
```

Update the `.env` file with your credentials:

```env
# Server Configuration
NODE_ENV=development
PORT=8000
CLIENT_URL=http://localhost:3000

# Session Secret
SESSION_SECRET=your-super-secret-session-key

# Database Configuration
DATABASE_URL=postgresql://simri_user:simri_password@localhost:5432/simri
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=simri
POSTGRES_USER=simri_user
POSTGRES_PASSWORD=simri_password

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Razorpay Configuration
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Shiprocket Configuration
SHIPROCKET_EMAIL=your-shiprocket-email
SHIPROCKET_PASSWORD=your-shiprocket-password

# JWT Configuration
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d
```

### 3. Start Docker Services

```bash
# From the project root directory
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- Adminer (Database UI) on port 8080

### 4. Seed the Database

```bash
npm run seed
```

### 5. Start the Development Server

```bash
npm run dev
```

The server will be available at: `http://localhost:8000`

## 📚 API Documentation

### Base URL
```
http://localhost:8000/api
```

### Health Check
```
GET /health
```

### Authentication Routes

#### Google OAuth Login
```
GET /api/auth/google
```

#### Google OAuth Callback
```
GET /api/auth/google/callback
```

#### Get Current User
```
GET /api/auth/me
```

#### Logout
```
POST /api/auth/logout
```

### Product Routes

#### Get All Products
```
GET /api/products?limit=20&offset=0
```

#### Get Featured Products
```
GET /api/products/featured?limit=10
```

#### Search Products
```
GET /api/products/search?q=frame&minPrice=100&maxPrice=1000
```

#### Get Products by Category
```
GET /api/products/category/:categoryId?limit=20&offset=0
```

#### Get Product by ID/Slug
```
GET /api/products/:identifier
```

### Cart Routes (Guest + Authenticated)

#### Get Cart
```
GET /api/cart
```

#### Add to Cart
```
POST /api/cart/add
Content-Type: application/json

{
  "productId": "uuid",
  "quantity": 1
}
```

#### Update Cart Item
```
PUT /api/cart/update/:itemId
Content-Type: application/json

{
  "quantity": 2
}
```

#### Remove Cart Item
```
DELETE /api/cart/remove/:itemId
```

#### Clear Cart
```
DELETE /api/cart/clear
```

### Order Routes (Authenticated Required)

#### Get User Orders
```
GET /api/orders?limit=10&offset=0
```

#### Get Order Details
```
GET /api/orders/:orderId
```

#### Create Order
```
POST /api/orders/create
Content-Type: application/json

{
  "shipping_address": {
    "first_name": "John",
    "last_name": "Doe",
    "address_line_1": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postal_code": "400001",
    "country": "India",
    "phone": "9876543210"
  },
  "billing_address": { /* same as shipping */ },
  "payment_method": "razorpay"
}
```

#### Update Order Status (Admin Only)
```
PUT /api/orders/:orderId/status
Content-Type: application/json

{
  "status": "confirmed"
}
```

#### Update Shipping Status (Admin Only)
```
PUT /api/orders/:orderId/shipping
Content-Type: application/json

{
  "shipping_status": "shipped",
  "tracking_number": "TR123456789"
}
```

### Payment Routes (Authenticated Required)

#### Create Razorpay Order
```
POST /api/payments/create-order
Content-Type: application/json

{
  "order_id": "uuid"
}
```

#### Verify Payment
```
POST /api/payments/verify
Content-Type: application/json

{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx",
  "order_id": "uuid"
}
```

#### Get Payment Status
```
GET /api/payments/status/:paymentId
```

#### Razorpay Webhook
```
POST /api/payments/webhook
```

## 🗄️ Database Schema

The application uses a comprehensive e-commerce database schema with the following main tables:

- **users**: User accounts with Google OAuth support
- **categories**: Product categories with hierarchical support
- **products**: Product catalog with full details
- **carts**: Shopping carts for users and guests
- **cart_items**: Items in shopping carts
- **orders**: Order management with status tracking
- **order_items**: Individual items in orders
- **addresses**: User addresses for shipping/billing
- **reviews**: Product reviews and ratings
- **coupons**: Discount coupons system
- **wishlists**: User wishlists

## 🔐 Authentication Flow

1. User clicks "Login with Google"
2. Redirected to Google OAuth consent screen
3. User grants permissions
4. Google redirects back with authorization code
5. Server exchanges code for user profile
6. User is created/logged in and session is established
7. Subsequent requests use session authentication

## 💳 Payment Flow

1. User creates an order (status: pending, payment_status: pending)
2. Frontend calls `/api/payments/create-order` with order ID
3. Razorpay order is created and linked to our order
4. Frontend integrates Razorpay checkout
5. After payment, frontend calls `/api/payments/verify`
6. Server verifies signature and updates order status
7. Order status becomes 'confirmed' and payment_status becomes 'paid'

## 🚚 Shipping Integration

The application integrates with Shiprocket API for:
- Creating shipping orders
- Generating AWB numbers
- Tracking shipments
- Managing manifests and labels
- Real-time delivery updates

## 🛡️ Security Features

- **Helmet**: Security headers
- **CORS**: Configured for frontend domain
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Express Validator on all inputs
- **Session Security**: Redis-backed sessions
- **SQL Injection Protection**: Parameterized queries
- **Payment Security**: Signature verification for Razorpay

## 📊 Development Tools

### Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run seed       # Seed database with sample data
```

### Database Management

- **Adminer**: Available at `http://localhost:8080`
  - Server: `postgres` (or `localhost`)
  - Username: `simri_user`
  - Password: `simri_password`
  - Database: `simri`

### Seeded Data

The seeder creates:
- 5 product categories
- 5 sample products
- 1 test user account

## 🚀 Production Deployment

1. Set `NODE_ENV=production` in environment
2. Use production database and Redis instances
3. Configure proper session secrets and JWT keys
4. Set up SSL certificates
5. Configure rate limiting and CORS for production domains
6. Set up proper logging and monitoring

## 🔧 Error Handling

The application includes comprehensive error handling:
- Global error middleware
- Async error catching
- Detailed error logging
- User-friendly error responses
- Database transaction rollbacks

## 📝 API Response Format

All API endpoints follow a consistent response format:

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional success message"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ /* validation errors if applicable */ ]
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.