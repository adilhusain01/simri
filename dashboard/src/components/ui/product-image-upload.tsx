import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Star, StarOff, GripVertical, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { uploadService } from '../../services/api';
import { toast } from 'sonner';

interface ProductImage {
  id: string;
  file?: File;
  url: string;
  isPrimary: boolean;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface ProductImageUploadProps {
  initialImages?: string[];
  onImagesChange?: (images: { url: string; isPrimary: boolean }[]) => void;
  onFilesSelected?: (files: File[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  className?: string;
  disabled?: boolean;
  mode?: 'upload' | 'client-only';
}

const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  initialImages = [],
  onImagesChange,
  onFilesSelected,
  maxFiles = 8,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  className = '',
  disabled = false,
  mode = 'client-only',
}) => {
  const [images, setImages] = useState<ProductImage[]>(() => 
    initialImages.map((url, index) => ({
      id: `initial-${index}`,
      url,
      isPrimary: index === 0,
      status: 'success' as const,
    }))
  );
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  const validateFile = useCallback(async (file: File): Promise<string | null> => {
    try {
      await uploadService.validateFile(file.name, file.size, file.type);
      return null;
    } catch (error: any) {
      return error.message || 'File validation failed';
    }
  }, []);

  const uploadToServer = useCallback(async (files: File[]): Promise<{original: string, thumb: string, medium: string, large: string}[]> => {
    return await uploadService.uploadProductImages(files);
  }, []);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (disabled) return;
    
    const fileArray = Array.from(files);
    
    // Check max files limit
    if (images.length + fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} images allowed`);
      return;
    }

    const newImages: ProductImage[] = [];

    for (const file of fileArray) {
      // Validate file
      const validationError = await validateFile(file);
      if (validationError) {
        toast.error(`${file.name}: ${validationError}`);
        continue;
      }

      // Create image entry
      const imageId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const newImage: ProductImage = {
        id: imageId,
        file,
        url: URL.createObjectURL(file),
        isPrimary: images.length === 0 && newImages.length === 0, // First image is primary
        status: mode === 'client-only' ? 'success' : 'uploading',
      };

      newImages.push(newImage);
      setImages(prev => [...prev, newImage]);

      // Only upload to server if not in client-only mode (batch upload later)
      if (mode === 'upload') {
        // For now, mark as success and we'll upload all at once
        setImages(prev => 
          prev.map(img => 
            img.id === imageId 
              ? { ...img, status: 'success' } 
              : img
          )
        );
      }
    }

    // Notify parent components
    setTimeout(() => {
      if (mode === 'client-only' && onFilesSelected) {
        const allFiles = [...images, ...newImages]
          .filter(img => img.file)
          .map(img => img.file!);
        onFilesSelected(allFiles);
      }
      
      if (onImagesChange) {
        const imageData = [...images, ...newImages].map(img => ({
          url: img.url,
          isPrimary: img.isPrimary,
        }));
        onImagesChange(imageData);
      }
    }, 100);
  }, [images, maxFiles, validateFile, mode, uploadToServer, onFilesSelected, onImagesChange, disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [handleFiles, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && !disabled) {
      handleFiles(files);
    }
    e.target.value = '';
  }, [handleFiles, disabled]);

  const removeImage = useCallback((imageId: string) => {
    setImages(prev => {
      const updatedImages = prev.filter(img => img.id !== imageId);
      
      // If we removed the primary image, make the first remaining image primary
      if (updatedImages.length > 0 && !updatedImages.some(img => img.isPrimary)) {
        updatedImages[0].isPrimary = true;
      }
      
      // Clean up object URL if it's a local file
      const imageToRemove = prev.find(img => img.id === imageId);
      if (imageToRemove?.file) {
        URL.revokeObjectURL(imageToRemove.url);
      }
      
      return updatedImages;
    });

    // Notify parent of changes
    setTimeout(() => {
      if (onImagesChange) {
        const imageData = images
          .filter(img => img.id !== imageId)
          .map(img => ({
            url: img.url,
            isPrimary: img.isPrimary,
          }));
        onImagesChange(imageData);
      }
    }, 100);
  }, [images, onImagesChange]);

  const setPrimaryImage = useCallback((imageId: string) => {
    setImages(prev => {
      const updatedImages = prev.map(img => ({
        ...img,
        isPrimary: img.id === imageId,
      }));
      
      // Notify parent of changes
      setTimeout(() => {
        if (onImagesChange) {
          const imageData = updatedImages.map(img => ({
            url: img.url,
            isPrimary: img.isPrimary,
          }));
          onImagesChange(imageData);
        }
      }, 100);
      
      return updatedImages;
    });
  }, [onImagesChange]);

  const handleImageDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleImageDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleImageDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    setImages(prev => {
      const newImages = [...prev];
      const draggedImage = newImages[draggedIndex];
      newImages.splice(draggedIndex, 1);
      newImages.splice(dropIndex, 0, draggedImage);
      
      // Notify parent of reorder
      setTimeout(() => {
        if (onImagesChange) {
          const imageData = newImages.map(img => ({
            url: img.url,
            isPrimary: img.isPrimary,
          }));
          onImagesChange(imageData);
        }
      }, 100);
      
      return newImages;
    });
    
    setDraggedIndex(null);
  }, [draggedIndex, onImagesChange]);

  const openFileDialog = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  // Clean up object URLs on unmount
  React.useEffect(() => {
    return () => {
      images.forEach(image => {
        if (image.file) {
          URL.revokeObjectURL(image.url);
        }
      });
    };
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <Card 
        className={`border-2 border-dashed transition-colors ${
          disabled 
            ? 'border-gray-200 bg-gray-50' 
            : isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-6 text-center">
          <div className={`mx-auto p-3 rounded-full w-fit mb-4 ${
            disabled ? 'bg-gray-100' : 'bg-blue-100'
          }`}>
            <Upload className={`h-6 w-6 ${
              disabled ? 'text-gray-400' : 'text-blue-600'
            }`} />
          </div>
          <h3 className={`text-lg font-medium mb-2 ${
            disabled ? 'text-gray-400' : 'text-gray-900'
          }`}>
            Upload Product Images
          </h3>
          <p className={`text-sm mb-4 ${
            disabled ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {disabled 
              ? 'Upload disabled' 
              : `Drag and drop your images here, or click to select (${images.length}/${maxFiles})`
            }
          </p>
          {!disabled && (
            <div className="text-xs text-gray-500 space-y-1 mb-4">
              <p>Supported formats: JPG, PNG, GIF, WEBP</p>
              <p>Maximum size: {(maxSizeBytes / 1024 / 1024).toFixed(0)}MB per file</p>
              <p>Maximum files: {maxFiles}</p>
              <p>First image will be the primary product image</p>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openFileDialog}
            disabled={disabled || images.length >= maxFiles}
          >
            Select Images
          </Button>
        </CardContent>
      </Card>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">
            Product Images ({images.length}/{maxFiles})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable={!disabled}
                onDragStart={(e) => handleImageDragStart(e, index)}
                onDragOver={(e) => handleImageDragOver(e)}
                onDrop={(e) => handleImageDrop(e, index)}
                className={`relative group border-2 rounded-lg overflow-hidden ${
                  image.isPrimary 
                    ? 'border-blue-500 ring-2 ring-blue-200' 
                    : 'border-gray-200 hover:border-gray-300'
                } ${draggedIndex === index ? 'opacity-50' : ''} ${
                  disabled ? 'cursor-default' : 'cursor-move'
                }`}
              >
                {/* Drag Handle */}
                {!disabled && (
                  <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/50 text-white p-1 rounded">
                      <GripVertical className="h-3 w-3" />
                    </div>
                  </div>
                )}

                {/* Primary Star */}
                <div className="absolute top-2 right-2 z-10">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPrimaryImage(image.id)}
                    disabled={disabled}
                    className={`h-8 w-8 p-0 ${
                      image.isPrimary 
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                        : 'bg-black/50 text-white hover:bg-black/70'
                    }`}
                  >
                    {image.isPrimary ? (
                      <Star className="h-4 w-4 fill-current" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Remove Button */}
                <div className="absolute top-2 right-12 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeImage(image.id)}
                    disabled={disabled}
                    className="h-8 w-8 p-0 bg-red-500 text-white hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Image */}
                <div className="aspect-square">
                  <img
                    src={image.url}
                    alt={`Product image ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-product.jpg';
                    }}
                  />
                </div>

                {/* Status Overlay */}
                {image.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-xs">Uploading...</p>
                    </div>
                  </div>
                )}

                {image.status === 'error' && (
                  <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
                    <div className="text-white text-center p-2">
                      <AlertCircle className="h-6 w-6 mx-auto mb-1" />
                      <p className="text-xs">{image.error || 'Upload failed'}</p>
                    </div>
                  </div>
                )}

                {image.status === 'success' && image.isPrimary && (
                  <div className="absolute bottom-2 left-2">
                    <div className="bg-blue-500 text-white px-2 py-1 rounded-md text-xs font-medium">
                      Primary
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductImageUpload;