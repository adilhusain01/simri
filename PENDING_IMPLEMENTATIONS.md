# Simri E-commerce - Pending Implementations & TODOs

This document lists all incomplete implementations, TODOs, and "For now" placeholders found in the codebase. Organized by priority and complexity.

## 🔧 MEDIUM PRIORITY - UX Improvements

### 5. Order Success Page Enhancement
**Current:** Basic success message and redirect  
**Needed:** Detailed order confirmation with tracking info, estimated delivery, etc.  
**Files:** Checkout completion flow  
**Complexity:** Medium

### 6. Better Error Handling in Auth Flow
**Current:** Generic error messages  
**Needed:** Specific validation errors and user-friendly messages  
**Files:** Auth stores and components  
**Complexity:** Low-Medium

---

## 🎨 LOW PRIORITY - Polish Items

### 7. Image Placeholder Improvements
**Files:** Multiple components using `/placeholder-product.jpg`  
**Current:** Generic placeholder for missing images  
**Potential:** Dynamic placeholders, loading states, skeleton screens  
**Complexity:** Low

### 8. Search Functionality Enhancements
**Files:** Header, Products, SearchResults pages  
**Current:** Basic search input  
**Potential:** Auto-suggestions, recent searches, advanced filters  
**Complexity:** Medium-High

---

## 🚧 MAJOR CLIENT FEATURES MISSING (vs Server API)

### 9. 🤖 Product Recommendations System - **CRITICAL MISSING**
**Status:** ❌ **NOT IMPLEMENTED**  
**Server API:** ✅ Full recommendation engine available (`/api/recommendations`)  
- Get Related Products
- Get Customers Also Bought  
- Get Personalized Recommendations
- Get Trending Products
- Get Homepage Recommendations

**Client Status:** Missing completely
**Files Needed:** 
- `src/services/api.ts` - Add recommendationService
- `src/components/ui/recommendations.tsx` - Recommendation components
- `src/pages/Home.tsx` - Homepage recommendation sections
- `src/pages/ProductDetails.tsx` - Related/also-bought sections
**Complexity:** Medium-High  
**Impact:** High - Essential for sales conversion

---

### 10. ⭐ Product Reviews System - **CRITICAL MISSING**
**Status:** ❌ **NOT IMPLEMENTED**  
**Server API:** ✅ Complete review system (`/api/reviews`)
- Get/Create/Update/Delete Reviews
- Review Images Upload
- Verified Purchase Reviews Only
- Review Analytics

**Client Status:** API service exists but no UI
**Files Needed:**
- `src/components/ui/reviews.tsx` - Review display/creation components
- `src/pages/ProductDetails.tsx` - Review section
- `src/pages/Profile.tsx` - User reviews section
**Complexity:** Medium-High  
**Impact:** Critical - Reviews drive purchase decisions

---

### 11. 🎁 Coupon System - **HIGH PRIORITY MISSING**
**Status:** ❌ **NOT IMPLEMENTED**  
**Server API:** ✅ Full coupon management (`/api/coupons`)
- Validate Coupon
- Get Best Coupon for Order
- Get Active Coupons

**Client Status:** API service exists but no UI
**Files Needed:**
- `src/components/ui/coupon.tsx` - Coupon input/validation
- `src/pages/Checkout.tsx` - Coupon application
- `src/pages/Cart.tsx` - Coupon suggestions
**Complexity:** Medium  
**Impact:** High - Drives conversions and customer acquisition

---

### 12. 🛒 Cart Abandonment Recovery - **REVENUE CRITICAL**
**Status:** ❌ **NOT IMPLEMENTED**  
**Server API:** ✅ Automated abandonment system (`/api/cart-abandonment`)
- Track Cart Activity
- Mark Cart Recovered
- Automatic email campaigns

**Client Status:** No tracking implementation
**Files Needed:**
- `src/services/api.ts` - Add cartAbandonmentService
- `src/stores/cartStore.ts` - Add abandonment tracking
- `src/pages/Cart.tsx` - Track cart events
**Complexity:** Low-Medium  
**Impact:** High - Revenue recovery through automated emails

---

### 13. 🔍 Advanced Search & Filters - **PARTIALLY IMPLEMENTED**
**Status:** ⚠️ **BASIC ONLY**  
**Server API:** ✅ 10+ advanced filters available
- Sort by relevance, price, rating, popularity
- Filter by stock, featured, on sale, rating, tags
- Comprehensive filter response with available options

**Client Status:** Basic search only
**Files Needed:**
- `src/components/ui/search-filters.tsx` - Advanced filter UI
- `src/pages/Products.tsx` - Enhanced search/filter interface
- `src/pages/SearchResults.tsx` - Advanced results display
**Complexity:** Medium  
**Impact:** Medium-High - Better product discovery

---

### 14. 📊 Order Tracking - **MISSING**
**Status:** ❌ **NOT IMPLEMENTED**  
**Server API:** ✅ Order tracking available
- Track Order by order number
- Order status updates

**Client Status:** OrderHistory exists but no tracking
**Files Needed:**
- `src/pages/OrderTracking.tsx` - New tracking page
- `src/components/ui/order-tracker.tsx` - Tracking display
- `src/pages/OrderHistory.tsx` - Add tracking links
**Complexity:** Medium  
**Impact:** Medium - Customer service improvement

---

### 15. 📧 Enhanced Email Verification - **PARTIALLY IMPLEMENTED**
**Status:** ⚠️ **MISSING FEATURES**  
**Server API:** ✅ Complete verification system
- Email verification endpoint
- Resend verification functionality

