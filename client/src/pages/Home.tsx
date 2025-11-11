import React, { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  Gift,
  Star,
  ShoppingBag,
  Truck,
  Shield,
  RefreshCw,
  ArrowRight,
  Heart,
  User,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { useWishlistStore } from '../stores/wishlistStore';
import { productService } from '../services/api';
import type { Category, Product } from '../types';
import { toast } from 'sonner';

// Helper function to extract image URL from Cloudinary object or use string directly
const getImageUrl = (imageData: any, size: 'thumb' | 'medium' | 'large' | 'original' = 'medium') => {
  if (typeof imageData === 'string') {
    return imageData; // Legacy string format
  }
  if (typeof imageData === 'object' && imageData) {
    return imageData[size] || imageData.original || imageData.large || imageData.medium || imageData.thumb;
  }
  return '/placeholder-product.jpg';
};

// Product Card Component
const ProductCard: React.FC<{
  product: Product;
  onAddToCart: (product: Product) => void;
  onAddToWishlist: (product: Product) => void;
  cartLoading: boolean;
  wishlistLoading: boolean;
}> = ({ product, onAddToCart, onAddToWishlist, cartLoading, wishlistLoading }) => {
  return (
    <Card className="card-elegant group hover-lift overflow-hidden p-0 h-full flex flex-col">
      <div className="relative overflow-hidden">
        <div className="aspect-[3/4]">
          <img
            src={product.images?.[0] ? getImageUrl(product.images[0], 'medium') : '/placeholder-product.jpg'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-product.jpg';
            }}
          />
        </div>
        {product.discount_price && (
          <Badge className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-red-500 text-white text-xs px-1 sm:px-2 py-0.5">
            {Math.round((1 - parseFloat(product.discount_price) / parseFloat(product.price)) * 100)}% OFF
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-white/80 hover:bg-white p-1.5 sm:p-2"
          onClick={() => onAddToWishlist(product)}
          disabled={wishlistLoading}
        >
          <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>

      <CardContent className="p-2 sm:p-3 lg:p-4 flex flex-col flex-grow">
        <Badge variant="secondary" className="text-xs mb-2 w-fit">
          {product.category_name}
        </Badge>
        <h3 className="font-heading text-xs sm:text-sm lg:text-base font-semibold text-royal-black mb-2 line-clamp-2 flex-grow">
          <Link to="/products/$productId" params={{ productId: product.id }} className="hover:text-royal-gold transition-colors">
            {product.name}
          </Link>
        </h3>

        {(product.averageRating || product.totalReviews) && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-xs sm:text-sm text-gray-600">
              {product.averageRating || 'N/A'} ({product.totalReviews || 0})
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 sm:mb-3 space-y-2 sm:space-y-0">
          {product.discount_price ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-sm sm:text-base lg:text-lg font-bold text-royal-black">
                ₹{product.discount_price}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 line-through">
                ₹{product.price}
              </span>
            </div>
          ) : (
            <span className="text-sm sm:text-base lg:text-lg font-bold text-royal-black">
              ₹{product.price}
            </span>
          )}
        </div>

        <Button
          className="w-full btn-primary text-xs sm:text-sm mt-auto"
          size="sm"
          onClick={() => onAddToCart(product)}
          disabled={cartLoading || product.stock_quantity === 0}
        >
          {product.stock_quantity === 0 ? (
            <span className="text-xs sm:text-sm">Out of Stock</span>
          ) : (
            <>
              <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Add to Cart</span>
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

const Home: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { addItem: addToCart, isLoading: cartLoading } = useCartStore();
  const { addItem: addToWishlist, isLoading: wishlistLoading } = useWishlistStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);


  // Fetch categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const fetchedCategories = await productService.getCategories();
        // Filter for root categories (no parent_id) and limit to 6
        const rootCategories = fetchedCategories
          .filter(category => !category.parent_id)
          .slice(0, 6);
        setCategories(rootCategories);
      } catch (error) {
        console.error('Failed to load categories:', error);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []); // Empty dependency array to prevent re-runs

  // Fetch featured products
  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        setProductsLoading(true);
        const products = await productService.getFeaturedProducts(8);
        setFeaturedProducts(products);
      } catch (error) {
        console.error('Failed to load featured products:', error);
        setFeaturedProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    loadFeaturedProducts();
  }, []);

  // Product card handlers
  const handleAddToCart = async (product: Product) => {
    try {
      await addToCart(product.id, 1);
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleAddToWishlist = async (product: Product) => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to wishlist');
      return;
    }
    try {
      await addToWishlist(product.id);
      toast.success(`${product.name} added to wishlist!`);
    } catch (error) {
      toast.error('Failed to add to wishlist');
    }
  };


  // Function to get fallback icon and color for category
  const getCategoryDisplay = (_category: Category, index: number) => {
    const colors = [
      "from-royal-gold to-yellow-500",
      "from-gray-400 to-gray-600",
      "from-royal-black to-gray-700",
      "from-yellow-400 to-orange-500",
      "from-blue-400 to-cyan-500",
      "from-green-400 to-teal-500"
    ];

    const icons = ["🎁", "💎", "🌟", "🎊", "🎈", "✨"];
    
    return {
      color: colors[index % colors.length],
      icon: icons[index % icons.length]
    };
  };
  
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" as const }
  };

  const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const features = [
    {
      icon: Gift,
      title: "Curated Selection",
      description: "Handpicked gifts for every occasion and personality"
    },
    {
      icon: Truck,
      title: "Free Shipping",
      description: "Complimentary delivery on orders above ₹999"
    },
    {
      icon: Shield,
      title: "Secure Payments",
      description: "Your transactions are protected with bank-level security"
    },
    {
      icon: RefreshCw,
      title: "Easy Returns",
      description: "30-day hassle-free return policy"
    }
  ];


  const testimonials = [
    {
      name: "Priya Sharma",
      rating: 5,
      comment: "Found the perfect wedding gift here! Beautiful packaging and timely delivery.",
      avatar: "PS"
    },
    {
      name: "Rajesh Kumar",
      rating: 5,
      comment: "Amazing collection for corporate gifts. Professional service and great quality.",
      avatar: "RK"
    },
    {
      name: "Anita Patel",
      rating: 5,
      comment: "Love the personalized touch in every gift. My go-to store for all occasions!",
      avatar: "AP"
    }
  ];

  return (
    <div className="min-h-screen">
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-royal-gold via-royal-gold to-yellow-400 overflow-hidden">
        <div className="absolute inset-0 bg-royal-gold opacity-90" />

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-20 h-20 border border-royal-black rounded-full"></div>
          <div className="absolute top-40 right-20 w-16 h-16 border border-royal-black rounded-full"></div>
          <div className="absolute bottom-20 left-1/4 w-12 h-12 border border-royal-black rounded-full"></div>
        </div>

        {/* Quick Categories Strip - Mobile Only */}
        <div className="relative z-10 py-4 sm:py-6 bg-white/95 backdrop-blur-sm border-b border-gray-200/50 md:hidden">
          <div className="container mx-auto px-6 sm:px-8 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex overflow-x-auto scrollbar-thin gap-3 sm:gap-4 md:gap-6 lg:justify-center xl:justify-between pb-2 lg:px-4 xl:px-8">
                {categoriesLoading ? (
                  // Loading skeleton
                  Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="flex-shrink-0 text-center">
                      <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 lg:w-18 lg:h-18 bg-gray-200 rounded-full mx-auto mb-2 animate-pulse" />
                      <div className="h-2 w-12 sm:w-14 bg-gray-200 rounded mx-auto animate-pulse" />
                    </div>
                  ))
                ) : categories.length === 0 ? (
                  <div className="w-full text-center py-4">
                    <p className="text-royal-black/60 text-sm">Categories coming soon...</p>
                  </div>
                ) : (
                  categories.map((category, index) => {
                    const { icon } = getCategoryDisplay(category, index);
                    return (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.1 * index }}
                        className="flex-shrink-0 text-center group"
                      >
                        <Link to="/products" search={{
                          category: category.name,
                          q: '',
                          sortBy: 'relevance',
                          minPrice: undefined,
                          maxPrice: undefined,
                          inStock: false,
                          featured: false
                        }}>
                          <div className="cursor-pointer transition-all duration-300 hover:scale-110">
                            <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 lg:w-18 lg:h-18 rounded-full mx-auto mb-2 overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 border-2 border-gray-200 group-hover:border-royal-gold">
                              {category.image_url ? (
                                <img
                                  src={category.image_url}
                                  alt={category.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-royal-gold to-yellow-400 flex items-center justify-center text-2xl sm:text-3xl md:text-4xl lg:text-3xl transform group-hover:scale-110 transition-transform duration-300">
                                  {icon}
                                </div>
                              )}
                            </div>
                            <h3 className="font-medium text-royal-black text-xs sm:text-sm leading-tight max-w-[85px] mx-auto group-hover:text-royal-gold transition-colors duration-300">
                              {category.name}
                            </h3>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="relative container mx-auto px-6 sm:px-8 lg:px-8 py-12 sm:py-16 lg:py-24">
          <motion.div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Hero Content */}
            <motion.div
              {...fadeInUp}
              className="text-center lg:text-left space-y-6 sm:space-y-8"
            >

              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center justify-center lg:justify-start mb-6">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 flex items-center space-x-2 border border-royal-black/10">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-royal-black" />
                      <span className="text-sm sm:text-base font-medium text-royal-black">Welcome back, {user.name}!</span>
                    </div>
                  </div>
                  <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-royal-black leading-[1.1] tracking-tight">
                    Ready to Make
                    <span className="text-royal-black block bg-gradient-to-r from-royal-black to-gray-800 bg-clip-text">
                      Someone's
                    </span>
                    <span className="text-royal-black bg-gradient-to-r from-royal-black to-gray-800 bg-clip-text">
                      Day Special?
                    </span>
                  </h1>

                  <p className="text-lg sm:text-xl lg:text-2xl text-gray-800 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                    Continue your gifting journey with our personalized recommendations and curated collections just for you.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-royal-black leading-[1.1] tracking-tight">
                    Make Every
                    <span className="text-royal-black block bg-gradient-to-r from-royal-black to-gray-800 bg-clip-text">
                      Moment
                    </span>
                    <span className="text-royal-black bg-gradient-to-r from-royal-black to-gray-800 bg-clip-text">
                      Magical
                    </span>
                  </h1>

                  <p className="text-lg sm:text-xl lg:text-2xl text-gray-800 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                    Discover our curated collection of premium gifts that speak from the heart
                  </p>
                </>
              )}

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center lg:justify-start">
                {isAuthenticated ? (
                  <>
                    <Link to="/products" search={{
                      category: '',
                      q: '',
                      sortBy: 'relevance',
                      minPrice: undefined,
                      maxPrice: undefined,
                      inStock: false,
                      featured: false
                    }}>
                      <Button size="lg" className="btn-primary text-lg px-8 py-4 group w-full sm:w-auto shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-royal-black">
                        <ShoppingBag className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                        Shop Gifts
                        <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>

                    <Link to="/wishlist">
                      <Button variant="outline" size="lg" className="text-lg px-8 py-4 border-2 border-royal-black hover:border-black hover:bg-white/80 backdrop-blur-sm w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300">
                        <Heart className="mr-3 h-5 w-5" />
                        My Wishlist
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/auth/signup" search={{ redirect: '/' }}>
                      <Button size="lg" className="btn-primary text-lg px-8 py-4 group w-full sm:w-auto shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-royal-black">
                        <User className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                        Get Started
                        <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>

                    <Link to="/products" search={{
                      category: '',
                      q: '',
                      sortBy: 'relevance',
                      minPrice: undefined,
                      maxPrice: undefined,
                      inStock: false,
                      featured: false
                    }}>
                      <Button variant="outline" size="lg" className="text-lg px-8 py-4 border-2 border-royal-black hover:border-black hover:bg-white/80 backdrop-blur-sm w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300">
                        <ShoppingBag className="mr-3 h-5 w-5" />
                        Browse Gifts
                      </Button>
                    </Link>
                  </>
                )}
              </div>
           
            </motion.div>
            <img src="https://res.cloudinary.com/djxuqljgr/image/upload/v1762887094/hero_pfalyj.webp" alt="hero" />
          </motion.div>
        </div>
      </section>


      {/* Categories Section - Desktop/Tablet Only */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gray-50 hidden md:block">
        <div className="container mx-auto px-6 sm:px-8 lg:px-8">
          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <motion.h2 variants={fadeInUp} className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-royal-black mb-4 sm:mb-6">
              Perfect Gifts for Every Occasion
            </motion.h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 lg:gap-6"
          >
            {categoriesLoading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <motion.div key={index} variants={fadeInUp}>
                  <Card className="card-elegant text-center p-3 sm:p-4">
                    <CardContent className="pt-3 sm:pt-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-200 rounded-full mx-auto mb-2 sm:mb-3 animate-pulse" />
                      <div className="h-3 sm:h-4 bg-gray-200 rounded mx-auto animate-pulse" />
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : categories.length === 0 ? (
              // No categories fallback
              <motion.div variants={fadeInUp} className="col-span-full text-center py-8">
                <p className="text-gray-500 text-sm sm:text-base">No categories available</p>
              </motion.div>
            ) : (
              categories.map((category, index) => {
                const { icon } = getCategoryDisplay(category, index);
                return (
                  <motion.div key={category.id} variants={fadeInUp}>
                    <Link to="/products" search={{
                      category: category.name,
                      q: '',
                      sortBy: 'relevance',
                      minPrice: undefined,
                      maxPrice: undefined,
                      inStock: false,
                      featured: false
                    }}>
                      <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-64 lg:h-64 mx-auto overflow-hidden relative cursor-pointer">
                        <div className="w-full h-full bg-gray-100 arch-frame relative shadow-lg">
                          {category.image_url ? (
                            <img
                              src={category.image_url}
                              alt={category.name}
                              className="w-full h-full object-cover arch-frame"
                            />
                          ) : (
                            <div className={`w-full h-full bg-royal-gold flex items-center justify-center text-xl sm:text-2xl lg:text-3xl arch-frame`}>
                              {icon}
                            </div>
                          )}
                          {/* Category name overlay */}
                          <div className="absolute bottom-0 left-0 right-0 bg-[#dee3e8] text-royal-black text-sm lg:text-base font-medium py-1 lg:py-2 px-2 text-center">
                            {category.name}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="container mx-auto px-6 sm:px-8 lg:px-8">
          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <motion.h2 variants={fadeInUp} className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-royal-black mb-4 sm:mb-6">
              Featured Products
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-base sm:text-lg lg:text-xl text-gray-800 max-w-2xl mx-auto leading-relaxed">
              Discover our handpicked collection of premium gifts that make every moment special.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="initial"
            animate="animate"
            className="overflow-x-auto scrollbar-thin pb-4"
          >
            <div className="flex gap-3 sm:gap-4 min-w-max md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-4 lg:gap-6 md:min-w-0">
              {productsLoading ? (
                // Loading skeleton
                Array.from({ length: 4 }).map((_, index) => (
                  <motion.div key={index} variants={fadeInUp} className="flex-shrink-0 w-48 sm:w-52 md:w-auto">
                    <Card className="card-elegant overflow-hidden p-0 h-full">
                      <div className="aspect-[3/4] bg-gray-200 animate-pulse" />
                      <CardContent className="p-3">
                        <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse" />
                        <div className="h-6 bg-gray-200 rounded mb-2 animate-pulse" />
                        <div className="h-4 bg-gray-200 rounded mb-3 animate-pulse" />
                        <div className="h-8 bg-gray-200 rounded animate-pulse" />
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : featuredProducts.length === 0 ? (
                <motion.div variants={fadeInUp} className="col-span-full text-center py-12">
                  <p className="text-gray-500 text-lg">No featured products available</p>
                </motion.div>
              ) : (
                featuredProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    variants={fadeInUp}
                    className="flex-shrink-0 w-48 sm:w-52 md:w-auto"
                  >
                    <ProductCard
                      product={product}
                      onAddToCart={handleAddToCart}
                      onAddToWishlist={handleAddToWishlist}
                      cartLoading={cartLoading}
                      wishlistLoading={wishlistLoading}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="text-center mt-8 sm:mt-12"
          >
            <Link to="/products" search={{
              category: '',
              q: '',
              sortBy: 'relevance',
              minPrice: undefined,
              maxPrice: undefined,
              inStock: false,
              featured: false
            }}>
              <Button variant="outline" size="lg" className="btn-secondary">
                <ShoppingBag className="mr-2 h-5 w-5" />
                View All Products
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="container mx-auto px-6 sm:px-8 lg:px-8">
          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <motion.h2 variants={fadeInUp} className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-royal-black mb-4 sm:mb-6">
              Why Choose Simri?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-base sm:text-lg lg:text-xl text-gray-800 max-w-2xl mx-auto leading-relaxed">
              We're committed to making your gift-giving experience extraordinary with our premium service and attention to detail.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div key={index} variants={fadeInUp}>
                  <Card className="card-elegant text-center p-4 sm:p-6 h-full hover:shadow-xl transition-all duration-300">
                    <CardContent className="pt-4 sm:pt-6 flex flex-col h-full">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-royal-gold rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-royal-black" />
                      </div>
                      <h3 className="font-heading text-lg sm:text-xl font-semibold text-royal-black mb-2 sm:mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-sm sm:text-base text-gray-800 leading-relaxed flex-grow">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="container mx-auto px-6 sm:px-8 lg:px-8">
          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <motion.h2 variants={fadeInUp} className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-royal-black mb-4 sm:mb-6">
              What Our Customers Say
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-base sm:text-lg lg:text-xl text-gray-800 max-w-2xl mx-auto leading-relaxed">
              Join thousands of satisfied customers who trust Simri for their special moments.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="card-elegant p-4 sm:p-6 h-full hover:shadow-xl transition-all duration-300">
                  <CardContent className="pt-4 sm:pt-6 flex flex-col h-full">
                    <div className="flex items-center mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-royal-gold rounded-full flex items-center justify-center text-royal-black font-semibold mr-3 sm:mr-4 text-sm sm:text-base">
                        {testimonial.avatar}
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-semibold text-royal-black text-sm sm:text-base">{testimonial.name}</h4>
                        <div className="flex items-center mt-1">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 text-royal-gold fill-current" />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-800 italic text-sm sm:text-base leading-relaxed flex-grow">
                      "{testimonial.comment}"
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-royal-gold via-royal-gold to-yellow-400 relative overflow-hidden">
        <div className="absolute inset-0 bg-royal-gold opacity-90" />

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-20 h-20 border border-royal-black rounded-full"></div>
          <div className="absolute bottom-10 right-10 w-16 h-16 border border-royal-black rounded-full"></div>
          <div className="absolute top-1/2 left-1/4 w-12 h-12 border border-royal-black rounded-full"></div>
        </div>

        <div className="relative container mx-auto px-6 sm:px-8 lg:px-8 text-center">
          <motion.div
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-royal-black mb-4 sm:mb-6 leading-tight">
              Ready to Make Someone's Day?
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-800 mb-8 sm:mb-10 lg:mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
              Browse our collection and find the perfect gift that speaks from your heart to theirs.
            </p>
            <Link to="/products" search={{
              category: '',
              q: '',
              sortBy: 'relevance',
              minPrice: undefined,
              maxPrice: undefined,
              inStock: false,
              featured: false
            }}>
              <Button size="lg" variant="secondary" className="btn-secondary text-base sm:text-lg lg:text-xl px-6 sm:px-8 lg:px-10 py-3 sm:py-4 lg:py-5 shadow-2xl hover:shadow-3xl transition-all duration-300 border-2 border-royal-black hover:scale-105">
                <Gift className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                Start Shopping
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;