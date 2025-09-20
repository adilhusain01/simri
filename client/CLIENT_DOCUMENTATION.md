# Simri E-commerce Client Documentation

## Overview

The Simri client is a modern, full-featured e-commerce frontend application built with React 19, TypeScript, and TanStack Router. It provides a complete shopping experience for users to browse products, manage their cart, wishlist, and complete purchases.

**Development Server:** `http://localhost:3000`  
**API Backend:** `http://localhost:8000`  
**Admin Dashboard:** `admin.simri.com` (Separate subdomain for security)

## 🏗️ Architecture & Stack

### Core Technologies
- **React 19** - Latest React with concurrent features and modern hooks
- **TypeScript** - Full type safety throughout the application
- **Vite 6.3.5** - Fast build tool with HMR and dev server
- **TanStack Router 1.130.2** - Type-safe routing with code-based setup
- **TanStack Query 5.87.4** - Server state management and data fetching
- **Zustand 5.0.8** - Client-side state management
- **Tailwind CSS v4** - Utility-first CSS framework with Vite plugin
- **Framer Motion 12.23.12** - Animation library for smooth interactions

### UI & Components
- **Shadcn/ui** - High-quality, accessible component system
- **Radix UI** - Headless UI components for complex interactions
- **Lucide React** - Beautiful icon library
- **Class Variance Authority** - Component variant management
- **Sonner** - Toast notifications

## 📁 Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── ui/                     # Shadcn UI components
│   │   │   ├── button.tsx          # Button variants and styles
│   │   │   ├── input.tsx           # Form input components
│   │   │   ├── card.tsx            # Card layouts
│   │   │   ├── badge.tsx           # Status badges
│   │   │   ├── avatar.tsx          # User avatars
│   │   │   ├── dropdown-menu.tsx   # Dropdown menus
│   │   │   ├── sheet.tsx           # Side panels/drawers
│   │   │   ├── dialog.tsx          # Modal dialogs
│   │   │   ├── tabs.tsx            # Tab navigation
│   │   │   ├── radio-group.tsx     # Radio button groups
│   │   │   ├── label.tsx           # Form labels
│   │   │   ├── textarea.tsx        # Text areas
│   │   │   └── loading.tsx         # Loading spinners
│   │   └── layout/
│   │       ├── Layout.tsx          # Main app layout wrapper
│   │       ├── Header.tsx          # Navigation header with search
│   │       ├── Footer.tsx          # Site footer
│   │       └── PixelatedHeart.tsx  # Animated heart component
│   ├── pages/
│   │   ├── Home.tsx                # Landing/homepage
│   │   ├── Products.tsx            # Product listing with filters
│   │   ├── ProductDetails.tsx      # Individual product pages
│   │   ├── SearchResults.tsx       # Search results with highlighting
│   │   ├── Cart.tsx                # Shopping cart management
│   │   ├── Checkout.tsx            # Multi-step checkout flow
│   │   ├── Wishlist.tsx            # User wishlist management
│   │   ├── Profile.tsx             # User profile with tabs
│   │   ├── OrderHistory.tsx        # Order management and tracking
│   │   └── auth/                   # Authentication pages
│   │       ├── Login.tsx           # User login form
│   │       ├── Signup.tsx          # User registration
│   │       ├── Callback.tsx        # OAuth callback handler
│   │       ├── EmailVerification.tsx # Email verification handler
│   │       ├── ResetPassword.tsx   # Password reset form
│   │       └── ForgotPassword.tsx  # Password reset request
│   ├── services/
│   │   └── api.ts                  # Backend API client and endpoints
│   ├── stores/
│   │   ├── authStore.ts            # Authentication state
│   │   ├── cartStore.ts            # Shopping cart state
│   │   └── wishlistStore.ts        # User wishlist state
│   ├── types/
│   │   └── index.ts                # Shared TypeScript definitions
│   ├── styles/
│   │   └── globals.css             # Global CSS with Tailwind directives
│   ├── lib/
│   │   ├── utils.ts                # Common utilities (cn, etc.)
│   │   ├── demo-store.ts           # Demo store implementation
│   │   └── demo-store-devtools.tsx # Store devtools
│   ├── integrations/
│   │   └── tanstack-query/         # TanStack Query setup
│   │       ├── root-provider.tsx   # Query client provider
│   │       └── devtools.tsx        # Query devtools
│   └── main.tsx                    # Application entry point with routing
├── public/                         # Static assets
├── .env.example                    # Environment variables template
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── vite.config.ts                  # Vite build configuration
├── biome.json                      # Biome linter/formatter config
└── components.json                 # Shadcn/ui configuration
```

## 🎯 Implemented Features

### ✅ **E-commerce Core Features**

#### **Product Management**
- **Product Listing** (`/products`) - Grid/list views, search, filtering, sorting, pagination
- **Product Details** (`/products/:id`) - Full product info, image gallery, reviews, recommendations
- **Search Results** (`/search`) - Advanced search with query highlighting and filters
- **Categories** - Dynamic category filtering and navigation

#### **Shopping Experience**  
- **Shopping Cart** (`/cart`) - Quantity management, coupon system, order summary
- **Wishlist** (`/wishlist`) - Save items, bulk operations, move to cart functionality with transaction-based backend
- **Checkout Flow** (`/checkout`) - Multi-step process (Address → Payment → Review) with Razorpay integration
- **Order Management** (`/orders`) - Order history, tracking, status updates

#### **User Features**
- **User Profile** (`/profile`) - Profile editing, address management, security settings, password change
- **Authentication** - Email/password + Google OAuth, email verification with secure session management
- **Password Reset** - Complete flow with 60-second timer and secure token system
- **Address Book** - Multiple addresses with shipping/billing types
- **Order History** - Complete order tracking and management

### 🎨 **UI/UX Features**

#### **Design System**
- **Consistent Theming** - Simri brand colors (purple gradients), Playfair Display typography
- **Responsive Design** - Mobile-first approach with all screen size support
- **Smooth Animations** - Framer Motion transitions and micro-interactions
- **Loading States** - Comprehensive loading indicators and skeleton screens

#### **Component Architecture**
- **Shadcn/ui System** - High-quality, accessible components
- **Reusable Cards** - Product cards, wishlist cards, order cards
- **Modal System** - Dialogs, sheets, and overlays
- **Form Components** - Validation, error handling, and user feedback

### 🔐 **Authentication & Security**

#### **Dual Authentication**
- **Email/Password** - Traditional form-based authentication
- **Google OAuth** - Social login integration
- **Session Management** - HTTP-only cookies, auto-restoration
- **Email Verification** - Secure token-based verification

#### **Security Features**
- **Protected Routes** - Authentication guards for sensitive pages
- **CSRF Protection** - Axios interceptors and session validation
- **Input Validation** - Client-side validation with error handling
- **Admin Separation** - Admin dashboard isolated to `admin.simri.com`

## 🌐 API Integration

### Comprehensive Service Layer
```typescript
// Complete API service integration with full CRUD operations

