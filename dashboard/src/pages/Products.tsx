import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import ProductImageUpload from '@/components/ui/product-image-upload';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { productService, categoryService, uploadService } from '@/services/api';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import type { Product } from '@/types';
import Pagination from '@/components/ui/pagination';

// Utility function to generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
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

// Helper function to convert Cloudinary objects to URL strings for ProductImageUpload
const extractImageUrls = (images: any[]): string[] => {
  return images.map(image => getImageUrl(image, 'medium'));
};

interface ProductImageData {
  url: string | {original: string, thumb: string, medium: string, large: string};
  isPrimary: boolean;
}


// Helper function to get the final URL for form submission
const getFinalUrl = (url: string | {original: string, thumb: string, medium: string, large: string}): string => {
  if (typeof url === 'string') {
    return url;
  }
  return url.original;
};

interface ProductDimensions {
  length: number;
  width: number;
  height: number;
}

interface ProductFormData {
  name: string;
  slug?: string;
  description: string;
  short_description: string;
  sku: string;
  price: number;
  discount_price?: number;
  stock_quantity: number;
  category_id: string;
  is_featured: boolean;
  is_active: boolean;
  weight?: number;
  dimensions?: ProductDimensions;
  tags: string[];
  meta_title?: string;
  meta_description?: string;
  images: string[];
  imageMetadata: ProductImageData[];
}

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    slug: '',
    description: '',
    short_description: '',
    sku: '',
    price: 0,
    discount_price: undefined,
    stock_quantity: 0,
    category_id: '',
    is_featured: false,
    is_active: true,
    weight: undefined,
    dimensions: undefined,
    tags: [],
    meta_title: '',
    meta_description: '',
    images: [],
    imageMetadata: [],
  });
  
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const queryClient = useQueryClient();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', { 
      search: debouncedSearch, 
      status: statusFilter, 
      page: currentPage, 
      limit: itemsPerPage 
    }],
    queryFn: () => productService.getAll({
      search: debouncedSearch,
      status: statusFilter,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
    }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
  });

  const products = data?.data?.products || [];
  const categories = categoriesData || [];
  const pagination = data?.pagination;
  const totalItems = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 1;

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: (productData: Partial<Product>) => productService.create(productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
      setShowAddModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create product');
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => 
      productService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
      setShowEditModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update product');
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => productService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
      setShowDeleteModal(false);
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      short_description: '',
      sku: '',
      price: 0,
      discount_price: undefined,
      stock_quantity: 0,
      category_id: '',
      is_featured: false,
      is_active: true,
      weight: undefined,
      dimensions: undefined,
      tags: [],
      meta_title: '',
      meta_description: '',
      images: [],
      imageMetadata: [],
    });
    setSelectedImageFiles([]);
    setSelectedProduct(null);
  };

  const handleAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    
    // Create initial image metadata with first image as primary
    const imageUrls = extractImageUrls(product.images || []);
    const initialImageMetadata: ProductImageData[] = imageUrls.map((url, index) => ({
      url,
      isPrimary: index === 0, // First image is primary by default
    }));
    
    setFormData({
      name: product.name,
      slug: product.slug || '',
      description: product.description,
      short_description: product.short_description || '',
      sku: product.sku,
      price: product.price,
      discount_price: product.discount_price,
      stock_quantity: product.stock_quantity,
      category_id: product.category_id,
      is_featured: product.is_featured,
      is_active: product.is_active,
      weight: product.weight,
      dimensions: product.dimensions,
      tags: product.tags || [],
      meta_title: product.meta_title || '',
      meta_description: product.meta_description || '',
      images: imageUrls,
      imageMetadata: initialImageMetadata,
    });
    setSelectedImageFiles([]);
    setShowEditModal(true);
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const handleSubmit = async () => {
    try {
      setIsUploading(true);
      
      let finalFormData = { ...formData };
      
      // Generate slug from name if not provided or empty
      if (!finalFormData.slug || finalFormData.slug.trim() === '') {
        finalFormData.slug = generateSlug(finalFormData.name);
      }
      
      // Get the current image metadata (this includes any primary image changes)
      let currentImageMetadata = [...(finalFormData.imageMetadata || [])];
      
      // Upload new images if any are selected
      if (selectedImageFiles.length > 0) {
        try {
          const uploadedImageUrls = await uploadService.uploadProductImages(selectedImageFiles);
          
          // Find any blob URLs in current metadata (these are new images that need real URLs)
          const updatedMetadata = currentImageMetadata.map(imgMeta => {
            // If this is a blob URL, it's a new image that needs to be replaced with uploaded URL
            if (typeof imgMeta.url === 'string' && imgMeta.url.startsWith('blob:')) {
              // Find the corresponding uploaded URL (match by index in the files array)
              const blobIndex = currentImageMetadata.filter(m => typeof m.url === 'string' && m.url.startsWith('blob:')).indexOf(imgMeta);
              if (blobIndex >= 0 && blobIndex < uploadedImageUrls.length) {
                return {
                  ...imgMeta,
                  url: uploadedImageUrls[blobIndex]
                };
              }
            }
            return imgMeta;
          });
          
          // Add any remaining uploaded URLs that weren't matched (shouldn't happen, but safety net)
          const usedUrls = updatedMetadata.map(m => getFinalUrl(m.url));
          const unusedUrls = uploadedImageUrls.filter(url => !usedUrls.includes(getFinalUrl(url)));
          const additionalMetadata: ProductImageData[] = unusedUrls.map(url => ({
            url,
            isPrimary: false,
          }));
          
          currentImageMetadata = [...updatedMetadata, ...additionalMetadata];
          
          toast.success(`${uploadedImageUrls.length} images uploaded successfully`);
        } catch (uploadError: any) {
          toast.error(`Failed to upload images: ${uploadError.message}`);
          return;
        }
      }

      // Reorder images based on primary selection: primary image first, then others
      const orderedImages = [...currentImageMetadata];
      orderedImages.sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return 0;
      });
      
      // Extract just the URLs in the correct order for the server
      finalFormData.images = orderedImages.map(img => getFinalUrl(img.url));
      
      // Clean up dimensions - only send if all three values are provided
      if (finalFormData.dimensions) {
        const { length, width, height } = finalFormData.dimensions;
        if (!length || !width || !height) {
          finalFormData.dimensions = undefined;
        }
      }

      // Remove imageMetadata from final data as server doesn't need it
      const { imageMetadata, ...serverData } = finalFormData;

      // Submit product data
      if (selectedProduct) {
        updateMutation.mutate({ id: selectedProduct.id, data: serverData });
      } else {
        createMutation.mutate(serverData);
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDelete = () => {
    if (selectedProduct) {
      deleteMutation.mutate(selectedProduct.id);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  // Reset to first page when filters change (excluding searchTerm since it's debounced)
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading text-royal-black">Products</h1>
          <p className="text-muted-foreground font-body">
            Manage your product catalog ({totalItems} total products)
          </p>
        </div>
        <Button onClick={handleAdd} className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card className="card-elegant hover-lift">
        <CardHeader>
          <CardTitle className="font-heading text-royal-black">Search & Filter</CardTitle>
          <CardDescription className="font-body">
            Find specific products or filter by status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products by name, SKU, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setStatusFilter(statusFilter === 'active' ? '' : 'active')}
                className={statusFilter === 'active' ? 'bg-primary text-primary-foreground' : ''}
              >
                <Filter className="mr-2 h-4 w-4" />
                Active Only
              </Button>
              <Button 
                variant="outline"
                onClick={() => setStatusFilter(statusFilter === 'inactive' ? '' : 'inactive')}
                className={statusFilter === 'inactive' ? 'bg-primary text-primary-foreground' : ''}
              >
                <Filter className="mr-2 h-4 w-4" />
                Inactive Only
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="card-elegant hover-lift">
        <CardHeader>
          <CardTitle className="font-heading text-royal-black">Products ({products.length})</CardTitle>
          <CardDescription className="font-body">
            Complete list of your products
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-admin-red font-body">Error loading products</p>
              <Button variant="outline" onClick={() => window.location.reload()} className="font-body">
                Retry
              </Button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <div className="h-16 w-16 rounded-full bg-royal-gold/10 flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-royal-gold" />
              </div>
              <p className="text-muted-foreground font-body">No products found</p>
              <Button className="mt-4 btn-primary font-body" onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Product
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          {product.images?.[0] ? (
                            <img 
                              src={getImageUrl(product.images[0], 'thumb')} 
                              alt={product.name}
                              className="h-10 w-10 rounded-lg object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder-product.jpg';
                              }}
                            />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium font-body text-royal-black">{product.name}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px] font-body">
                            {product.short_description || product.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {product.sku}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {product.category_name || 'Uncategorized'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium font-heading text-royal-black">{formatCurrency(product.price)}</p>
                        {product.discount_price && (
                          <p className="text-sm text-muted-foreground line-through font-body">
                            {formatCurrency(product.discount_price)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className={
                          product.stock_quantity <= 10 
                            ? 'text-red-600 font-medium' 
                            : 'text-foreground'
                        }>
                          {product.stock_quantity}
                        </span>
                        {product.stock_quantity <= 10 && (
                          <Badge variant="destructive" className="text-xs">
                            Low Stock
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={product.is_active ? 'success' : 'secondary'}
                        className={getStatusColor(product.is_active ? 'active' : 'inactive')}
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-body">
                        {formatDate(product.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(product)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(product)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        
        {/* Pagination */}
        <div className="border-t pt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
      </Card>

      {/* Add/Edit Product Modal */}
      <Dialog open={showAddModal || showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowAddModal(false);
          setShowEditModal(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-ivory-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-royal-black">
              {selectedProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription className="font-body">
              {selectedProduct ? 'Update product information' : 'Create a new product for your catalog'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-body text-royal-black">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku" className="font-body text-royal-black">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Enter SKU"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="short_description" className="font-body text-royal-black">Short Description</Label>
              <Input
                id="short_description"
                value={formData.short_description}
                onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                placeholder="Brief product description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="font-body text-royal-black">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed product description"
                rows={3}
              />
            </div>

            {/* Category and Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="font-body text-royal-black">Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight" className="font-body text-royal-black">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={formData.weight || ''}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Product weight"
                />
              </div>
            </div>

            {/* Dimensions */}
            <div className="space-y-2">
              <Label className="font-body text-royal-black">Dimensions (cm)</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="length" className="text-xs text-gray-600 font-body">Length</Label>
                  <Input
                    id="length"
                    type="number"
                    step="0.1"
                    value={formData.dimensions?.length || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      dimensions: {
                        ...formData.dimensions,
                        length: e.target.value ? parseFloat(e.target.value) : 0,
                        width: formData.dimensions?.width || 0,
                        height: formData.dimensions?.height || 0,
                      }
                    })}
                    placeholder="L"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="width" className="text-xs text-gray-600 font-body">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    step="0.1"
                    value={formData.dimensions?.width || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      dimensions: {
                        ...formData.dimensions,
                        length: formData.dimensions?.length || 0,
                        width: e.target.value ? parseFloat(e.target.value) : 0,
                        height: formData.dimensions?.height || 0,
                      }
                    })}
                    placeholder="W"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="height" className="text-xs text-gray-600 font-body">Height</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={formData.dimensions?.height || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      dimensions: {
                        ...formData.dimensions,
                        length: formData.dimensions?.length || 0,
                        width: formData.dimensions?.width || 0,
                        height: e.target.value ? parseFloat(e.target.value) : 0,
                      }
                    })}
                    placeholder="H"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 font-body">Enter dimensions in centimeters (used for shipping calculations)</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="font-body text-royal-black">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_price" className="font-body text-royal-black">Discount Price (₹)</Label>
                <Input
                  id="discount_price"
                  type="number"
                  value={formData.discount_price || ''}
                  onChange={(e) => setFormData({ ...formData, discount_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_quantity" className="font-body text-royal-black">Stock Quantity *</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            {/* SEO and Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meta_title" className="font-body text-royal-black">Meta Title</Label>
                <Input
                  id="meta_title"
                  value={formData.meta_title || ''}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  placeholder="SEO title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags" className="font-body text-royal-black">Tags (comma separated)</Label>
                <Textarea
                  id="tags"
                  value={formData.tags.join(', ')}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) })}
                  placeholder="tag1, tag2, tag3"
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_description" className="font-body text-royal-black">Meta Description</Label>
              <Textarea
                id="meta_description"
                value={formData.meta_description || ''}
                onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                placeholder="SEO description"
                rows={2}
              />
            </div>

            {/* Product Images */}
            <div className="space-y-2">
              <Label className="font-body text-royal-black">Product Images</Label>
              <ProductImageUpload
                initialImages={formData.images}
                onFilesSelected={(files) => {
                  setSelectedImageFiles(files);
                }}
                onImagesChange={(imageData) => {
                  // Update the image metadata when primary image changes or images are reordered
                  setFormData(prev => ({
                    ...prev,
                    imageMetadata: imageData,
                    images: imageData.map(img => getFinalUrl(img.url)),
                  }));
                }}
                maxFiles={8}
                disabled={createMutation.isPending || updateMutation.isPending || isUploading}
                mode="client-only"
                className="w-full"
              />
            </div>

            {/* Status Toggles */}
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-body text-royal-black">Active</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-body text-royal-black">Featured</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                resetForm();
              }}
              className="font-body"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending || isUploading}
              className="btn-primary font-body"
            >
              {createMutation.isPending || updateMutation.isPending || isUploading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isUploading ? 'Uploading Images...' : (selectedProduct ? 'Updating...' : 'Creating...')}
                </div>
              ) : (
                selectedProduct ? 'Update Product' : 'Create Product'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-ivory-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-royal-black">Delete Product</DialogTitle>
            <DialogDescription className="font-body">
              Are you sure you want to delete "{selectedProduct?.name}"? This action cannot be undone and will also delete all related reviews and data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="font-body">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="font-body"
            >
              {deleteMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </div>
              ) : (
                'Delete Product'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}