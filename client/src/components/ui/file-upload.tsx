import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, AlertCircle, Check } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { uploadService } from '../../services/api';
import { toast } from 'sonner';

interface FileUploadProps {
  type: 'avatar' | 'review';
  maxFiles?: number;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  onUploadComplete?: (filePaths: string[]) => void;
  onFilesSelected?: (files: File[]) => void;
  onUploadStart?: () => void;
  className?: string;
  disabled?: boolean;
  clientOnly?: boolean;
}

interface UploadedFile {
  file: File;
  preview: string;
  status: 'uploading' | 'success' | 'error';
  path?: string;
  error?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  type,
  maxFiles = type === 'avatar' ? 1 : 5,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  onUploadComplete,
  onFilesSelected,
  onUploadStart,
  className = '',
  disabled = false,
  clientOnly = false,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(async (file: File): Promise<string | null> => {
    try {
      await uploadService.validateFile(file.name, file.size, file.type);
      return null;
    } catch (error: any) {
      return error.message || 'File validation failed';
    }
  }, []);

  const uploadFileToServer = useCallback(async (file: File): Promise<string> => {
    if (type === 'avatar') {
      return await uploadService.uploadAvatar(file);
    } else {
      const filePaths = await uploadService.uploadReviewImages([file]);
      return filePaths[0];
    }
  }, [type]);

