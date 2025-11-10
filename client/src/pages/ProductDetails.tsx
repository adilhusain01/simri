import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  Star,
  Heart,
  ShoppingBag,
  Plus,
  Minus,
  Share2,
  Package,
  Truck,
  Shield,
  RotateCcw,
  ThumbsUp,
  MessageCircle,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent} from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import LoadingSpinner from '../components/ui/loading';
import { Textarea } from '../components/ui/textarea';
import { ReviewImageUpload } from '../components/ui/file-upload';
import { ImageModal } from '../components/ui/image-modal';
// Removed tabs import - using vertical sequence layout instead
import { productService, reviewService, recommendationService } from '../services/api';
import { useCartStore } from '../stores/cartStore';
import { useWishlistStore } from '../stores/wishlistStore';
import { useAuthStore } from '../stores/authStore';
import { InventoryTracker } from '../components/ui/inventory-tracker';
import type { Product, Review, Recommendation } from '../types';
import { toast } from 'sonner';

// interface ProductDetailsProps {
//   productId: string;
// }

const ProductDetails: React.FC = () => {
  const navigate = useNavigate();
  const { productId } = useParams({ from: '/products/$productId' });
  const { isAuthenticated } = useAuthStore();
  const { addItem: addToCart, isLoading: cartLoading } = useCartStore();
  const { addItem: addToWishlist, isLoading: wishlistLoading } = useWishlistStore();

  // State
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Recommendation[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: '',
    images: [] as string[],
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewImageFiles, setReviewImageFiles] = useState<File[]>([]);

  // Image modal state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalInitialIndex, setModalInitialIndex] = useState(0);
  const [modalTitle, setModalTitle] = useState('');
  const [userHasReviewed, setUserHasReviewed] = useState(false);

  // Function to open image modal
  const openImageModal = (images: string[], initialIndex: number, title: string) => {
    const fullImageUrls = images.map(image => 
      image.startsWith('http') ? image : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${image}`
    );
    setModalImages(fullImageUrls);
    setModalInitialIndex(initialIndex);
    setModalTitle(title);
    setImageModalOpen(true);
  };

  // Load product details
  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const productData = await productService.getProduct(productId);
        setProduct(productData);
      } catch (error) {
        console.error('Failed to load product:', error);
        navigate({ 
          to: '/products',
          search: {
            category: '',
            q: '',
            sortBy: 'relevance',
            minPrice: undefined,
            maxPrice: undefined,
            inStock: false,
            featured: false
          }
        });
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      loadProduct();
    }
  }, [productId, navigate]);

  // Load reviews
  useEffect(() => {
    const loadReviews = async () => {
      if (!product) return;
      
      try {
        setReviewsLoading(true);
        const reviewsData = await reviewService.getProductReviews(product.id, { page: 1, limit: 10 });
        const reviewsList = reviewsData.data.reviews;
        setReviews(reviewsList);
        
        // Check if current user has already reviewed this product
        if (isAuthenticated) {
          const { user } = useAuthStore.getState();
          const hasReviewed = reviewsList.some(review => review.user_id === user?.id);
          setUserHasReviewed(hasReviewed);
        }
      } catch (error) {
        console.error('Failed to load reviews:', error);
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };

    loadReviews();
  }, [product, isAuthenticated]);

  // Load related products
  useEffect(() => {
    const loadRelatedProducts = async () => {
      if (!product) return;
      
      try {
        setRelatedLoading(true);
        const related = await recommendationService.getRelatedProducts(product.id, 8);
        setRelatedProducts(related);
      } catch (error) {
        console.error('Failed to load related products:', error);
      } finally {
        setRelatedLoading(false);
      }
    };

    loadRelatedProducts();
  }, [product]);

  // Handlers
  const handleAddToCart = async () => {
    if (!product || !isAuthenticated) {
      toast.error('Please sign in to add items to cart');
      return;
    }
    
    try {
      await addToCart(product.id, quantity);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add to cart');
    }
  };

  const handleAddToWishlist = async () => {
    if (!product || !isAuthenticated) {
      toast.error('Please sign in to save items to wishlist');
      return;
    }

    try {
      await addToWishlist(product.id);
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      toast.error('Failed to add to wishlist');
    }
  };

  const handleShare = async () => {
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !isAuthenticated) return;

    try {
      setReviewSubmitting(true);
      
      // Upload images first if any are selected
      let uploadedImagePaths: string[] = [];
      if (reviewImageFiles.length > 0) {
        console.log('📸 Uploading images before review submission:', reviewImageFiles.length);
        try {
          // Create FormData for file upload
          const formData = new FormData();
          reviewImageFiles.forEach((file) => {
            formData.append(`images`, file);
          });

          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/upload/review-images`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
          }

          const result = await response.json();
          uploadedImagePaths = result.data?.images || [];
          console.log('✅ Images uploaded successfully:', uploadedImagePaths);
        } catch (uploadError) {
          console.error('❌ Image upload failed:', uploadError);
          throw new Error('Failed to upload images. Please try again.');
        }
      }
      
      console.log('🚀 Submitting review with data:', {
        productId: product.id,
        rating: reviewForm.rating,
        title: reviewForm.title,
        comment: reviewForm.comment,
        images: uploadedImagePaths,
        imageCount: uploadedImagePaths.length
      });
      
      const review = await reviewService.addReview({
        productId: product.id,
        rating: reviewForm.rating,
        title: reviewForm.title,
        comment: reviewForm.comment,
        images: uploadedImagePaths,
      });
      
      setReviews(prev => [review, ...prev]);
      setShowReviewForm(false);
      setReviewForm({ rating: 5, title: '', comment: '', images: [] });
      setReviewImageFiles([]); // Clear selected files
      setUserHasReviewed(true); // User has now reviewed this product
      toast.success('Review added successfully!');
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error('Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={interactive && onRatingChange ? () => onRatingChange(star) : undefined}
          />
        ))}
      </div>
    );
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading product...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Product not found</h3>
          <p className="text-gray-500">The product you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Helper function to extract image URL from Cloudinary object or use string directly
  const getImageUrl = (imageData: any, size: 'thumb' | 'medium' | 'large' | 'original' = 'large') => {
    if (typeof imageData === 'string') {
      return imageData; // Legacy string format
    }
    if (typeof imageData === 'object' && imageData) {
      return imageData[size] || imageData.original || imageData.large || imageData.medium || imageData.thumb;
    }
    return '/placeholder-product.jpg';
  };

  const images = product.images && product.images.length > 0 ? product.images : [product.imageUrl];
  const currentPrice = product.discount_price || product.price;
  const discount = product.discount_price ? Math.round((1 - parseFloat(product.discount_price) / parseFloat(product.price)) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Product Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
            
            {/* Product Images */}
            <motion.div className="space-y-4" {...fadeInUp}>
              {/* Main Image */}
              <div className="aspect-[3/4] bg-white rounded-lg overflow-hidden border">
                <img
                  src={getImageUrl(images[selectedImage], 'large')}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-product.jpg';
                  }}
                />
              </div>
              
              {/* Thumbnail Images */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                        selectedImage === index ? 'border-royal-gold' : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={getImageUrl(image, 'thumb')}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-product.jpg';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Product Info */}
            <motion.div className="space-y-6" {...fadeInUp}>
              <div>
                <Badge variant="secondary" className="mb-2">
                  {product.category}
                </Badge>
                <h1 className="font-heading text-3xl font-bold text-royal-black mb-2">
                  {product.name}
                </h1>
                {product.short_description && (
                  <p className="text-lg text-gray-600 mb-3 leading-relaxed">
                    {product.short_description}
                  </p>
                )}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    {renderStars(Number(product.averageRating || 0))}
                    <span className="text-sm text-gray-600">
                      {Number(product.averageRating || 0).toFixed(1)} ({product.totalReviews || 0} reviews)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShare}
                    className="text-gray-600"
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-royal-black">
                  ₹{parseFloat(currentPrice?.toString() || '0').toLocaleString()}
                </span>
                {product.discount_price && (
                  <>
                    <span className="text-lg text-gray-500 line-through">
                      ₹{parseFloat(product.price).toLocaleString()}
                    </span>
                    <Badge className="bg-red-500 text-white">
                      {discount}% OFF
                    </Badge>
                  </>
                )}
              </div>

              {/* Description */}
              <p className="text-gray-600 leading-relaxed">
                {product.description}
              </p>

              {/* Product Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Inventory Tracker */}
              <InventoryTracker
                productId={product.id}
                initialStock={product.stock_quantity}
                className="mb-4"
              />

              {/* Quantity and Add to Cart */}
              {product.stock_quantity > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700">Quantity:</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-12 text-center font-medium">{quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                        disabled={quantity >= product.stock_quantity}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleAddToCart}
                      disabled={cartLoading}
                      className="flex-1 btn-primary"
                      size="lg"
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      {cartLoading ? 'Adding...' : 'Add to Cart'}
                    </Button>
                    <Button
                      onClick={handleAddToWishlist}
                      disabled={wishlistLoading}
                      variant="outline"
                      size="lg"
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Product Specifications */}
              {(product.sku || product.weight || product.dimensions) && (
                <div className="space-y-3 pt-6 border-t">
                  <h3 className="text-lg font-semibold text-royal-black">Product Specifications</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {product.sku && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">SKU:</span>
                        <span className="font-medium">{product.sku}</span>
                      </div>
                    )}
                    {product.weight && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Weight:</span>
                        <span className="font-medium">{product.weight} kg</span>
                      </div>
                    )}
                    {product.dimensions && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dimensions:</span>
                        <span className="font-medium">
                          {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} cm
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Features */}
              <div className="grid grid-cols-2 gap-4 pt-6 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Truck className="h-4 w-4" />
                  <span>Free shipping above ₹999</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="h-4 w-4" />
                  <span>Secure payment</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <RotateCcw className="h-4 w-4" />
                  <span>Easy returns</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package className="h-4 w-4" />
                  <span>Quality assured</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Description Section */}
          <motion.div {...fadeInUp} className="mb-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-royal-black mb-4">Description</h2>
            </div>
            <Card>
              <CardContent className="p-6">
                <div className="prose max-w-none space-y-4">
                  {product.short_description && product.short_description !== product.description && (
                    <div>
                      <h3 className="text-lg font-semibold text-royal-black mb-2">Overview</h3>
                      <p className="text-gray-700 leading-relaxed">
                        {product.short_description}
                      </p>
                    </div>
                  )}
                  <div>
                    {product.short_description && product.short_description !== product.description && (
                      <h3 className="text-lg font-semibold text-royal-black mb-2">Detailed Description</h3>
                    )}
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {product.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Related Products Section */}
          <motion.div {...fadeInUp} className="mb-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-royal-black mb-4">Related Products</h2>
            </div>
            {relatedLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            ) : relatedProducts.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No related products</h3>
                  <p className="text-gray-500">Check out our other products!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((relatedProduct) => (
                  <Card key={relatedProduct.id} className="card-elegant group hover-lift overflow-hidden p-0">
                    <div className="aspect-[3/4] overflow-hidden">
                      <img
                        src={relatedProduct.images?.[0] 
                          ? getImageUrl(relatedProduct.images[0], 'medium')
                          : relatedProduct.imageUrl || '/placeholder-product.jpg'
                        }
                        alt={relatedProduct.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-product.jpg';
                        }}
                      />
                    </div>
                    <CardContent className="p-4">
                      <Badge variant="secondary" className="text-xs mb-2">
                        {relatedProduct.category}
                      </Badge>
                      <h3 className="font-heading text-sm font-semibold text-royal-black mb-2 line-clamp-2">
                        {relatedProduct.name}
                      </h3>
                      <div className="flex items-center gap-1 mb-2">
                        {renderStars(relatedProduct.averageRating || 0)}
                        <span className="text-xs text-gray-600">
                          ({relatedProduct.totalReviews || 0})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-royal-black">
                          ₹{parseFloat(relatedProduct.price?.toString() || '0').toLocaleString()}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate({ 
                            to: `/products/${relatedProduct.id}`
                          })}
                        >
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>

          {/* Reviews Section */}
          <motion.div {...fadeInUp} className="mb-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-royal-black mb-4">
                Reviews ({product.totalReviews || 0})
              </h2>
              </div>
                {/* Add Review Button */}
                {isAuthenticated && (
                  <Card>
                    <CardContent className="p-6">
                      {userHasReviewed ? (
                        <div className="text-center text-gray-600">
                          <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="font-medium">You have already reviewed this product</p>
                          <p className="text-sm text-gray-500">Thank you for your feedback!</p>
                        </div>
                      ) : !showReviewForm ? (
                        <Button onClick={() => setShowReviewForm(true)}>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Write a Review
                        </Button>
                      ) : (
                        <form onSubmit={handleReviewSubmit} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Rating</label>
                            {renderStars(reviewForm.rating, true, (rating) => 
                              setReviewForm(prev => ({ ...prev, rating }))
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Title (optional)</label>
                            <Input
                              value={reviewForm.title}
                              onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="Brief summary of your review"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Review</label>
                            <Textarea
                              value={reviewForm.comment}
                              onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                              placeholder="Share your experience with this product"
                              rows={4}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Photos (optional)</label>
                            <ReviewImageUpload
                              clientOnly={true}
                              onFilesSelected={(files) => {
                                console.log('📝 Review form receiving files:', files);
                                setReviewImageFiles(files);
                              }}
                              disabled={reviewSubmitting}
                              className="max-w-md"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="submit"
                              disabled={reviewSubmitting}
                              className="btn-primary"
                            >
                              {reviewSubmitting ? (
                                <>
                                  <LoadingSpinner size="sm" className="mr-2" />
                                  Submitting...
                                </>
                              ) : (
                                'Submit Review'
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={reviewSubmitting}
                              onClick={() => {
                                setShowReviewForm(false);
                                setReviewForm({ rating: 5, title: '', comment: '', images: [] });
                                setReviewImageFiles([]);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      )}
                    </CardContent>
                  </Card>
                )}

                <br/>                
                {/* Reviews List */}
                {reviewsLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="md" />
                  </div>
                ) : reviews.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 mb-2">No reviews yet</h3>
                      <p className="text-gray-500">Be the first to review this product!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <Card key={review.id}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{review.user_name || review.user?.name || 'Anonymous'}</span>
                                {(review.is_verified_purchase || review.isVerified) && (
                                  <Badge variant="outline" className="text-xs">
                                    Verified Purchase
                                  </Badge>
                                )}
                              </div>
                              {renderStars(review.rating)}
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(review.created_at || review.createdAt || '').toLocaleDateString()}
                            </span>
                          </div>
                          {review.title && (
                            <h4 className="font-medium mb-2">{review.title}</h4>
                          )}
                          <p className="text-gray-700 mb-3">{review.comment}</p>
                          
                          {/* Review Images */}
                          {review.images && review.images.length > 0 && (
                            <div className="flex gap-2 mb-3">
                              {review.images.map((image, index) => (
                                <button
                                  key={index}
                                  onClick={() => openImageModal(
                                    review.images!, 
                                    index, 
                                    `Review by ${review.user_name}`
                                  )}
                                  className="relative overflow-hidden rounded-lg border hover:border-blue-500 transition-colors cursor-pointer group"
                                >
                                  <img
                                    src={image.startsWith('http') ? image : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${image}`}
                                    alt={`Review image ${index + 1}`}
                                    className="w-16 h-16 object-cover group-hover:scale-105 transition-transform"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      console.log('Image failed to load:', image);
                                    }}
                                  />
                                  {review.images!.length > 1 && index === 0 && (
                                    <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                      +{review.images!.length - 1}
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {/* Helpful Button */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-600 hover:text-gray-800"
                            >
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              Helpful ({review.helpful_count || 0})
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

          </motion.div>
      </div>
      </div>
      
      {/* Image Modal */}
      <ImageModal
        images={modalImages}
        initialIndex={modalInitialIndex}
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        title={modalTitle}
      />
    </div>
  );
};

export default ProductDetails;