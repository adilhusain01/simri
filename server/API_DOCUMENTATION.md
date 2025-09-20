# Simri E-commerce API Documentation

## Overview
This document provides comprehensive documentation for the Simri e-commerce backend API. The API is built with Express.js, TypeScript, and PostgreSQL with advanced features for gift selling e-commerce.

**Base URL:** `http://localhost:8000`

## ✨ New Features Added
- 💳 **Coupon & Discount System** - Dynamic promotional campaigns
- ❤️ **Wishlist Management** - Save and manage favorite products  
- 🔍 **Advanced Search** - Smart product discovery with filters
- 👤 **User Profiles** - Complete profile and preference management
- 📍 **Address Book** - Multiple shipping/billing addresses
- 🔐 **Password Reset** - Secure password recovery system
- 💰 **Tax Calculation** - Indian GST compliance
- 📧 **Newsletter** - Subscription and marketing management
- 🤖 **Product Recommendations** - AI-powered product suggestions
- 🛒 **Cart Abandonment Recovery** - Automated email campaigns

## Authentication
Most endpoints require authentication. The API supports dual authentication methods:

1. **Email/Password Authentication** - Local user registration and login
2. **Google OAuth** - Social login integration

### Authentication Methods
- **Session-based**: Uses Express sessions with Redis storage
- **Cookie Authentication**: Session ID stored in HTTP-only cookies
- **Dual Provider Support**: Users can authenticate via email/password or Google OAuth

### Authentication Headers
```
Cookie: connect.sid=<session-id>
```

### Database Schema
- Users table supports both authentication providers
- Email verification system for local accounts
- Password reset functionality with secure tokens
- Constraint validation for authentication providers

## Core Endpoints

### Health Check
- **GET** `/health`
- **Description:** Check server status
- **Auth:** Not required
- **Response:**

```json
{
  "status": "OK",
  "timestamp": "2025-09-12T16:50:57.800Z"
}
```

---

## Authentication Routes (`/api/auth`)

### Email/Password Registration
- **POST** `/api/auth/register`
- **Description:** Register new user with email and password
- **Auth:** Not required
- **Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123!"
}
```

- **Response:**

```json
{
  "success": true,
  "message": "User registered successfully. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "customer",
      "isVerified": false,
      "createdAt": "2025-09-13T08:50:00.000Z"
    }
  }
}
```

### Email/Password Login
- **POST** `/api/auth/login`
- **Description:** Login with email and password
- **Auth:** Not required
- **Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

- **Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "customer",
      "isVerified": true,
      "createdAt": "2025-09-13T08:50:00.000Z"
    }
  }
}
```

### Google OAuth Login
- **GET** `/api/auth/google`
- **Description:** Initiate Google OAuth login
- **Auth:** Not required

### Google OAuth Callback
- **GET** `/api/auth/google/callback`
- **Description:** Handle Google OAuth callback (browser redirect)
- **Auth:** Not required

### Google OAuth Callback (API)
- **POST** `/api/auth/google/callback`
- **Description:** Handle Google OAuth callback for frontend
- **Auth:** Not required
- **Body:**
```json
{
  "code": "google_auth_code",
  "state": "optional_state"
}
```

### Email Verification
- **GET** `/api/auth/verify-email/:token`
- **Description:** Verify user email with token
- **Auth:** Not required
- **Parameters:**
  - `token` (URL param): Email verification token
- **Response:**

```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

### Logout
- **POST** `/api/auth/logout`
- **Description:** Logout current user
- **Auth:** Required

### Get Current User
- **GET** `/api/auth/me`
- **Description:** Get current authenticated user details
- **Auth:** Required
- **Response:**

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "role": "customer",
    "isVerified": true,
    "createdAt": "2025-09-13T08:50:00.000Z"
  }
}
```

---

## Product Routes (`/api/products`)

### Get All Products
- **GET** `/api/products`
- **Description:** Get paginated list of products with filters
- **Auth:** Not required
- **Query Parameters:**
  - `page` (number): Page number (default: 1)
  - `limit` (number): Items per page (default: 12)
  - `category` (string): Filter by category ID
  - `search` (string): Search by name/description
  - `sort` (string): Sort by price_asc, price_desc, name_asc, name_desc, newest
  - `min_price` (number): Minimum price filter
  - `max_price` (number): Maximum price filter

### Get Single Product
- **GET** `/api/products/:id`
- **Description:** Get product details by ID
- **Auth:** Not required

---

## Cart Routes (`/api/cart`)

### Get Cart
- **GET** `/api/cart`
- **Description:** Get current user's cart
- **Auth:** Required

### Add to Cart
- **POST** `/api/cart/add`
- **Description:** Add item to cart
- **Auth:** Required
- **Body:**
```json
{
  "productId": "uuid",
  "quantity": 1
}
```

### Update Cart Item
- **PUT** `/api/cart/update/:itemId`
- **Description:** Update cart item quantity
- **Auth:** Required
- **Body:**
```json
{
  "quantity": 2
}
```

### Remove from Cart
- **DELETE** `/api/cart/remove/:itemId`
- **Description:** Remove item from cart
- **Auth:** Required

### Clear Cart
- **DELETE** `/api/cart/clear`
- **Description:** Clear entire cart
- **Auth:** Required

---

## Order Routes (`/api/orders`)

### Create Order
- **POST** `/api/orders`
- **Description:** Create new order
- **Auth:** Required
- **Body:**
```json
{
  "shipping_address": {
    "first_name": "John",
    "last_name": "Doe",
    "address_line_1": "123 Main St",
    "address_line_2": "Apt 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postal_code": "400001",
    "country": "India",
    "phone": "+91-9876543210"
  },
  "payment_method": "razorpay"
}
```

### Get User Orders
- **GET** `/api/orders/user`
- **Description:** Get current user's orders
- **Auth:** Required

### Get Order Details
- **GET** `/api/orders/:id`
- **Description:** Get specific order details
- **Auth:** Required

### Cancel Order
- **PUT** `/api/orders/:id/cancel`
- **Description:** Cancel an order
- **Auth:** Required

---

## Payment Routes (`/api/payments`)

### Create Payment Intent
- **POST** `/api/payments/create-intent`
- **Description:** Create Razorpay payment intent
- **Auth:** Required
- **Body:**
```json
{
  "orderId": "uuid",
  "amount": 2500
}
```

### Verify Payment
- **POST** `/api/payments/verify`
- **Description:** Verify Razorpay payment signature and update order payment status
- **Auth:** Required
- **Body:**
```json
{
  "orderId": "uuid",
  "paymentId": "pay_razorpay_id", 
  "signature": "razorpay_signature"
}
```
- **Note:** Upon successful verification, updates both `payment_id` and `razorpay_payment_id` fields in the orders table

---

## Review Routes (`/api/reviews`)

### Get Product Reviews
- **GET** `/api/reviews/product/:productId`
- **Description:** Get reviews for a specific product
- **Auth:** Not required
- **Query Parameters:**
  - `page` (number): Page number (default: 1)
  - `limit` (number): Items per page (default: 10)
  - `sort` (string): Sort by newest, oldest, rating_high, rating_low

### Create Review
- **POST** `/api/reviews`
- **Description:** Create a new review (requires verified purchase)
- **Auth:** Required
- **Body:**
```json
{
  "productId": "uuid",
  "orderId": "uuid",
  "rating": 5,
  "title": "Great product!",
  "comment": "Really happy with this purchase",
  "images": ["image1.jpg", "image2.jpg"]
}
```

### Update Review
- **PUT** `/api/reviews/:id`
- **Description:** Update existing review
- **Auth:** Required (owner only)

### Delete Review
- **DELETE** `/api/reviews/:id`
- **Description:** Delete review
- **Auth:** Required (owner only)

### Get User Reviews
- **GET** `/api/reviews/user`
- **Description:** Get current user's reviews
- **Auth:** Required

---

## Upload Routes (`/api/upload`)

### Upload Product Images
- **POST** `/api/upload/product-images`
- **Description:** Upload product images (Admin only)
- **Auth:** Required (Admin)
- **Content-Type:** `multipart/form-data`
- **Body:** FormData with `images` field (up to 10 files)