export const authService = {
  me: () => Promise<User>                           // GET /api/auth/me
  login: (credentials) => Promise<LoginResponse>    // POST /api/auth/login  
  register: (userData) => Promise<LoginResponse>    // POST /api/auth/register
  googleLogin: () => void                           // Redirect to OAuth
  googleCallback: (params) => Promise<LoginResponse> // POST /api/auth/google/callback
  logout: () => Promise<void>                       // POST /api/auth/logout
  forgotPassword: (email) => Promise<void>          // Password reset request
  resetPassword: (token, password) => Promise<void> // Password reset
  verifyEmail: (token) => Promise<void>             // Email verification
}

export const productService = {
  getProducts: (filters?, pagination?) => Promise<PaginatedResponse<Product[]>>
  getProduct: (id) => Promise<Product>
  searchProducts: (query, filters?, pagination?) => Promise<PaginatedResponse<Product[]>>
  getCategories: () => Promise<string[]>
}

export const cartService = {
  getCart: () => Promise<Cart>
  addItem: (request) => Promise<void>
  updateItem: (itemId, request) => Promise<void>
  removeItem: (itemId) => Promise<void>
  clearCart: () => Promise<void>
}

export const orderService = {
  getOrders: (pagination?) => Promise<PaginatedResponse<Order[]>>
  getOrder: (id) => Promise<Order>
  createOrder: (request) => Promise<Order>
  trackOrder: (orderNumber) => Promise<Order>
}

export const wishlistService = {
  getWishlist: () => Promise<Wishlist>
  addItem: (productId) => Promise<void>
  removeItem: (itemId) => Promise<void>
  moveToCart: (itemId, quantity) => Promise<void>
}

