import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, FolderTree, Tag, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { categoryService, uploadService } from '@/services/api';
import type { Category } from '@/types';

// Generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  parent_id: string;
  is_active: boolean;
  image_url?: string;
}

const initialFormData: CategoryFormData = {
  name: '',
  slug: '',
  description: '',
  parent_id: '',
  is_active: true,
  image_url: '',
};

// CategoryForm component moved outside to prevent re-creation
interface CategoryFormProps {
  formData: CategoryFormData;
  setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  handleSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  editingCategory: Category | null;
  availableParents: Category[];
  onCancel: () => void;
  selectedImageFile: File | null;
  setSelectedImageFile: (file: File | null) => void;
  categories: Category[];
}

// Image Upload Component
const CategoryImageUpload: React.FC<{
  imageUrl?: string;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  onImageRemove: () => void;
}> = ({ imageUrl, selectedFile, onFileSelect, onImageRemove }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validate file
      await uploadService.validateFile(file.name, file.size, file.type);
      onFileSelect(file);
    } catch (error: any) {
      toast.error(error.message || 'Failed to validate file');
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label>Category Image</Label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        {(imageUrl || selectedFile) ? (
          <div className="relative">
            <img
              src={selectedFile ? URL.createObjectURL(selectedFile) : imageUrl}
              alt="Category"
              className="w-full h-32 object-cover rounded-md"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={onImageRemove}
            >
              <X className="h-4 w-4" />
            </Button>
            {selectedFile && (
              <div className="absolute bottom-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
                New image selected
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Select Image
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              JPG, PNG, GIF, WEBP up to 10MB
            </p>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

const CategoryForm = React.memo<CategoryFormProps>(({ 
  formData, 
  setFormData, 
  handleSubmit, 
  isSubmitting, 
  editingCategory, 
  availableParents,
  onCancel,
  selectedImageFile,
  setSelectedImageFile,
  categories
}) => {
  // Get count of active subcategories that will be affected
  const getActiveSubcategoriesCount = (parentId: string) => 
    categories.filter(cat => cat.parent_id === parentId && cat.is_active).length;

  return (
  <form onSubmit={handleSubmit} className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="category-name">Category Name *</Label>
        <Input
          id="category-name"
          value={formData.name}
          onChange={(e) => {
            const value = e.target.value;
            setFormData(prev => ({
              ...prev,
              name: value,
              slug: generateSlug(value)
            }));
          }}
          placeholder="Enter category name"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category-slug">Slug *</Label>
        <Input
          id="category-slug"
          value={formData.slug}
          onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
          placeholder="category-slug"
          required
        />
      </div>
    </div>

    <div className="space-y-2">
      <Label htmlFor="category-description">Description</Label>
      <Textarea
        id="category-description"
        value={formData.description}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        placeholder="Enter category description (optional)"
        rows={3}
      />
    </div>

    <CategoryImageUpload
      imageUrl={formData.image_url}
      selectedFile={selectedImageFile}
      onFileSelect={setSelectedImageFile}
      onImageRemove={() => {
        setFormData(prev => ({ ...prev, image_url: '' }));
        setSelectedImageFile(null);
      }}
    />

    <div className="space-y-2">
      <Label htmlFor="category-parent">Parent Category</Label>
      <Select
        value={formData.parent_id || "none"}
        onValueChange={(value) => setFormData(prev => ({ ...prev, parent_id: value === "none" ? "" : value }))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select parent category (optional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No parent (Root category)</SelectItem>
          {availableParents.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Switch
          id="category-active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
        <Label htmlFor="category-active">Active</Label>
      </div>
      {editingCategory && !formData.is_active && (() => {
        const subcatCount = getActiveSubcategoriesCount(editingCategory.id);
        return subcatCount > 0 ? (
          <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
            ⚠️ Deactivating this category will also deactivate {subcatCount} active subcategor{subcatCount === 1 ? 'y' : 'ies'}.
          </p>
        ) : null;
      })()}
    </div>

    <div className="flex justify-end space-x-2 pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
      </Button>
    </div>
  </form>
  );
});

export default function Categories() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: categoryService.getAll,
  });

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: categoryService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Category created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create category');
    },
  });

  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      categoryService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Category updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update category');
    },
  });

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: categoryService.delete,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success(result.message);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete category');
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingCategory(null);
    setIsSubmitting(false);
    setSelectedImageFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    if (!formData.slug.trim()) {
      toast.error('Category slug is required');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = formData.image_url;

      // Upload new image if selected
      if (selectedImageFile) {
        const result = await uploadService.uploadCategoryImage(selectedImageFile);
        imageUrl = result.image_url;
      }

      const submitData = {
        ...formData,
        parent_id: formData.parent_id || undefined,
        description: formData.description || undefined,
        image_url: imageUrl || undefined,
      };

      if (editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory.id, data: submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      parent_id: category.parent_id || '',
      is_active: category.is_active,
      image_url: category.image_url || '',
    });
    setSelectedImageFile(null); // Reset selected file when editing
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    await deleteMutation.mutateAsync(categoryId);
  };

  // Get root categories (no parent)
  const rootCategories = categories.filter(cat => !cat.parent_id);
  
  // Get subcategories for each parent
  const getSubcategories = (parentId: string) => 
    categories.filter(cat => cat.parent_id === parentId);

  // Get count of active subcategories that will be affected
  const getActiveSubcategoriesCount = (parentId: string) => 
    categories.filter(cat => cat.parent_id === parentId && cat.is_active).length;

  // Get available parent categories (excluding current category when editing)
  const getAvailableParents = () => {
    return categories.filter(cat => 
      !editingCategory || cat.id !== editingCategory.id
    );
  };

  const handleCancel = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    resetForm();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Organize your products with categories</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading categories...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Organize your products with categories</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-32">
              <div className="text-red-600">Error loading categories</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">
            Organize your products with categories
          </p>
        </div>
        <Dialog 
          open={isCreateDialogOpen} 
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (open) {
              resetForm(); // Reset form when opening
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
            </DialogHeader>
            <CategoryForm
              formData={formData}
              setFormData={setFormData}
              handleSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              editingCategory={editingCategory}
              availableParents={getAvailableParents()}
              onCancel={handleCancel}
              selectedImageFile={selectedImageFile}
              setSelectedImageFile={setSelectedImageFile}
              categories={categories}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FolderTree className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-sm text-muted-foreground">Total Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Tag className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{rootCategories.length}</p>
                <p className="text-sm text-muted-foreground">Root Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Tag className="h-5 w-5 text-royal-black" />
              <div>
                <p className="text-2xl font-bold">{categories.filter(cat => cat.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Active Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle>Category Management</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No categories found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by creating your first category
              </p>
              <Dialog 
                open={isCreateDialogOpen} 
                onOpenChange={(open) => {
                  setIsCreateDialogOpen(open);
                  if (open) {
                    resetForm();
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Category</DialogTitle>
                  </DialogHeader>
                  <CategoryForm
                    formData={formData}
                    setFormData={setFormData}
                    handleSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    editingCategory={editingCategory}
                    availableParents={getAvailableParents()}
                    onCancel={handleCancel}
                    selectedImageFile={selectedImageFile}
                    setSelectedImageFile={setSelectedImageFile}
                    categories={categories}
                  />
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-4">
              {rootCategories.map((category) => {
                const subcategories = getSubcategories(category.id);
                
                return (
                  <div key={category.id} className="border rounded-lg">
                    {/* Root Category */}
                    <div className="p-4 border-b bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FolderTree className="h-5 w-5 text-blue-600" />
                          <div>
                            <h3 className="font-medium">{category.name}</h3>
                            <p className="text-sm text-muted-foreground">/{category.slug}</p>
                            {category.description && (
                              <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={category.is_active ? 'default' : 'secondary'}>
                            {category.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                  {subcategories.length > 0 && (
                                    <span className="block mt-2 text-red-600">
                                      Warning: This category has {subcategories.length} subcategories that will also be deleted.
                                    </span>
                                  )}
                                  <span className="block mt-2 text-yellow-600">
                                    Note: Any products in this category will become "Uncategorized" and remain accessible.
                                  </span>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(category.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>

                    {/* Subcategories */}
                    {subcategories.length > 0 && (
                      <div className="p-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">
                          Subcategories ({subcategories.length})
                        </h4>
                        <div className="space-y-2">
                          {subcategories.map((subcat) => (
                            <div key={subcat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                              <div className="flex items-center space-x-3">
                                <Tag className="h-4 w-4 text-gray-500" />
                                <div>
                                  <h5 className="font-medium text-sm">{subcat.name}</h5>
                                  <p className="text-xs text-muted-foreground">/{subcat.slug}</p>
                                  {subcat.description && (
                                    <p className="text-xs text-muted-foreground mt-1">{subcat.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant={subcat.is_active ? 'default' : 'secondary'} className="text-xs">
                                  {subcat.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(subcat)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{subcat.name}"? This action cannot be undone.
                                        <span className="block mt-2 text-yellow-600">
                                          Note: Any products in this category will become "Uncategorized" and remain accessible.
                                        </span>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(subcat.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog 
        open={isEditDialogOpen} 
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            // Clean up when closing
            setEditingCategory(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <CategoryForm
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            editingCategory={editingCategory}
            availableParents={getAvailableParents()}
            onCancel={handleCancel}
            selectedImageFile={selectedImageFile}
            setSelectedImageFile={setSelectedImageFile}
            categories={categories}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}