### Upload Avatar
- **POST** `/api/upload/avatar`
- **Description:** Upload user avatar
- **Auth:** Required
- **Content-Type:** `multipart/form-data`
- **Body:** FormData with `avatar` field

### Upload Review Images
- **POST** `/api/upload/review-images`
- **Description:** Upload review images
- **Auth:** Required
- **Content-Type:** `multipart/form-data`
- **Body:** FormData with `images` field (up to 5 files)

### Validate File
- **POST** `/api/upload/validate`
- **Description:** Validate file before upload
- **Auth:** Required
- **Body:**
```json
{
  "fileName": "image.jpg",
  "fileSize": 1024000,
  "fileType": "image/jpeg"
}
```

### Delete File
- **DELETE** `/api/upload/file`
- **Description:** Delete uploaded file
- **Auth:** Required
- **Body:**
```json
{
  "filePath": "/uploads/products/image.jpg"
}
```

### Get File Info
- **GET** `/api/upload/file-info?filePath=/uploads/products/image.jpg`
- **Description:** Get file information
- **Auth:** Required

---

## Inventory Routes (`/api/inventory`)

### Get Available Stock
- **GET** `/api/inventory/available/:productId`
- **Description:** Get available stock for a product
- **Auth:** Not required

### Reserve Stock
- **POST** `/api/inventory/reserve`
- **Description:** Reserve stock during checkout
- **Auth:** Not required (uses session)
- **Body:**
```json
{
  "productId": "uuid",
  "quantity": 2
}
```

### Release Reservation
- **POST** `/api/inventory/release/:reservationId`
- **Description:** Release stock reservation
- **Auth:** Not required

---

## Coupon Routes (`/api/coupons`)

### Validate Coupon
- **POST** `/api/coupons/validate`
- **Description:** Validate coupon and calculate discount
- **Auth:** Optional (better validation with user context)
- **Body:**
```json
{
  "code": "WELCOME20",
  "orderAmount": 2500
}
```

### Get Best Coupon for Order
- **GET** `/api/coupons/best-for-order?orderAmount=2500`
- **Description:** Find best applicable coupon for order amount
- **Auth:** Optional

### Get Active Coupons
- **GET** `/api/coupons/active`
- **Description:** Get all active public coupons
- **Auth:** Not required

### Admin Coupon Management
- **GET** `/api/coupons/admin/all` - Get all coupons (Admin)
- **POST** `/api/coupons/admin/create` - Create new coupon (Admin)
- **PUT** `/api/coupons/admin/:id` - Update coupon (Admin)
- **DELETE** `/api/coupons/admin/:id` - Delete coupon (Admin)
- **GET** `/api/coupons/admin/:id/stats` - Get coupon statistics (Admin)

---

## Wishlist Routes (`/api/wishlist`)

### Get User Wishlist
- **GET** `/api/wishlist`
- **Description:** Get user's wishlist with pagination
- **Auth:** Required
- **Query Parameters:**
  - `page` (number): Page number (default: 1)
  - `limit` (number): Items per page (default: 20)

### Add to Wishlist
- **POST** `/api/wishlist/add`
- **Auth:** Required
- **Body:**
```json
{
  "productId": "uuid"
}
```

### Remove from Wishlist
- **DELETE** `/api/wishlist/remove/:productId`
- **Auth:** Required

### Toggle Wishlist
- **POST** `/api/wishlist/toggle`
- **Description:** Add if not present, remove if present
- **Auth:** Required

### Move to Cart

#### Move Single Item
- **POST** `/api/wishlist/move-to-cart/:itemId`
- **Auth:** Required
- **Description:** Move individual wishlist item to cart
- **Body:**
```json
{
  "quantity": 1
}
```

#### Move Multiple Items (Bulk)
- **POST** `/api/wishlist/move-to-cart`
- **Auth:** Required
- **Description:** Move multiple items from wishlist to cart
- **Body:**
```json
{
  "productIds": ["uuid1", "uuid2"]
}
```