export const userService = {
  updateProfile: (request) => Promise<User>
  getAddresses: () => Promise<Address[]>
  addAddress: (address) => Promise<Address>
  updateAddress: (id, address) => Promise<Address>
  deleteAddress: (id) => Promise<void>
}

export const paymentService = {
  createPaymentOrder: (orderId) => Promise<RazorpayOrderData>
  verifyPayment: (paymentData) => Promise<void>
}
```

## 🔄 State Management

### Zustand Stores with Persistence

#### **Authentication Store**
```typescript
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<LoginResponse>
  register: (userData: RegisterData) => Promise<LoginResponse>
  logout: () => Promise<void>
  initialize: () => Promise<void> // Auto-restore session
  updateUser: (user: Partial<User>) => void
}
```

#### **Cart Store**
```typescript
interface CartState {
  cart: Cart | null
  isLoading: boolean
  addItem: (productId: string, quantity: number) => Promise<void>
  updateItem: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  fetchCart: () => Promise<void>
}
```

#### **Wishlist Store**
```typescript
interface WishlistState {
  wishlist: Wishlist | null
  isLoading: boolean
  addItem: (productId: string) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  moveToCart: (itemId: string, quantity: number) => Promise<void>
  fetchWishlist: () => Promise<void>
}
```

## 🛣️ Routing Architecture

### **Complete Route Structure**
```typescript
// Public Routes
'/'                           → Home page
'/products'                   → Product listing
'/products/:productId'        → Product details
'/search?q=query'            → Search results

// Authentication Routes
'/auth/login'                → User login
'/auth/signup'               → User registration
'/auth/forgot-password'      → Password reset request
'/auth/reset-password?token' → Password reset form
'/auth/verify-email?token'   → Email verification
'/auth/callback'             → OAuth callback

// Protected Routes (Authentication Required)
'/cart'                      → Shopping cart
'/checkout'                  → Checkout process
'/wishlist'                  → User wishlist
'/profile'                   → User profile
'/orders'                    → Order history

// Admin Access (External Subdomain)
'admin.simri.com'            → CMS Dashboard (Separate Application)
```

### **Route Protection**
- **Authentication Guards** - Automatic redirect to login for protected routes
- **Role-based Access** - Admin users get external link to CMS dashboard
- **Search Parameters** - Support for filters, pagination, and search queries
- **Dynamic Parameters** - Product IDs, tokens, and other dynamic routing

## 🎨 Design System

### **Brand Consistency**
- **Colors** - Purple gradients (`bg-gradient-primary`), consistent color palette
- **Typography** - Playfair Display for headings (`font-heading`), system fonts for body
- **Components** - Consistent button styles (`btn-primary`), card elevation (`card-elegant`)
- **Animations** - Smooth transitions, hover effects (`hover-lift`), and loading states

### **Responsive Design**
- **Mobile-first** - All components responsive across devices
- **Breakpoints** - Tailwind's responsive breakpoints (sm, md, lg, xl)
- **Touch-friendly** - Appropriate touch targets and gestures
- **Performance** - Optimized for mobile networks and devices

## 🏢 CMS Dashboard Architecture

### **Separation Strategy**
The admin dashboard is intentionally separated from the main client for security and maintainability:

#### **Security Benefits**
- **Subdomain Isolation** - `admin.simri.com` vs `simri.com`
- **Separate Codebase** - Independent deployment and security model
- **Role-based Access** - Only admin users can access the CMS
- **Network Isolation** - Different server configurations and security rules
- **Attack Surface Reduction** - Admin functions not exposed in customer app

#### **Technical Benefits**
- **Independent Scaling** - Admin dashboard can scale separately
- **Different Tech Stack** - Can use specialized admin frameworks
- **Faster Customer App** - Reduced bundle size without admin code
- **Easier Maintenance** - Separate codebases for different concerns
- **Better Performance** - Customer app optimized for public use

### **CMS Dashboard Features** (Separate Project)
The admin dashboard at `admin.simri.com` will handle:
- **Product Management** - CRUD operations, inventory, categories
- **Order Management** - Order processing, fulfillment, tracking
- **User Management** - Customer support, account management
- **Content Management** - Homepage content, promotions, banners
- **Analytics & Reports** - Sales analytics, user behavior, performance
- **System Settings** - Configuration, payment settings, shipping
- **Multi-admin Support** - Role-based permissions, audit logs

### **Integration Points**
- **Shared API** - Same backend API endpoints
- **Shared Database** - Common data models and relationships
- **Authentication** - Admin users authenticated via same auth system
- **Real-time Updates** - WebSocket connections for live updates

## 🚀 Development Workflow

### **Development Commands**
```bash
# Development
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build with type checking
npm run serve    # Preview production build
npm run test     # Run test suite with Vitest

