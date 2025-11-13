import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearch, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  Search,
  Star,
  Heart,
  ShoppingBag,
  ChevronDown,
  Package,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { LoadingSpinner } from '../components/ui/loading';
import Pagination from '../components/ui/pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

import { productService } from '../services/api';
import { useCartStore } from '../stores/cartStore';
import { useWishlistStore } from '../stores/wishlistStore';
import { useAuthStore } from '../stores/authStore';
import type { Product, SearchFilters, Category } from '../types';
import { toast } from 'sonner';

const Products: React.FC = () => {
  const searchParams = useSearch({ from: '/products' });
  const navigate = useNavigate({ from: '/products' });
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.q || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.q || '');
  const [filters, setFilters] = useState<SearchFilters>({
    category: searchParams.category || '',
    sortBy: (searchParams.sortBy as "relevance" | "price_low" | "price_high" | "rating" | "newest") || 'relevance',
    minPrice: searchParams.minPrice,
    maxPrice: searchParams.maxPrice,
    inStock: searchParams.inStock,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });

  // Store hooks
  const { addItem: addToCart, isLoading: cartLoading } = useCartStore();
  const { addItem: addToWishlist, isLoading: wishlistLoading } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = debouncedSearch
        ? await productService.searchProducts(debouncedSearch, filters, {
            page: pagination.page,
            limit: pagination.limit,
          })
        : await productService.getProducts(filters, {
            page: pagination.page,
            limit: pagination.limit,
          });

      setProducts(response.data?.products || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0,
        totalPages: response.pagination?.totalPages || 0,
      }));
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters, pagination.page, pagination.limit]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const cats = await productService.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  // Only debounce for real-time search, not form submissions
  useEffect(() => {
    // Don't auto-search while typing - only when URL params change
    if (searchParams.q !== searchQuery) {
      return; // User is typing, don't trigger search
    }
    
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchParams.q]);

  // Effects
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Update filters and search when URL params change
  useEffect(() => {
    setSearchQuery(searchParams.q || '');
    setDebouncedSearch(searchParams.q || '');
    setFilters({
      category: searchParams.category || '',
      sortBy: (searchParams.sortBy as "relevance" | "price_low" | "price_high" | "rating" | "newest") || 'relevance',
      minPrice: searchParams.minPrice,
      maxPrice: searchParams.maxPrice,
      inStock: searchParams.inStock,
    });
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handlers
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    setDebouncedSearch(searchQuery); // Immediately set debounced search on form submit
    
    // Update URL with search query
    const newSearch: any = { ...searchParams };
    if (searchQuery) {
      newSearch.q = searchQuery;
    } else {
      delete newSearch.q;
    }
    
    navigate({ search: newSearch });
  };

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
    
    // Update URL parameters
    const newSearch: any = {
      ...searchParams,
      ...newFilters,
    };
    
    // Remove empty/undefined values
    Object.keys(newSearch).forEach(key => {
      if (newSearch[key] === '' || newSearch[key] === undefined || newSearch[key] === null) {
        delete newSearch[key];
      }
    });
    
    navigate({ search: newSearch });
  };

  const handleAddToCart = async (product: Product) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to add items to cart');
      return;
    }
    
    try {
      await addToCart(product.id, 1);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  const handleAddToWishlist = async (product: Product) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to save items to wishlist');
      return;
    }

    try {
      await addToWishlist(product.id);
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
    }
  };

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Customer Rating' },
    { value: 'newest', label: 'Newest First' },
  ];

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 sm:px-8 lg:px-8 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto">

          {/* Page Header */}
          {filters.category && (
            <motion.div className="mb-6 sm:mb-8" {...fadeInUp}>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                {filters.category}
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Discover our curated collection of {filters.category.toLowerCase()}
              </p>
            </motion.div>
          )}

          {/* Search and Filters */}
          <motion.div
            className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6 sm:mb-8"
            {...fadeInUp}
          >
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Input
                    type="search"
                    placeholder="Search for perfect gifts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 text-sm sm:text-base"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </form>

              <div className="flex gap-2">
                {/* Sort */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1 sm:min-w-[160px] text-xs sm:text-sm">
                      <span className="hidden sm:inline">Sort by:</span>
                      <span className="sm:hidden">Sort</span>
                      <span className="hidden sm:inline ml-1">
                        {sortOptions.find(opt => opt.value === filters.sortBy)?.label}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {sortOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => handleFilterChange({ sortBy: option.value as any })}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Filters */}
                {/* <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden">
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      <span className="text-xs sm:text-sm">Filters</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full sm:w-80 bg-white">
                    <div className="py-4">
                      <h3 className="font-heading text-lg font-semibold mb-4">Filters</h3>
                      
                      <p className="text-gray-500 text-sm">Advanced filters coming soon...</p>
                    </div>
                  </SheetContent>
                </Sheet> */}
              </div>
            </div>

            {/* Quick filters */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant={!filters.category ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange({ category: '' })}
                className="text-xs sm:text-sm px-3 sm:px-4 py-2"
              >
                All Categories
              </Button>
              {categories.slice(0, 5).map((category) => (
                <Button
                  key={category.id}
                  variant={filters.category === category.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange({ category: category.name })}
                  className="text-xs sm:text-sm px-3 sm:px-4 py-2"
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Results Info */}
          {!loading && (
            <motion.div
              className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0"
              {...fadeInUp}
            >
              <p className="text-gray-600 text-sm sm:text-base">
                Showing {products.length} of {pagination.total} products
                {searchQuery && (
                  <span className="block sm:inline">
                    <span className="sm:hidden"><br /></span>
                    <span className="hidden sm:inline"> </span>for "{searchQuery}"
                  </span>
                )}
                {filters.category && (
                  <span className="block sm:inline">
                    <span className="sm:hidden"><br /></span>
                    <span className="hidden sm:inline"> </span>in "{filters.category}"
                  </span>
                )}
              </p>
              <div className="text-xs sm:text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </div>
            </motion.div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600 text-sm sm:text-base mt-3 sm:mt-0 sm:ml-3">Loading products...</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && products.length === 0 && (
            <motion.div
              className="text-center py-12 sm:py-16 px-4"
              {...fadeInUp}
            >
              <Package className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="font-heading text-lg sm:text-xl font-semibold text-gray-600 mb-2">
                No products found
              </h3>
              <p className="text-gray-500 mb-6 text-sm sm:text-base">
                {searchQuery
                  ? `No products match your search for "${searchQuery}"`
                  : 'No products available at the moment'
                }
              </p>
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setFilters({ sortBy: 'relevance' });
                }}
                className="text-sm sm:text-base px-4 sm:px-6"
              >
                Clear Filters
              </Button>
            </motion.div>
          )}

          {/* Products Grid */}
          {!loading && products.length > 0 && (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
                    onAddToWishlist={handleAddToWishlist}
                    cartLoading={cartLoading}
                    wishlistLoading={wishlistLoading}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Enhanced Pagination */}
          <motion.div
            className="mt-8 sm:mt-12"
            {...fadeInUp}
          >
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
              onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
              onItemsPerPageChange={(limit) => {
                setPagination(prev => ({ ...prev, limit, page: 1 }));
              }}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

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
      <div className="relative">
        <Link to="/products/$productId" params={{ productId: product.id }} className="block">
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
        </Link>
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

      <Link to="/products/$productId" params={{ productId: product.id }} className="flex flex-col flex-grow">
        <CardContent className="p-2 sm:p-3 lg:p-4 flex flex-col flex-grow">
          <Badge variant="secondary" className="text-xs mb-2 w-fit">
            {product.category_name}
          </Badge>
          <h3 className="font-heading text-xs sm:text-sm lg:text-base font-semibold text-royal-black mb-2 line-clamp-2 flex-grow hover:text-royal-gold transition-colors">
            {product.name}
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

        </CardContent>
      </Link>

      <div className="p-2 sm:p-3 lg:p-4 pt-0">
        <Button
          className="w-full btn-primary text-xs sm:text-sm"
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
      </div>
    </Card>
  );
};

export default Products;