### Wishlist Analytics
- **GET** `/api/wishlist/count` - Get wishlist item count
- **GET** `/api/wishlist/insights` - Get wishlist insights
- **GET** `/api/wishlist/check/:productId` - Check if product in wishlist

---

## User Profile Routes (`/api/profile`)

### Get User Profile
- **GET** `/api/profile`
- **Description:** Get complete user profile with statistics
- **Auth:** Required

### Update Profile
- **PUT** `/api/profile`
- **Auth:** Required
- **Body:**
```json
{
  "name": "Updated Name",
  "phone": "+91-9876543210",
  "date_of_birth": "1990-01-01",
  "gender": "male",
  "preferences": {
    "notifications": true,
    "newsletter": true
  }
}
```

### Change Password
- **PUT** `/api/profile/password`
- **Auth:** Required
- **Description:** Change user password (local accounts only)
- **Body:**
```json
{
  "currentPassword": "oldpass",
  "newPassword": "newpass123",
  "confirmPassword": "newpass123"
}
```
- **Note:** OAuth users (Google login) cannot change passwords and will receive an error

### Change Email
- **PUT** `/api/profile/email`
- **Auth:** Required
- **Body:**
```json
{
  "newEmail": "newemail@example.com",
  "password": "currentpass"
}
```

### User Activity
- **GET** `/api/profile/activity` - Get user activity history
- **POST** `/api/profile/avatar` - Update avatar
- **DELETE** `/api/profile/account` - Delete account

---

## Address Management (`/api/addresses`)

### Get All Addresses
- **GET** `/api/addresses`
- **Auth:** Required
- **Query Parameters:**
  - `type` (string): Filter by 'shipping' or 'billing'

### Create Address
- **POST** `/api/addresses`
- **Auth:** Required
- **Body:**
```json
{
  "type": "shipping",
  "first_name": "John",
  "last_name": "Doe",
  "address_line_1": "123 Main Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "postal_code": "400001",
  "country": "India",
  "phone": "+91-9876543210",
  "is_default": true
}
```

### Update Address
- **PUT** `/api/addresses/:id`
- **Auth:** Required

### Delete Address
- **DELETE** `/api/addresses/:id`
- **Auth:** Required

### Set Default Address
- **PUT** `/api/addresses/:id/default`
- **Auth:** Required

### Get Default Addresses
- **GET** `/api/addresses/default/:type?`
- **Auth:** Required

### Validate Address
- **POST** `/api/addresses/validate`
- **Auth:** Required
- **Body:**
```json
{
  "address": {
    "first_name": "John",
    "last_name": "Doe",
    "address_line_1": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postal_code": "400001",
    "country": "India"
  }
}
```

---

## Enhanced Authentication (`/api/auth`)

