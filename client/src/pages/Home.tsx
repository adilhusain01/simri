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
import PixelatedHeart from '@/components/layout/PixelatedHeart';
import { useAuthStore } from '../stores/authStore';
import { productService } from '../services/api';
import type { Category } from '../types';

const Home: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);


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

        <div className="relative container mx-auto px-6 sm:px-8 lg:px-8 py-16 sm:py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

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

              {/* Trust Indicators */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-8 text-sm sm:text-base text-royal-black">
                <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-royal-black/10">
                  <Star className="w-4 h-4 mr-2 fill-royal-black" />
                  <span className="font-medium">4.9/5 Rating</span>
                </div>
                <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-royal-black/10">
                  <Shield className="w-4 h-4 mr-2" />
                  <span className="font-medium">Secure Checkout</span>
                </div>
                <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-royal-black/10">
                  <Truck className="w-4 h-4 mr-2" />
                  <span className="font-medium">Free Shipping</span>
                </div>
              </div>
            </motion.div>

            {/* Pixelated Heart - Hidden on mobile */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <PixelatedHeart />
            </motion.div>
          </div>
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

      {/* Categories Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gray-50">
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
            <motion.p variants={fadeInUp} className="text-base sm:text-lg lg:text-xl text-gray-800 max-w-2xl mx-auto leading-relaxed">
              From birthdays to celebrations, find the ideal gift that matches the moment and creates lasting memories.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6"
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
                      <Card className="card-elegant text-center p-3 sm:p-4 lg:p-6 hover:scale-105 hover:shadow-lg transition-all duration-300 cursor-pointer">
                        <CardContent className="pt-3 sm:pt-4 lg:pt-6">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full mx-auto mb-2 sm:mb-3 lg:mb-4 overflow-hidden">
                            {category.image_url ? (
                              <img
                                src={category.image_url}
                                alt={category.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className={`w-full h-full bg-royal-gold flex items-center justify-center text-lg sm:text-xl lg:text-2xl`}>
                                {icon}
                              </div>
                            )}
                          </div>
                          <h3 className="font-medium text-royal-black text-xs sm:text-sm lg:text-base leading-tight">
                            {category.name}
                          </h3>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })
            )}
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