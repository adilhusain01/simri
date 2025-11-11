import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import cloudinary from '../config/cloudinary';

interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

class UploadService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDirectories();
  }

  private ensureUploadDirectories() {
    const directories = [
      this.uploadDir,
      path.join(this.uploadDir, 'products'),
      path.join(this.uploadDir, 'avatars'),
      path.join(this.uploadDir, 'reviews'),
      path.join(this.uploadDir, 'temp')
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Configure multer for different upload types
  createMulterConfig(destination: string, fileFilter?: (req: any, file: any, cb: any) => void) {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, path.join(this.uploadDir, destination));
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    });

    const defaultFileFilter = (req: any, file: any, cb: any) => {
      // Allow only images
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'), false);
      }
    };

    return multer({
      storage,
      fileFilter: fileFilter || defaultFileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Maximum 10 files at once
      }
    });
  }

  // Process uploaded images
  async processImage(
    inputPath: string, 
    outputPath: string, 
    options: ImageProcessingOptions = {}
  ): Promise<void> {
    const {
      width = 800,
      height = 600,
      quality = 80,
      format = 'jpeg'
    } = options;

    try {
      await sharp(inputPath)
        .resize(width, height, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .toFormat(format, { quality })
        .toFile(outputPath);
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error('Failed to process image');
    }
  }

  // Create multiple image sizes for products
  async processProductImages(files: Express.Multer.File[]): Promise<string[]> {
    const processedImages: string[] = [];

    for (const file of files) {
      const fileId = uuidv4();
      const baseFilename = `${fileId}.jpeg`;
      
      try {
        // Create different sizes
        const sizes = [
          { suffix: '_thumb', width: 150, height: 150 },
          { suffix: '_medium', width: 400, height: 400 },
          { suffix: '_large', width: 800, height: 800 }
        ];

        const imageUrls: any = {
          original: `/uploads/products/${baseFilename}`,
          thumb: `/uploads/products/${fileId}_thumb.jpeg`,
          medium: `/uploads/products/${fileId}_medium.jpeg`,
          large: `/uploads/products/${fileId}_large.jpeg`
        };

        // Process original image
        await this.processImage(
          file.path,
          path.join(this.uploadDir, 'products', baseFilename),
          { width: 1200, height: 1200, quality: 90 }
        );

        // Process different sizes
        for (const size of sizes) {
          const outputPath = path.join(this.uploadDir, 'products', `${fileId}${size.suffix}.jpeg`);
          await this.processImage(file.path, outputPath, {
            width: size.width,
            height: size.height,
            quality: 80
          });
        }

        // Delete original uploaded file
        fs.unlinkSync(file.path);

        processedImages.push(JSON.stringify(imageUrls));
      } catch (error) {
        console.error('Product image processing error:', error);
        // Clean up on error
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        throw error;
      }
    }

    return processedImages;
  }

  // Process avatar images with Cloudinary (WebP format)
  async processAvatarImage(file: Express.Multer.File): Promise<string> {
    try {
      // Upload directly to Cloudinary with WebP conversion
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'simri/avatars',
        format: 'webp',
        transformation: [
          { width: 200, height: 200, crop: 'fill', gravity: 'face' },
          { quality: 'auto:good' }
        ]
      });

      // Delete original uploaded file
      fs.unlinkSync(file.path);

      return result.secure_url;
    } catch (error) {
      console.error('Avatar processing error:', error);
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new Error('Failed to process avatar image');
    }
  }

  // Process review images with Cloudinary (WebP format)
  async processReviewImages(files: Express.Multer.File[]): Promise<string[]> {
    const processedImages: string[] = [];

    for (const file of files) {
      try {
        // Upload directly to Cloudinary with WebP conversion
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'simri/reviews',
          format: 'webp',
          transformation: [
            { width: 600, height: 600, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        });

        // Delete original uploaded file
        fs.unlinkSync(file.path);

        processedImages.push(result.secure_url);
      } catch (error) {
        console.error('Review image processing error:', error);
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    return processedImages;
  }

  // Process product images with Cloudinary (multiple sizes, WebP format)
  async processProductImagesCloudinary(files: Express.Multer.File[]): Promise<any[]> {
    const processedImages: any[] = [];

    for (const file of files) {
      try {
        const fileId = uuidv4();

        // Upload original image to Cloudinary with WebP conversion
        const originalResult = await cloudinary.uploader.upload(file.path, {
          folder: 'simri/products',
          public_id: `${fileId}_original`,
          format: 'webp',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        });

        // Upload thumbnail version with WebP conversion
        const thumbResult = await cloudinary.uploader.upload(file.path, {
          folder: 'simri/products',
          public_id: `${fileId}_thumb`,
          format: 'webp',
          transformation: [
            { width: 150, height: 150, crop: 'fill' },
            { quality: 'auto:good' }
          ]
        });

        // Upload medium version with WebP conversion
        const mediumResult = await cloudinary.uploader.upload(file.path, {
          folder: 'simri/products',
          public_id: `${fileId}_medium`,
          format: 'webp',
          transformation: [
            { width: 400, height: 400, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        });

        // Upload large version with WebP conversion
        const largeResult = await cloudinary.uploader.upload(file.path, {
          folder: 'simri/products',
          public_id: `${fileId}_large`,
          format: 'webp',
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        });

        // Delete original uploaded file
        fs.unlinkSync(file.path);

        // Create image object with all sizes (now all WebP URLs)
        const imageUrls = {
          original: originalResult.secure_url,
          thumb: thumbResult.secure_url,
          medium: mediumResult.secure_url,
          large: largeResult.secure_url
        };

        processedImages.push(imageUrls);
      } catch (error) {
        console.error('Product image processing error:', error);
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    return processedImages;
  }

  // Delete uploaded files
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('File deletion error:', error);
      return false;
    }
  }

  // Delete product images (all sizes)
  async deleteProductImages(imageUrls: string | string[] | any[]): Promise<void> {
    try {
      const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
      
      for (const url of urls) {
        if (typeof url === 'object' && url !== null) {
          // New Cloudinary format: {original: url, thumb: url, medium: url, large: url}
          for (const sizeUrl of Object.values(url)) {
            if (typeof sizeUrl === 'string' && sizeUrl.includes('cloudinary.com')) {
              // Extract public_id from Cloudinary URL
              const matches = sizeUrl.match(/\/v\d+\/(.+)\.\w+$/);
              if (matches && matches[1]) {
                const publicId = matches[1];
                console.log('🗑️ Deleting Cloudinary product image:', publicId);
                await cloudinary.uploader.destroy(publicId);
              }
            } else if (typeof sizeUrl === 'string' && sizeUrl.startsWith('/uploads/')) {
              // Delete local file
              await this.deleteFile(sizeUrl);
            }
          }
        } else if (typeof url === 'string') {
          // If it's a JSON string with multiple sizes (legacy format)
          try {
            const imageObj = JSON.parse(url);
            for (const size of Object.values(imageObj)) {
              if (typeof size === 'string' && size.includes('cloudinary.com')) {
                // Extract public_id from Cloudinary URL
                const matches = size.match(/\/v\d+\/(.+)\.\w+$/);
                if (matches && matches[1]) {
                  const publicId = matches[1];
                  console.log('🗑️ Deleting Cloudinary product image:', publicId);
                  await cloudinary.uploader.destroy(publicId);
                }
              } else if (typeof size === 'string' && size.startsWith('/uploads/')) {
                // Delete local file
                await this.deleteFile(size);
              }
            }
          } catch {
            // If it's just a simple URL
            if (url.includes('cloudinary.com')) {
              // Extract public_id from Cloudinary URL
              const matches = url.match(/\/v\d+\/(.+)\.\w+$/);
              if (matches && matches[1]) {
                const publicId = matches[1];
                console.log('🗑️ Deleting Cloudinary product image:', publicId);
                await cloudinary.uploader.destroy(publicId);
              }
            } else if (url.startsWith('/uploads/')) {
              // Delete local file
              await this.deleteFile(url);
            }
          }
        }
      }
    } catch (error) {
      console.error('Product image deletion error:', error);
    }
  }

  // Get file info
  getFileInfo(filePath: string) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      const stats = fs.statSync(fullPath);
      return {
        exists: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      return {
        exists: false,
        size: 0,
        created: null,
        modified: null
      };
    }
  }

  // Delete review images from Cloudinary
  async deleteReviewImages(imageUrls: string[]): Promise<void> {
    try {
      for (const url of imageUrls) {
        if (typeof url === 'string' && url.includes('cloudinary.com')) {
          // Extract public_id from Cloudinary URL
          const matches = url.match(/\/v\d+\/(.+)\.\w+$/);
          if (matches && matches[1]) {
            const publicId = matches[1];
            console.log('🗑️ Deleting Cloudinary image:', publicId);
            await cloudinary.uploader.destroy(publicId);
          }
        } else if (typeof url === 'string' && url.startsWith('/uploads/')) {
          // Delete local file
          await this.deleteFile(url);
        }
      }
    } catch (error) {
      console.error('Review image deletion error:', error);
    }
  }

  // Generic upload to Cloudinary (with automatic WebP conversion)
  async uploadToCloudinary(filePath: string, options: any = {}): Promise<any> {
    try {
      // Ensure WebP format is used unless explicitly overridden
      const defaultOptions = {
        format: 'webp',
        quality: 'auto:good',
        ...options
      };

      const result = await cloudinary.uploader.upload(filePath, defaultOptions);
      console.log(`🌐 Uploaded to Cloudinary as WebP: ${result.public_id}`);
      return result;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  // Delete category image from Cloudinary
  async deleteCategoryImage(imageUrl: string): Promise<void> {
    try {
      if (typeof imageUrl === 'string' && imageUrl.includes('cloudinary.com')) {
        // Extract public_id from Cloudinary URL
        const matches = imageUrl.match(/\/v\d+\/(.+)\.\w+$/);
        if (matches && matches[1]) {
          const publicId = matches[1];
          console.log('🗑️ Deleting Cloudinary category image:', publicId);
          await cloudinary.uploader.destroy(publicId);
        }
      } else if (typeof imageUrl === 'string' && imageUrl.startsWith('/uploads/')) {
        // Delete local file
        await this.deleteFile(imageUrl);
      }
    } catch (error) {
      console.error('Category image deletion error:', error);
    }
  }
}

export const uploadService = new UploadService();