### Password Reset Request
- **POST** `/api/auth/forgot-password`
- **Auth:** Not required
- **Rate Limiting:** Maximum 3 requests per hour per email address
- **Body:**
```json
{
  "email": "user@example.com"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Password reset link has been sent to your email address."
}
```
- **Note:** Always returns success message for security (doesn't reveal if email exists)

### Verify Reset Token
- **GET** `/api/auth/reset-password/:token`
- **Description:** Verify if password reset token is valid
- **Auth:** Not required
- **Parameters:**
  - `token` (URL param): Password reset token
- **Response:**

```json
{
  "success": true,
  "message": "Valid reset token",
  "data": {
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Reset Password
- **POST** `/api/auth/reset-password`
- **Description:** Reset user password with valid token
- **Auth:** Not required
- **Token Expiry:** 1 hour from generation
- **Body:**
```json
{
  "token": "reset-token",
  "newPassword": "newpass123",
  "confirmPassword": "newpass123"
}
```
- **Password Requirements:**
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter  
  - At least one number
  - At least one special character

- **Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now sign in with your new password."
}
```
- **Note:** Token becomes invalid after successful use and all other tokens for the user are invalidated

### Validate Password Strength
- **POST** `/api/auth/validate-password`
- **Auth:** Not required
- **Body:**
```json
{
  "password": "testpass123"
}
```

---

## Newsletter Routes (`/api/newsletter`)

### Subscribe to Newsletter
- **POST** `/api/newsletter/subscribe`
- **Auth:** Not required
- **Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "preferences": {
    "product_updates": true,
    "promotions": true
  }
}
```

### Unsubscribe
- **POST** `/api/newsletter/unsubscribe`
- **Auth:** Not required
- **Body:**
```json
{
  "email": "user@example.com"
}
```

### Update Preferences
- **PUT** `/api/newsletter/preferences`
- **Auth:** Not required
- **Body:**
```json
{
  "email": "user@example.com",
  "preferences": {
    "product_updates": false,
    "promotions": true
  }
}
```

### Check Subscription Status
- **GET** `/api/newsletter/status?email=user@example.com`
- **Auth:** Not required

### Admin Newsletter Management
- **GET** `/api/newsletter/admin/subscribers` - Get all subscribers (Admin)
- **GET** `/api/newsletter/admin/stats` - Get newsletter statistics (Admin)
- **GET** `/api/newsletter/admin/export` - Export subscribers (Admin)

---

## Enhanced Product Search (`/api/products`)

### Advanced Search (Updated)
- **GET** `/api/products/search`
- **Description:** Advanced search with comprehensive filters
- **Auth:** Not required
- **Query Parameters:**
  - `q` (string): Search query
  - `category` (string): Category filter
  - `minPrice` (number): Minimum price
  - `maxPrice` (number): Maximum price
  - `sort` (string): Sort by relevance, price_asc, price_desc, rating, popularity, newest, name_asc
  - `inStock` (boolean): Filter in-stock products
  - `featured` (boolean): Filter featured products
  - `onSale` (boolean): Filter discounted products
  - `rating` (number): Minimum rating filter
  - `tags` (string): Comma-separated tags
  - `page` (number): Page number
  - `limit` (number): Items per page

**Enhanced Response:**
```json
{
  "success": true,
  "data": {
    "products": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    },
    "filters": {
      "applied": {...},
      "available": {
        "priceRange": {"min": 100, "max": 5000},
        "categories": [...],
        "tags": [...],
        "ratings": [...],
        "sortOptions": [...]
      }
    }
  }
}
```

---

## Admin Routes (`/api/admin`)
All admin routes require admin authentication.

### Analytics Overview
- **GET** `/api/admin/analytics/overview`
- **Description:** Get business analytics overview
- **Auth:** Required (Admin)

### Daily Sales Chart
- **GET** `/api/admin/analytics/daily-sales`
- **Description:** Get daily sales data for charts
- **Auth:** Required (Admin)
- **Query Parameters:**
  - `days` (number): Number of days (default: 30)

### Product Management
- **GET** `/api/admin/products`
- **Description:** Get all products for admin management
- **Auth:** Required (Admin)

- **POST** `/api/admin/products`
- **Description:** Create new product
- **Auth:** Required (Admin)

- **PUT** `/api/admin/products/:id`
- **Description:** Update product
- **Auth:** Required (Admin)

- **DELETE** `/api/admin/products/:id`
- **Description:** Delete product
- **Auth:** Required (Admin)

### Order Management
- **GET** `/api/admin/orders`
- **Description:** Get all orders for admin management
- **Auth:** Required (Admin)

- **PUT** `/api/admin/orders/:id/status`
- **Description:** Update order status
- **Auth:** Required (Admin)
- **Body:**
```json
{
  "status": "processing",
  "tracking_number": "SHIP123456"
}
```

### User Management
- **GET** `/api/admin/users`
- **Description:** Get all users
- **Auth:** Required (Admin)

- **PUT** `/api/admin/users/:id/role`
- **Description:** Update user role
- **Auth:** Required (Admin)
- **Body:**
```json
{
  "role": "admin"
}
```

### Inventory Management
- **PUT** `/api/admin/inventory/:productId`
- **Description:** Update product inventory
- **Auth:** Required (Admin)
- **Body:**
```json
{
  "quantity": 50,
  "changeType": "restock",
  "notes": "New stock received"
}
```

- **GET** `/api/admin/inventory/history/:productId`
- **Description:** Get inventory history for product
- **Auth:** Required (Admin)

- **GET** `/api/admin/inventory/low-stock`
- **Description:** Get low stock products
- **Auth:** Required (Admin)

- **POST** `/api/admin/inventory/cleanup-reservations`
- **Description:** Manually cleanup expired reservations
- **Auth:** Required (Admin)

---

## Error Responses

### Authentication Error
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

### Not Found Error
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Rate Limiting
- **Limit:** 100 requests per 15 minutes per IP
- **Headers:**
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time

---

## File Upload Specifications

### Supported File Types
- **Images:** JPG, JPEG, PNG, GIF, WEBP
- **Maximum File Size:** 10MB per file
- **Maximum Files:** 
  - Product images: 10 files
  - Review images: 5 files
  - Avatar: 1 file

### Image Processing
- **Product Images:** Resized to multiple sizes (thumbnail, medium, large)
- **Avatars:** Resized to 150x150px
- **Review Images:** Resized to max 800x800px
- **Format:** Converted to WebP for better compression

---

## Database Schema

### Key Tables
- `users` - User accounts and profiles
- `products` - Product catalog
- `categories` - Product categories
- `orders` - Order records (enhanced with coupon fields)
- `order_items` - Order line items
- `cart_items` - Shopping cart items
- `reviews` - Product reviews and ratings
- `stock_reservations` - Inventory reservations
- `inventory_history` - Stock change tracking
- `shipping_addresses` - Customer addresses
- `payment_transactions` - Payment records
- `coupons` - Promotional coupons and discounts
- `wishlists` - User wishlist items
- `password_reset_tokens` - Password reset tokens
- `newsletter_subscribers` - Newsletter subscriptions
- `addresses` - User address book

---

## Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/simri
REDIS_URL=redis://localhost:6379

# Server
PORT=8000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Session
SESSION_SECRET=your-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Razorpay
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-secret

# Shiprocket
SHIPROCKET_EMAIL=your-email
SHIPROCKET_PASSWORD=your-password

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@simri.com
COMPANY_NAME=Simri
ADMIN_EMAIL=admin@simri.com
```