  // Batch upload for review images
  const batchUploadReviewFiles = useCallback(async (files: File[]): Promise<string[]> => {
    if (type !== 'review') {
      throw new Error('Batch upload only supported for review images');
    }
    return await uploadService.uploadReviewImages(files);
  }, [type]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (disabled) return;
    
    const fileArray = Array.from(files);
    
    // Check max files limit
    if (uploadedFiles.length + fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} ${maxFiles === 1 ? 'file' : 'files'} allowed`);
      return;
    }

    onUploadStart?.();

    const newFiles: UploadedFile[] = [];

    for (const file of fileArray) {
      // Validate file
      const validationError = await validateFile(file);
      if (validationError) {
        toast.error(`${file.name}: ${validationError}`);
        continue;
      }

      // Create file entry with preview
      const uploadFile: UploadedFile = {
        file,
        preview: URL.createObjectURL(file),
        status: clientOnly ? 'success' : 'uploading', // In client-only mode, mark as success immediately
      };

      newFiles.push(uploadFile);
      setUploadedFiles(prev => [...prev, uploadFile]);

      // Only upload to server if not in client-only mode
      if (!clientOnly) {
        try {
          const filePath = await uploadFileToServer(file);
          
          setUploadedFiles(prev => 
            prev.map(f => f.file === file ? { ...f, status: 'success', path: filePath } : f)
          );
          
          toast.success(`${file.name} uploaded successfully`);
        } catch (error: any) {
          setUploadedFiles(prev => 
            prev.map(f => f.file === file ? { ...f, status: 'error', error: error.message } : f)
          );
          toast.error(`Failed to upload ${file.name}: ${error.message}`);
        }
      }
    }

    // Notify completion after a short delay to ensure state updates
    setTimeout(() => {
      if (clientOnly) {
        // In client-only mode, pass the File objects to onFilesSelected
        const allFiles = newFiles.map(f => f.file);
        onFilesSelected?.(allFiles);
      } else {
        // In upload mode, get current state for successful uploads
        setUploadedFiles(currentFiles => {
          const successfulUploads = currentFiles.filter(f => f.status === 'success' && f.path);
          console.log('🖼️ Upload complete callback:', {
            totalFiles: currentFiles.length,
            successfulFiles: successfulUploads.length,
            paths: successfulUploads.map(f => f.path)
          });
          if (successfulUploads.length > 0) {
            onUploadComplete?.(successfulUploads.map(f => f.path!));
          }
          return currentFiles; // Return unchanged to not trigger state update
        });
      }
    }, 100);
  }, [uploadedFiles, maxFiles, validateFile, uploadFileToServer, onUploadStart, onUploadComplete, onFilesSelected, disabled, clientOnly]);

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
      // Create a copy of the files before resetting
      const fileList = Array.from(files);
      handleFiles(fileList);
    }
    // Reset immediately but store files first
    e.target.value = '';
  }, [handleFiles, disabled]);

  const removeFile = useCallback((fileToRemove: UploadedFile) => {
    setUploadedFiles(prev => prev.filter(f => f.file !== fileToRemove.file));
    URL.revokeObjectURL(fileToRemove.preview);
    
    // Update the completion callback
    setTimeout(() => {
      const remainingFiles = uploadedFiles.filter(f => f.file !== fileToRemove.file);
      const successfulUploads = remainingFiles.filter(f => f.status === 'success' && f.path);
      onUploadComplete?.(successfulUploads.map(f => f.path!));
    }, 100);
  }, [uploadedFiles, onUploadComplete]);

  const openFileDialog = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  // Clean up previews on unmount
  React.useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
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
              ? 'border-purple-500 bg-purple-50' 
              : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-6 text-center">
          <div className={`mx-auto p-3 rounded-full w-fit mb-4 ${
            disabled ? 'bg-gray-100' : 'bg-purple-100'
          }`}>
            <Upload className={`h-6 w-6 ${
              disabled ? 'text-gray-400' : 'text-purple-600'
            }`} />
          </div>
          <h3 className={`text-lg font-medium mb-2 ${
            disabled ? 'text-gray-400' : 'text-gray-900'
          }`}>
            {type === 'avatar' ? 'Upload Avatar' : 'Upload Images'}
          </h3>
          <p className={`text-sm mb-4 ${
            disabled ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {disabled 
              ? 'Upload disabled' 
              : `Drag and drop ${maxFiles === 1 ? 'your file' : 'your files'} here, or click to select`
            }
          </p>
          {!disabled && (
            <div className="text-xs text-gray-500 space-y-1 mb-4">
              <p>Supported formats: JPG, PNG, GIF, WEBP</p>
              <p>Maximum size: {(maxSizeBytes / 1024 / 1024).toFixed(0)}MB per file</p>
              <p>Maximum files: {maxFiles}</p>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openFileDialog();
            }}
            disabled={disabled}
          >
            Select Files
          </Button>
        </CardContent>
      </Card>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={maxFiles > 1}
        accept={acceptedTypes.join(',')}
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">
            {type === 'avatar' ? 'Avatar' : 'Uploaded Images'} ({uploadedFiles.length})
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {uploadedFiles.map((uploadFile, index) => (
              <div
                key={`${uploadFile.file.name}-${index}`}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
              >
                <div className="flex items-center space-x-3">
                  {/* File Preview */}
                  <div className="flex-shrink-0">
                    <img
                      src={uploadFile.preview}
                      alt={uploadFile.file.name}
                      className="h-12 w-12 object-cover rounded-md border border-gray-200"
                    />
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadFile.file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {uploadFile.error && (
                      <p className="text-sm text-red-600">{uploadFile.error}</p>
                    )}
                  </div>

                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {uploadFile.status === 'uploading' && (
                      <div className="animate-spin h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                    )}
                    {uploadFile.status === 'success' && (
                      <Check className="h-5 w-5 text-green-600" />
                    )}
                    {uploadFile.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(uploadFile)}
                  className="ml-2 text-gray-400 hover:text-red-600"
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Simple Review Image Upload Component for easier use
interface ReviewImageUploadProps {
  onUploadComplete?: (filePaths: string[]) => void;
  onFilesSelected?: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
  clientOnly?: boolean; // Don't upload immediately, just store files
}

export const ReviewImageUpload: React.FC<ReviewImageUploadProps> = ({
  onUploadComplete,
  onFilesSelected,
  className = '',
  disabled = false,
  clientOnly = false,
}) => {
  return (
    <FileUpload
      type="review"
      maxFiles={5}
      onUploadComplete={onUploadComplete}
      onFilesSelected={onFilesSelected}
      className={className}
      disabled={disabled}
      clientOnly={clientOnly}
    />
  );
};

// Simple Avatar Upload Component  
interface SimpleAvatarUploadProps {
  onUploadComplete?: (filePath: string) => void;
  className?: string;
  disabled?: boolean;
}

export const SimpleAvatarUpload: React.FC<SimpleAvatarUploadProps> = ({
  onUploadComplete,
  className = '',
  disabled = false,
}) => {
  return (
    <FileUpload
      type="avatar"
      maxFiles={1}
      onUploadComplete={(filePaths) => onUploadComplete?.(filePaths[0])}
      className={className}
      disabled={disabled}
    />
  );
};