# Code Quality
npm run lint     # Check code with Biome
npm run format   # Format code with Biome  
npm run check    # Run both lint and format

# Components
npx shadcn@latest add button  # Add new UI components
```

### **Environment Configuration**
```bash
# .env.local
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## 📈 Performance & Optimization

### **Build Optimizations**
- **Vite Build** - Fast builds with ES modules and tree shaking
- **Code Splitting** - Route-based automatic splitting
- **Asset Optimization** - Image compression and lazy loading
- **Bundle Analysis** - Size monitoring and optimization

### **Runtime Performance**
- **React 19** - Concurrent features and optimized rendering
- **TanStack Query** - Intelligent caching and background sync
- **Lazy Loading** - Components and routes loaded on demand
- **Memoization** - Expensive calculations cached appropriately

## 🧪 Testing & Quality

### **Testing Framework**
- **Vitest** - Fast test runner with Jest compatibility
- **Testing Library** - Component testing utilities
- **jsdom** - Browser environment simulation
- **Coverage Reports** - Built-in test coverage tracking

### **Code Quality Tools**
- **Biome** - Fast linting and formatting
- **TypeScript** - Strict type checking throughout
- **ESLint Rules** - Consistent code patterns
- **Pre-commit Hooks** - Automated quality checks

## ✅ Implementation Status

### **Completed Features**
- ✅ **Authentication System** - Email/password + Google OAuth with session management
- ✅ **Product Management** - Listing, details, search, categories with full API integration
- ✅ **Shopping Cart** - Full cart management with quantity, coupons, and persistence
- ✅ **Wishlist System** - Complete wishlist with bulk operations and cart integration
- ✅ **Checkout Flow** - Multi-step checkout with address, payment, and order creation
- ✅ **User Profile** - Profile management, addresses, security settings
- ✅ **Order History** - Complete order tracking and management system
- ✅ **Search System** - Advanced search with highlighting and filters
- ✅ **Responsive Design** - Mobile-first design across all components
- ✅ **State Management** - Zustand stores with persistence and error handling
- ✅ **API Integration** - Complete service layer with 50+ endpoints
- ✅ **Error Handling** - Comprehensive error boundaries and user feedback
- ✅ **Loading States** - Loading indicators and skeleton screens throughout

### **Architecture Decisions**
- ✅ **Separate Admin Dashboard** - Security-first approach with subdomain isolation
- ✅ **Type Safety** - Full TypeScript integration with strict checking
- ✅ **Component System** - Shadcn/ui with custom styling and variants
- ✅ **Modern React** - React 19 with concurrent features and hooks
- ✅ **Performance First** - Optimized builds, lazy loading, and caching

## 🔮 Future Enhancements

### **Planned Features**
- [ ] **PWA Support** - Offline functionality and app-like experience
- [ ] **Push Notifications** - Order updates and promotional notifications
- [ ] **Advanced Analytics** - User behavior tracking and conversion optimization
- [ ] **Internationalization** - Multi-language and currency support
- [ ] **Social Features** - Product sharing, reviews, and recommendations

### **Technical Improvements**
- [ ] **E2E Testing** - Cypress or Playwright integration
- [ ] **Performance Monitoring** - Real-time performance tracking
- [ ] **A/B Testing** - Feature flag system for testing variations
- [ ] **Advanced Caching** - Service worker and cache strategies
- [ ] **Micro-frontends** - Potential modularization for large-scale features

## 🐛 Troubleshooting

### **Common Issues**
- **Port Conflicts** - Ensure port 3000 is available for dev server
- **API Connection** - Verify backend is running on port 8000
- **Build Errors** - Clear node_modules and reinstall dependencies
- **Type Errors** - Run `npm run build` to check TypeScript compilation

### **Development Tips**
- Use **TanStack Router devtools** for routing debugging
- Use **TanStack Query devtools** for API state inspection
- Use **React DevTools** for component tree debugging
- Use **Tailwind IntelliSense** for CSS class assistance
- Monitor **Network tab** for API request debugging

---

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Status:** Production Ready

*This documentation is maintained alongside the codebase and should be updated when adding new features or changing architecture.*