---

## Getting Started

1. **Install Dependencies:**
```bash
cd server
npm install
```

2. **Setup Environment:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Start Services:**
```bash
docker-compose up -d  # Start PostgreSQL and Redis
```

4. **Run Database Migrations:**
```bash
# Run init.sql to create tables and seed data
```

5. **Start Server:**
```bash
npm run dev  # Development mode
npm run build && npm start  # Production mode
```

6. **Access Services:**
- API Server: http://localhost:8000
- Database UI (Adminer): http://localhost:8080
- File Uploads: http://localhost:8000/uploads

---

## Security Features

- **Rate Limiting:** 100 requests per 15 minutes
- **CORS:** Configured for frontend domain
- **Helmet:** Security headers
- **Session Security:** Secure cookies in production
- **File Upload Security:** Type and size validation
- **SQL Injection Prevention:** Parameterized queries
- **Authentication:** Google OAuth integration
- **Authorization:** Role-based access control
- **Input Validation:** Express-validator middleware

---

## 📊 API Statistics

- **Total Endpoints:** 85+ endpoints
- **Route Groups:** 12 major route groups
- **New Features:** 8 major feature additions
- **Database Tables:** 15+ optimized tables
- **Authentication:** Session-based with Google OAuth
- **Security:** Rate limiting, validation, SQL injection prevention
- **File Processing:** Image upload and optimization
- **Search:** Advanced filtering and sorting capabilities
- **Notifications:** Email templates and newsletter system
- **Compliance:** Indian GST tax calculations

## 🎯 Perfect for Gift E-commerce

This comprehensive API provides everything needed for a modern gift selling website:

- **Customer Experience:** Wishlists, profiles, address management
- **Product Discovery:** Advanced search, filters, recommendations
- **Sales Optimization:** Coupons, discounts, promotional campaigns  
- **Order Management:** Complete workflow from cart to delivery
- **Business Intelligence:** Analytics, reporting, customer insights
- **Communication:** Email notifications, newsletter marketing
- **Compliance:** Tax calculations, secure payments, data protection

---