**Client Status:** Basic verification page only
**Files Needed:**
- `src/pages/auth/EmailVerification.tsx` - Add resend button
- `src/services/api.ts` - Add resend verification method
**Complexity:** Low  
**Impact:** Medium - Better user onboarding

---

### 16. 🔐 Enhanced Password Reset - **BASIC IMPLEMENTATION**
**Status:** ⚠️ **MISSING FEATURES**  
**Server API:** ✅ Enhanced security features
- Password strength validation
- Token verification before form display

**Client Status:** Basic reset flow only
**Files Needed:**
- `src/components/ui/password-strength.tsx` - Strength indicator
- `src/pages/auth/ResetPassword.tsx` - Token validation
**Complexity:** Low  
**Impact:** Medium - Better security UX

---

### 17. 📱 File Upload UI - **MISSING UI**
**Status:** ❌ **API ONLY**  
**Server API:** ✅ Complete upload system
- Upload Avatar, Review Images
- File validation and processing

**Client Status:** API service exists but no UI
**Files Needed:**
- `src/components/ui/file-upload.tsx` - File upload component (exists but not used)
- `src/pages/Profile.tsx` - Avatar upload UI
- Review image upload in review components
**Complexity:** Medium  
**Impact:** Medium - Better user profiles and reviews

---

### 18. 🎯 Enhanced Inventory Features - **PARTIALLY IMPLEMENTED**
**Status:** ⚠️ **BASIC ONLY**  
**Server API:** ✅ Complete inventory management
- Stock levels, reservations, low stock alerts

**Client Status:** Service exists but no UI integration
**Files Needed:**
- `src/components/ui/inventory-tracker.tsx` - Stock display (exists but basic)
- `src/pages/ProductDetails.tsx` - Stock level display
- `src/pages/Products.tsx` - Stock filters
**Complexity:** Low-Medium  
**Impact:** Medium - Better stock management UX

---

### 19. 🔍 Enhanced Newsletter Management - **MISSING FEATURES**
**Status:** ⚠️ **BASIC ONLY**  
**Server API:** ✅ Complete newsletter system
- Update preferences, Check status, Unsubscribe page

**Client Status:** Basic subscription in footer only
**Files Needed:**
- `src/pages/Newsletter.tsx` - Newsletter management page
- `src/components/ui/newsletter.tsx` - Enhanced with preference management
- `src/pages/Unsubscribe.tsx` - Unsubscribe page
**Complexity:** Low-Medium  
**Impact:** Low-Medium - Better newsletter UX

---

## 📊 IMPLEMENTATION STATUS SUMMARY

### **Legacy Issues:**
- **High Priority Issues:** 1 item (User Avatar Update - backend only)  
- **Completed:** 8 items ✅ (Wishlist functionality, Modal fixes, Database issues, Payment ID fix, Password change)
- **Removed from Scope:** 2 items (Email verification sending, Email resend)
- **Medium Priority:** 2 items (Order Success, Auth Error Handling)
- **Low Priority:** 2 items (Image placeholders, Basic search)

### **Major Missing Client Features:**
- **Critical Missing:** 3 items (🤖 Recommendations, ⭐ Reviews, 🎁 Coupons)
- **High Priority Missing:** 2 items (🛒 Cart Abandonment, 🔍 Advanced Search)
- **Medium Priority Missing:** 3 items (📊 Order Tracking, 📱 File Upload UI, 🎯 Inventory)
- **Low Priority Missing:** 3 items (📧 Email Enhancement, 🔐 Password Enhancement, 🔍 Newsletter)

### **Total Technical Debt:**
- **Backend:** ~1 hour (User Avatar Update)
- **Client Features:** ~40-60 hours (11 major missing features)
- **Core E-commerce Missing:** ~20-30 hours (Recommendations, Reviews, Coupons, Cart Abandonment)

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### **Phase 1: Quick Wins (1-2 hours)**

### **Phase 2: Revenue Critical**
3. **🤖 Product Recommendations** - Essential for sales conversion
4. **⭐ Product Reviews System** - Critical for purchase decisions  
5. **🎁 Coupon System** - Drives conversions and customer acquisition
6. **🛒 Cart Abandonment Recovery** - Revenue recovery automation

### **Phase 3: UX Improvements (10-15 hours)**
7. **🔍 Advanced Search & Filters** - Better product discovery
8. **📊 Order Tracking** - Customer service improvement
9. **📱 File Upload UI** - Avatar and review images
10. **Order Success Page Enhancement** - Post-purchase experience

### **Phase 4: Polish & Enhancement (5-10 hours)**
11. **🎯 Enhanced Inventory Features** - Stock level displays
12. **📧 Enhanced Email Verification** - Resend functionality
13. **🔐 Enhanced Password Reset** - Strength indicators  
14. **🔍 Enhanced Newsletter Management** - Preference management
15. **Better Error Handling** - Auth flow improvements
16. **Image & Search Polish** - Placeholders and suggestions

---

## 💡 IMPLEMENTATION NOTES

### User Avatar Update (Easiest Win)
The UserModel.update() method already exists and the upload processing is complete. Just need to uncomment the line and test.

### Email Verification
Backend has email service structure but needs the specific verification email template and method.

### Password Change
Frontend form exists, backend route exists, just needs proper integration and error handling.

### Technical Debt
Most items are small implementations rather than architectural changes. The core infrastructure is solid.

---

**Last Updated:** 2025-09-15  
**Total Technical Debt:** ~4-6 hours of development work for high priority items  
**Recent Progress:** Fixed wishlist functionality, modal backgrounds, database initialization