"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadService = void 0;
const multer_1 = __importDefault(require("multer"));
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
class UploadService {
    constructor() {
        this.uploadDir = path_1.default.join(process.cwd(), 'uploads');
        this.ensureUploadDirectories();
    }
    ensureUploadDirectories() {
        const directories = [
            this.uploadDir,
            path_1.default.join(this.uploadDir, 'products'),
            path_1.default.join(this.uploadDir, 'avatars'),
            path_1.default.join(this.uploadDir, 'reviews'),
            path_1.default.join(this.uploadDir, 'temp')
        ];
        directories.forEach(dir => {
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
        });
    }
    // Configure multer for different upload types
    createMulterConfig(destination, fileFilter) {
        const storage = multer_1.default.diskStorage({
            destination: (req, file, cb) => {
                cb(null, path_1.default.join(this.uploadDir, destination));
            },
            filename: (req, file, cb) => {
                const uniqueName = `${(0, uuid_1.v4)()}${path_1.default.extname(file.originalname)}`;
                cb(null, uniqueName);
            }
        });
        const defaultFileFilter = (req, file, cb) => {
            // Allow only images
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            }
            else {
                cb(new Error('Only image files are allowed!'), false);
            }
        };
        return (0, multer_1.default)({
            storage,
            fileFilter: fileFilter || defaultFileFilter,
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB limit
                files: 10 // Maximum 10 files at once
            }
        });
    }
    // Process uploaded images
    async processImage(inputPath, outputPath, options = {}) {
        const { width = 800, height = 600, quality = 80, format = 'jpeg' } = options;
        try {
            await (0, sharp_1.default)(inputPath)
                .resize(width, height, {
                fit: 'inside',
                withoutEnlargement: true
            })
                .toFormat(format, { quality })
                .toFile(outputPath);
        }
        catch (error) {
            console.error('Image processing error:', error);
            throw new Error('Failed to process image');
        }
    }
    // Create multiple image sizes for products
    async processProductImages(files) {
        const processedImages = [];
        for (const file of files) {
            const fileId = (0, uuid_1.v4)();
            const baseFilename = `${fileId}.jpeg`;
            try {
                // Create different sizes
                const sizes = [
                    { suffix: '_thumb', width: 150, height: 150 },
                    { suffix: '_medium', width: 400, height: 400 },
                    { suffix: '_large', width: 800, height: 800 }
                ];
                const imageUrls = {
                    original: `/uploads/products/${baseFilename}`,
                    thumb: `/uploads/products/${fileId}_thumb.jpeg`,
                    medium: `/uploads/products/${fileId}_medium.jpeg`,
                    large: `/uploads/products/${fileId}_large.jpeg`
                };
                // Process original image
                await this.processImage(file.path, path_1.default.join(this.uploadDir, 'products', baseFilename), { width: 1200, height: 1200, quality: 90 });
                // Process different sizes
                for (const size of sizes) {
                    const outputPath = path_1.default.join(this.uploadDir, 'products', `${fileId}${size.suffix}.jpeg`);
                    await this.processImage(file.path, outputPath, {
                        width: size.width,
                        height: size.height,
                        quality: 80
                    });
                }
                // Delete original uploaded file
                fs_1.default.unlinkSync(file.path);
                processedImages.push(JSON.stringify(imageUrls));
            }
            catch (error) {
                console.error('Product image processing error:', error);
                // Clean up on error
                if (fs_1.default.existsSync(file.path)) {
                    fs_1.default.unlinkSync(file.path);
                }
                throw error;
            }
        }
        return processedImages;
    }
    // Process avatar images with Cloudinary
    async processAvatarImage(file) {
        try {
            // Upload directly to Cloudinary
            const result = await cloudinary_1.default.uploader.upload(file.path, {
                folder: 'simri/avatars',
                format: 'jpg',
                transformation: [
                    { width: 200, height: 200, crop: 'fill', gravity: 'face' },
                    { quality: 'auto:good' }
                ]
            });
            // Delete original uploaded file
            fs_1.default.unlinkSync(file.path);
            return result.secure_url;
        }
        catch (error) {
            console.error('Avatar processing error:', error);
            if (fs_1.default.existsSync(file.path)) {
                fs_1.default.unlinkSync(file.path);
            }
            throw new Error('Failed to process avatar image');
        }
    }
    // Process review images with Cloudinary
    async processReviewImages(files) {
        const processedImages = [];
        for (const file of files) {
            try {
                // Upload directly to Cloudinary
                const result = await cloudinary_1.default.uploader.upload(file.path, {
                    folder: 'simri/reviews',
                    format: 'jpg',
                    transformation: [
                        { width: 600, height: 600, crop: 'limit' },
                        { quality: 'auto:good' }
                    ]
                });
                // Delete original uploaded file
                fs_1.default.unlinkSync(file.path);
                processedImages.push(result.secure_url);
            }
            catch (error) {
                console.error('Review image processing error:', error);
                if (fs_1.default.existsSync(file.path)) {
                    fs_1.default.unlinkSync(file.path);
                }
            }
        }
        return processedImages;
    }
    // Process product images with Cloudinary (multiple sizes)
    async processProductImagesCloudinary(files) {
        const processedImages = [];
        for (const file of files) {
            try {
                const fileId = (0, uuid_1.v4)();
                // Upload original image to Cloudinary
                const originalResult = await cloudinary_1.default.uploader.upload(file.path, {
                    folder: 'simri/products',
                    public_id: `${fileId}_original`,
                    format: 'jpg',
                    transformation: [
                        { width: 1200, height: 1200, crop: 'limit' },
                        { quality: 'auto:good' }
                    ]
                });
                // Upload thumbnail version
                const thumbResult = await cloudinary_1.default.uploader.upload(file.path, {
                    folder: 'simri/products',
                    public_id: `${fileId}_thumb`,
                    format: 'jpg',
                    transformation: [
                        { width: 150, height: 150, crop: 'fill' },
                        { quality: 'auto:good' }
                    ]
                });
                // Upload medium version
                const mediumResult = await cloudinary_1.default.uploader.upload(file.path, {
                    folder: 'simri/products',
                    public_id: `${fileId}_medium`,
                    format: 'jpg',
                    transformation: [
                        { width: 400, height: 400, crop: 'limit' },
                        { quality: 'auto:good' }
                    ]
                });
                // Upload large version
                const largeResult = await cloudinary_1.default.uploader.upload(file.path, {
                    folder: 'simri/products',
                    public_id: `${fileId}_large`,
                    format: 'jpg',
                    transformation: [
                        { width: 800, height: 800, crop: 'limit' },
                        { quality: 'auto:good' }
                    ]
                });
                // Delete original uploaded file
                fs_1.default.unlinkSync(file.path);
                // Create image object with all sizes
                const imageUrls = {
                    original: originalResult.secure_url,
                    thumb: thumbResult.secure_url,
                    medium: mediumResult.secure_url,
                    large: largeResult.secure_url
                };
                processedImages.push(imageUrls);
            }
            catch (error) {
                console.error('Product image processing error:', error);
                if (fs_1.default.existsSync(file.path)) {
                    fs_1.default.unlinkSync(file.path);
                }
            }
        }
        return processedImages;
    }
    // Delete uploaded files
    async deleteFile(filePath) {
        try {
            const fullPath = path_1.default.join(process.cwd(), filePath);
            if (fs_1.default.existsSync(fullPath)) {
                fs_1.default.unlinkSync(fullPath);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('File deletion error:', error);
            return false;
        }
    }
    // Delete product images (all sizes)
    async deleteProductImages(imageUrls) {
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
                                await cloudinary_1.default.uploader.destroy(publicId);
                            }
                        }
                        else if (typeof sizeUrl === 'string' && sizeUrl.startsWith('/uploads/')) {
                            // Delete local file
                            await this.deleteFile(sizeUrl);
                        }
                    }
                }
                else if (typeof url === 'string') {
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
                                    await cloudinary_1.default.uploader.destroy(publicId);
                                }
                            }
                            else if (typeof size === 'string' && size.startsWith('/uploads/')) {
                                // Delete local file
                                await this.deleteFile(size);
                            }
                        }
                    }
                    catch {
                        // If it's just a simple URL
                        if (url.includes('cloudinary.com')) {
                            // Extract public_id from Cloudinary URL
                            const matches = url.match(/\/v\d+\/(.+)\.\w+$/);
                            if (matches && matches[1]) {
                                const publicId = matches[1];
                                console.log('🗑️ Deleting Cloudinary product image:', publicId);
                                await cloudinary_1.default.uploader.destroy(publicId);
                            }
                        }
                        else if (url.startsWith('/uploads/')) {
                            // Delete local file
                            await this.deleteFile(url);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('Product image deletion error:', error);
        }
    }
    // Get file info
    getFileInfo(filePath) {
        try {
            const fullPath = path_1.default.join(process.cwd(), filePath);
            const stats = fs_1.default.statSync(fullPath);
            return {
                exists: true,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime
            };
        }
        catch (error) {
            return {
                exists: false,
                size: 0,
                created: null,
                modified: null
            };
        }
    }
    // Delete review images from Cloudinary
    async deleteReviewImages(imageUrls) {
        try {
            for (const url of imageUrls) {
                if (typeof url === 'string' && url.includes('cloudinary.com')) {
                    // Extract public_id from Cloudinary URL
                    const matches = url.match(/\/v\d+\/(.+)\.\w+$/);
                    if (matches && matches[1]) {
                        const publicId = matches[1];
                        console.log('🗑️ Deleting Cloudinary image:', publicId);
                        await cloudinary_1.default.uploader.destroy(publicId);
                    }
                }
                else if (typeof url === 'string' && url.startsWith('/uploads/')) {
                    // Delete local file
                    await this.deleteFile(url);
                }
            }
        }
        catch (error) {
            console.error('Review image deletion error:', error);
        }
    }
    // Generic upload to Cloudinary
    async uploadToCloudinary(filePath, options = {}) {
        try {
            const result = await cloudinary_1.default.uploader.upload(filePath, options);
            return result;
        }
        catch (error) {
            console.error('Cloudinary upload error:', error);
            throw error;
        }
    }
    // Delete category image from Cloudinary
    async deleteCategoryImage(imageUrl) {
        try {
            if (typeof imageUrl === 'string' && imageUrl.includes('cloudinary.com')) {
                // Extract public_id from Cloudinary URL
                const matches = imageUrl.match(/\/v\d+\/(.+)\.\w+$/);
                if (matches && matches[1]) {
                    const publicId = matches[1];
                    console.log('🗑️ Deleting Cloudinary category image:', publicId);
                    await cloudinary_1.default.uploader.destroy(publicId);
                }
            }
            else if (typeof imageUrl === 'string' && imageUrl.startsWith('/uploads/')) {
                // Delete local file
                await this.deleteFile(imageUrl);
            }
        }
        catch (error) {
            console.error('Category image deletion error:', error);
        }
    }
}
exports.uploadService = new UploadService();
//# sourceMappingURL=uploadService.js.map