## Product Recommendations Routes (`/api/recommendations`)

### Get Related Products
- **GET** `/api/recommendations/related/:productId`
- **Description:** Get products related to a specific product based on category, tags, and price
- **Auth:** Not required
- **Parameters:**
  - `productId` (URL param): Product UUID
  - `limit` (query, optional): Number of products to return (1-20, default: 8)
- **Response:**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "Product Name",
        "price": 1299.99,
        "image_url": "/uploads/product.jpg",
        "category": "gifts",
        "average_rating": 4.5,
        "total_reviews": 42,
        "score": 15
      }
    ],
    "total": 8
  }
}
```

### Get Customers Also Bought
- **GET** `/api/recommendations/also-bought/:productId`
- **Description:** Get products frequently bought with the specified product
- **Auth:** Not required
- **Parameters:**
  - `productId` (URL param): Product UUID
  - `limit` (query, optional): Number of products to return (1-20, default: 6)

### Get Personalized Recommendations
- **GET** `/api/recommendations/personalized`
- **Description:** Get personalized product recommendations based on user history
- **Auth:** Required
- **Parameters:**
  - `limit` (query, optional): Number of products to return (1-20, default: 10)

### Get Trending Products
- **GET** `/api/recommendations/trending`
- **Description:** Get currently trending products based on sales and reviews
- **Auth:** Not required
- **Parameters:**
  - `limit` (query, optional): Number of products to return (1-20, default: 8)

### Get Homepage Recommendations
- **GET** `/api/recommendations/homepage`
- **Description:** Get comprehensive recommendations for homepage display
- **Auth:** Not required (personalized section requires auth)
- **Response:**

```json
{
  "success": true,
  "data": {
    "trending": {
      "title": "Trending Now",
      "products": [...]
    },
    "new_arrivals": {
      "title": "New Arrivals",
      "products": [...]
    },
    "personalized": {
      "title": "Recommended for You",
      "products": [...]
    }
  }
}
```

### Admin - Get Recommendation Analytics
- **GET** `/api/recommendations/admin/analytics`
- **Description:** Get recommendation performance analytics
- **Auth:** Admin required
- **Response:**

```json
{
  "success": true,
  "data": {
    "purchase_patterns": [...],
    "top_recommended": [...],
    "performance": [...]
  }
}
```

---

## Cart Abandonment Routes (`/api/cart-abandonment`)

### Track Cart Activity
- **POST** `/api/cart-abandonment/track`
- **Description:** Track user cart activity for abandonment detection
- **Auth:** Required
- **Body:** None required (uses authenticated user)

### Mark Cart Recovered
- **POST** `/api/cart-abandonment/recover`
- **Description:** Mark cart as recovered when user completes purchase
- **Auth:** Required
- **Body:** None required (uses authenticated user)

### Admin - Get Abandonment Analytics
- **GET** `/api/cart-abandonment/admin/analytics`
- **Description:** Get cart abandonment analytics and metrics
- **Auth:** Admin required
- **Parameters:**
  - `days` (query, optional): Number of days to analyze (1-365, default: 30)
- **Response:**

```json
{
  "success": true,
  "data": {
    "total_abandoned_carts": 125,
    "recovered_carts": 23,
    "recovery_rate": 18.4,
    "average_abandoned_value": 1850.50,
    "total_lost_revenue": 188650.00,
    "daily_abandonment": [
      {
        "date": "2025-09-12",
        "abandoned_count": 8,
        "recovered_count": 2,
        "total_value": 12450.00
      }
    ]
  }
}
```

### Admin - Get Abandoned Carts
- **GET** `/api/cart-abandonment/admin/abandoned-carts`
- **Description:** Get list of abandoned carts for manual intervention
- **Auth:** Admin required
- **Parameters:**
  - `page` (query, optional): Page number (default: 1)
  - `limit` (query, optional): Items per page (1-100, default: 20)

### Admin - Send Manual Reminder
- **POST** `/api/cart-abandonment/admin/send-reminder/:userId`
- **Description:** Manually send abandonment reminder to specific user
- **Auth:** Admin required
- **Parameters:**
  - `userId` (URL param): User UUID

### Admin - Process All Reminders
- **POST** `/api/cart-abandonment/admin/process-reminders`
- **Description:** Manually trigger processing of all pending reminders
- **Auth:** Admin required
- **Response:**

```json
{
  "success": true,
  "data": {
    "sent": 12,
    "failed": 1
  },
  "message": "Processed reminders: 12 sent, 1 failed"
}
```

### Admin - Mark Abandoned Carts
- **POST** `/api/cart-abandonment/admin/mark-abandoned`
- **Description:** Manually trigger abandonment detection
- **Auth:** Admin required

### Admin - Cleanup Old Records
- **DELETE** `/api/cart-abandonment/admin/cleanup`
- **Description:** Clean up old abandonment tracking records
- **Auth:** Admin required
- **Parameters:**
  - `days` (query, optional): Keep records newer than X days (30-365, default: 90)

### Admin - Get Dashboard Stats
- **GET** `/api/cart-abandonment/admin/stats`
- **Description:** Get quick abandonment statistics for admin dashboard
- **Auth:** Admin required

---

## Testing Status

### Authentication System ✅ TESTED

The dual authentication system has been fully tested and verified:

**Database Setup:**
- ✅ Fresh Docker containers with updated schema
- ✅ Dual authentication support (email/password + Google OAuth)
- ✅ Database constraints and validation working
- ✅ Email verification and password reset tables created

**Endpoints Verified:**
- ✅ **POST /api/auth/register** - Email/password registration
- ✅ **POST /api/auth/login** - Email/password login  
- ✅ **POST /api/auth/forgot-password** - Password reset requests
- ✅ **POST /api/auth/validate-password** - Password strength validation
- ✅ **GET /api/auth/me** - Authentication status check

**Error Handling Verified:**
- ✅ Duplicate email registration prevention
- ✅ Invalid password login protection  
- ✅ Password strength requirements enforcement
- ✅ Proper database constraint validation

**Current Test Results:**
```
✅ Registration: Working with email verification
✅ Login: Working with session management
✅ Password Reset: Working with secure tokens
✅ Validation: Working with comprehensive checks
✅ Error Handling: Working with proper responses
✅ Database: Working with dual auth schema
```

### Development Environment

**Docker Services:**
- ✅ PostgreSQL 15 (Port 5432)
- ✅ Redis 7 (Port 6379) 
- ✅ Adminer Database UI (Port 8080)

**Server Configuration:**
- ✅ Express.js with TypeScript
- ✅ Session-based authentication with Redis
- ✅ Comprehensive input validation
- ✅ Password hashing with bcrypt
- ✅ Email service integration

---

## 🔄 Recent Updates & Improvements (2025-09-15)

### ✅ Enhanced Password Reset System
- **Secure Token Management**: 1-hour expiry with automatic invalidation
- **Rate Limiting**: Maximum 3 reset attempts per hour per email
- **Email Integration**: Professional email templates with proper routing
- **Frontend Integration**: Fixed route mismatch between `/reset-password` and `/auth/reset-password`
- **Timer Implementation**: 60-second cooldown for resend functionality

### ✅ Wishlist System Improvements  
- **Transaction-based Operations**: Atomic move-to-cart and remove operations
- **Bulk Operations**: Multiple item management with proper API endpoints
- **Individual Item Handling**: Dedicated endpoint for single item operations
- **API Consistency**: Standardized parameter flow (productId vs itemId)

### ✅ Payment Integration Enhancements
- **Field Tracking**: Both `payment_id` and `razorpay_payment_id` properly updated
- **Verification Process**: Enhanced payment verification with signature validation
- **Error Handling**: Improved error responses and logging

### 🔍 Known Issues
- **Search Functionality**: Case-sensitive search may not find products like "Jewelry Box" when searching "jewelry"
- **Recommendation**: Implement case-insensitive search in ProductModel.searchAdvanced()

---

## Summary

This API provides a complete e-commerce backend with authentication, product management, order processing, payment integration, inventory management, reviews, file uploads, advanced marketing features, intelligent product recommendations, and automated cart recovery systems.