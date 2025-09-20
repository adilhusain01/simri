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
  const getCategoryDisplay = (category: Category, index: number) => {
    const colors = [
      "from-pink-400 to-rose-500",
      "from-red-400 to-pink-500", 
      "from-purple-400 to-indigo-500",
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
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
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
      <section className="relative bg-gradient-to-br from-purple-50 via-purple-100 to-pink-50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
        
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Hero Content */}
            <motion.div
              {...fadeInUp}
              className="text-center lg:text-left"
            >
              
              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center mb-4">
                    <User className="w-6 h-6 text-purple-600 mr-2" />
                    <span className="text-lg text-purple-600">Welcome back, {user.name}!</span>
                  </div>
                  <h1 className="font-heading text-5xl lg:text-7xl font-bold text-charcoal mb-6 leading-tight">
                    Ready to Make
                    <span className="text-gradient-primary block">
                      Someone's
                    </span>
                    <span className="text-gradient-secondary">
                      Day Special?
                    </span>
                  </h1>
                  
                  <p className="text-xl text-gray-600 mb-8 max-w-lg">
                    Continue your gifting journey with our personalized recommendations and curated collections just for you.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="font-heading text-5xl lg:text-7xl font-bold text-charcoal mb-6 leading-tight">
                    Make Every
                    <span className="text-gradient-primary block">
                      Moment
                    </span>
                    <span className="text-gradient-secondary">
                      Magical
                    </span>
                  </h1>
                  
                  <p className="text-xl text-gray-600 mb-8 max-w-lg">
                    Discover our curated collection of premium gifts that speak from the heart. 
                    From thoughtful gestures to grand celebrations, we help you express what matters most.
                  </p>
                </>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {isAuthenticated ? (
                  <>
                    <Link to="/products">
                      <Button size="lg" className="btn-primary text-lg px-8 py-4 group">
                        <ShoppingBag className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                        Shop Gifts
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                    
                    <Link to="/wishlist">
                      <Button variant="outline" size="lg" className="text-lg px-8 py-4 border-2 border-purple-200 hover:border-purple-500 hover:bg-purple-50">
                        <Heart className="mr-2 h-5 w-5" />
                        My Wishlist
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/auth/signup" search={{ redirect: '/' }}>
                      <Button size="lg" className="btn-primary text-lg px-8 py-4 group">
                        <User className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                        Get Started
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                    
                    <Link to="/products">
                      <Button variant="outline" size="lg" className="text-lg px-8 py-4 border-2 border-purple-200 hover:border-purple-500 hover:bg-purple-50">
                        <ShoppingBag className="mr-2 h-5 w-5" />
                        Browse Gifts
                      </Button>
                    </Link>
                  </>
                )}
              </div>
              
              {/* Trust Indicators */}
              <div className="flex items-center justify-center lg:justify-start gap-6 mt-12 text-sm text-gray-500">
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 mr-1" />
                  <span>4.9/5 Rating</span>
                </div>
                <div className="flex items-center">
                  <Shield className="w-4 h-4 text-green-500 mr-1" />
                  <span>Secure Checkout</span>
                </div>
                <div className="flex items-center">
                  <Truck className="w-4 h-4 text-blue-500 mr-1" />
                  <span>Free Shipping</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
            <PixelatedHeart />

            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="font-heading text-4xl font-bold text-charcoal mb-4">
              Why Choose Simri?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl text-gray-600 max-w-2xl mx-auto">
              We're committed to making your gift-giving experience extraordinary with our premium service and attention to detail.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div key={index} variants={fadeInUp}>
                  <Card className="card-elegant text-center p-6">
                    <CardContent className="pt-6">
                      <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="font-heading text-xl font-semibold text-charcoal mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600">
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
      <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="font-heading text-4xl font-bold text-charcoal mb-4">
              Perfect Gifts for Every Occasion
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl text-gray-600 max-w-2xl mx-auto">
              From birthdays to celebrations, find the ideal gift that matches the moment and creates lasting memories.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6"
          >
            {categoriesLoading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <motion.div key={index} variants={fadeInUp}>
                  <Card className="card-elegant text-center p-6">
                    <CardContent className="pt-6">
                      <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded mx-auto animate-pulse" />
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : categories.length === 0 ? (
              // No categories fallback
              <motion.div variants={fadeInUp} className="col-span-full text-center py-8">
                <p className="text-gray-500">No categories available</p>
              </motion.div>
            ) : (
              categories.map((category, index) => {
                const { color, icon } = getCategoryDisplay(category, index);
                return (
                  <motion.div key={category.id} variants={fadeInUp}>
                    <Link to="/products" search={{ category: category.name }}>
                      <Card className="card-elegant text-center p-6 hover:scale-105 transition-transform duration-300 cursor-pointer">
                        <CardContent className="pt-6">
                          <div className="w-16 h-16 rounded-full mx-auto mb-4 overflow-hidden">
                            {category.image_url ? (
                              <img
                                src={category.image_url}
                                alt={category.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${color} flex items-center justify-center text-2xl`}>
                                {icon}
                              </div>
                            )}
                          </div>
                          <h3 className="font-medium text-charcoal">
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
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="font-heading text-4xl font-bold text-charcoal mb-4">
              What Our Customers Say
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join thousands of satisfied customers who trust Simri for their special moments.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="card-elegant p-6">
                  <CardContent className="pt-6">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-semibold mr-4">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <h4 className="font-semibold text-charcoal">{testimonial.name}</h4>
                        <div className="flex items-center">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600 italic">
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
      <section className="py-20 bg-gradient-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-4xl font-bold text-white mb-4">
              Ready to Make Someone's Day?
            </h2>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              Browse our collection and find the perfect gift that speaks from your heart to theirs.
            </p>
            <Link to="/products">
              <Button size="lg" variant="secondary" className="btn-secondary text-lg px-8 py-4">
                <Gift className="mr-2 h-5 w-5" />
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