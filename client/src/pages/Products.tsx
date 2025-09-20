import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearch, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  Search,
  Star,
  Heart,
  ShoppingBag,
  ChevronDown,
  SlidersHorizontal,
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
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
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
  const [viewMode] = useState<'grid' | 'list'>('grid');
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">

          {/* Page Header */}
          {filters.category && (
            <motion.div className="mb-6" {...fadeInUp}>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {filters.category}
              </h1>
              <p className="text-gray-600">
                Discover our curated collection of {filters.category.toLowerCase()}
              </p>
            </motion.div>
          )}

          {/* Search and Filters */}
          <motion.div 
            className="bg-white rounded-lg shadow-sm border p-6 mb-8"
            {...fadeInUp}
          >
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Input
                    type="search"
                    placeholder="Search for perfect gifts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </form>

              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-w-[160px]">
                    Sort by: {sortOptions.find(opt => opt.value === filters.sortBy)?.label}
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
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <div className="py-4">
                    <h3 className="font-heading text-lg font-semibold mb-4">Filters</h3>
                    {/* Filter content would go here */}
                    <p className="text-gray-500">Advanced filters coming soon...</p>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Quick filters */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant={!filters.category ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange({ category: '' })}
              >
                All Categories
              </Button>
              {categories.slice(0, 5).map((category) => (
                <Button
                  key={category.id}
                  variant={filters.category === category.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange({ category: category.name })}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Results Info */}
          {!loading && (
            <motion.div 
              className="flex items-center justify-between mb-6"
              {...fadeInUp}
            >
              <p className="text-gray-600">
                Showing {products.length} of {pagination.total} products
                {searchQuery && ` for "${searchQuery}"`}
                {filters.category && ` in "${filters.category}"`}
              </p>
              <div className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </div>
            </motion.div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600">Loading products...</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && products.length === 0 && (
            <motion.div 
              className="text-center py-16"
              {...fadeInUp}
            >
              <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="font-heading text-xl font-semibold text-gray-600 mb-2">
                No products found
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery 
                  ? `No products match your search for "${searchQuery}"`
                  : 'No products available at the moment'
                }
              </p>
              <Button onClick={() => {
                setSearchQuery('');
                setFilters({ sortBy: 'relevance' });
              }}>
                Clear Filters
              </Button>
            </motion.div>
          )}

          {/* Products Grid */}
          {!loading && products.length > 0 && (
            <motion.div 
              className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                : "space-y-4"
              }
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ProductCard 
                    product={product}
                    viewMode={viewMode}
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
            className="mt-12"
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
  viewMode: 'grid' | 'list';
  onAddToCart: (product: Product) => void;
  onAddToWishlist: (product: Product) => void;
  cartLoading: boolean;
  wishlistLoading: boolean;
}> = ({ product, viewMode, onAddToCart, onAddToWishlist, cartLoading, wishlistLoading }) => {
  if (viewMode === 'list') {
    return (
      <Card className="card-elegant overflow-hidden">
        <div className="flex">
          <div className="flex-shrink-0 w-48 h-32">
            <img
              src={product.images?.[0] ? getImageUrl(product.images[0], 'medium') : '/placeholder-product.jpg'}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-product.jpg';
              }}
            />
          </div>
          <CardContent className="flex-1 p-6">
            <div className="flex justify-between">
              <div className="flex-1">
                <h3 className="font-heading text-lg font-semibold text-charcoal mb-2">
                  <Link to="/products/$productId" params={{ productId: product.id }} className="hover:text-purple-600 transition-colors">
                    {product.name}
                  </Link>
                </h3>
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-gray-600 ml-1">
                      {product.averageRating || 'N/A'} ({product.totalReviews || 0})
                    </span>
                  </div>
                  <Badge variant="secondary">{product.category_name}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {product.discount_price ? (
                      <>
                        <span className="text-lg font-bold text-charcoal">
                          ₹{product.discount_price}
                        </span>
                        <span className="text-sm text-gray-500 line-through">
                          ₹{product.price}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-charcoal">
                        ₹{product.price}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAddToWishlist(product)}
                      disabled={wishlistLoading}
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onAddToCart(product)}
                      disabled={cartLoading || product.stock_quantity === 0}
                      className="btn-primary"
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    );
  }

  return (
    <Card className="card-elegant group hover-lift overflow-hidden">
      <div className="relative">
        <div className="aspect-square overflow-hidden">
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
          <Badge className="absolute top-2 left-2 bg-red-500 text-white">
            {Math.round((1 - parseFloat(product.discount_price) / parseFloat(product.price)) * 100)}% OFF
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 bg-white/80 hover:bg-white"
          onClick={() => onAddToWishlist(product)}
          disabled={wishlistLoading}
        >
          <Heart className="h-4 w-4" />
        </Button>
      </div>
      
      <CardContent className="p-4">
        <Badge variant="secondary" className="text-xs mb-2">
          {product.category_name}
        </Badge>
        <h3 className="font-heading text-base font-semibold text-charcoal mb-2 line-clamp-2">
          <Link to="/products/$productId" params={{ productId: product.id }} className="hover:text-purple-600 transition-colors">
            {product.name}
          </Link>
        </h3>
        
        {(product.averageRating || product.totalReviews) && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-600">
              {product.averageRating || 'N/A'} ({product.totalReviews || 0})
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          {product.discount_price ? (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-charcoal">
                ₹{product.discount_price}
              </span>
              <span className="text-sm text-gray-500 line-through">
                ₹{product.price}
              </span>
            </div>
          ) : (
            <span className="text-lg font-bold text-charcoal">
              ₹{product.price}
            </span>
          )}
        </div>

        <Button
          className="w-full btn-primary"
          size="sm"
          onClick={() => onAddToCart(product)}
          disabled={cartLoading || product.stock_quantity === 0}
        >
          {product.stock_quantity === 0 ? (
            'Out of Stock'
          ) : (
            <>
              <ShoppingBag className="h-4 w-4 mr-2" />
              Add to Cart
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default Products;
