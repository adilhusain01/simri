"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uploadService_1 = require("../services/uploadService");
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const router = express_1.default.Router();
// Configure multer for different upload types
const productImageUpload = uploadService_1.uploadService.createMulterConfig('temp');
const avatarUpload = uploadService_1.uploadService.createMulterConfig('temp');
const reviewImageUpload = uploadService_1.uploadService.createMulterConfig('temp');
// Upload product images (Admin only)
router.post('/product-images', auth_1.requireAdmin, productImageUpload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No images uploaded'
            });
        }
        const processedImages = await uploadService_1.uploadService.processProductImagesCloudinary(req.files);
        res.json({
            success: true,
            data: {
                images: processedImages,
                count: processedImages.length
            },
            message: 'Images uploaded successfully'
        });
    }
    catch (error) {
        console.error('Product image upload error:', error);
        res.status(500).json({
            success: false,
            message: (error instanceof Error ? error.message : 'Unknown error') || 'Error uploading product images'
        });
    }
});
// Upload user avatar
router.post('/avatar', auth_1.requireAuth, avatarUpload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No avatar image uploaded'
            });
        }
        const avatarUrl = await uploadService_1.uploadService.processAvatarImage(req.file);
        // Update user's avatar_url in database
        const user = req.user;
        await User_1.UserModel.update(user.id, { avatar_url: avatarUrl });
        res.json({
            success: true,
            data: {
                avatar_url: avatarUrl
            },
            message: 'Avatar uploaded successfully'
        });
    }
    catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({
            success: false,
            message: (error instanceof Error ? error.message : 'Unknown error') || 'Error uploading avatar'
        });
    }
});
// Upload review images
router.post('/review-images', auth_1.requireAuth, reviewImageUpload.array('images', 5), async (req, res) => {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No images uploaded'
            });
        }
        const processedImages = await uploadService_1.uploadService.processReviewImages(req.files);
        res.json({
            success: true,
            data: {
                images: processedImages,
                count: processedImages.length
            },
            message: 'Review images uploaded successfully'
        });
    }
    catch (error) {
        console.error('Review image upload error:', error);
        res.status(500).json({
            success: false,
            message: (error instanceof Error ? error.message : 'Unknown error') || 'Error uploading review images'
        });
    }
});
// Delete uploaded file
router.delete('/file', auth_1.requireAuth, async (req, res) => {
    try {
        const { filePath } = req.body;
        if (!filePath) {
            return res.status(400).json({
                success: false,
                message: 'File path is required'
            });
        }
        // Basic security check - only allow deletion of upload files
        if (!filePath.startsWith('/uploads/')) {
            return res.status(403).json({
                success: false,
                message: 'Invalid file path'
            });
        }
        const deleted = await uploadService_1.uploadService.deleteFile(filePath);
        if (deleted) {
            res.json({
                success: true,
                message: 'File deleted successfully'
            });
        }
        else {
            res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }
    }
    catch (error) {
        console.error('File deletion error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting file'
        });
    }
});
// Get file info
router.get('/file-info', auth_1.requireAuth, async (req, res) => {
    try {
        const { filePath } = req.query;
        if (!filePath || typeof filePath !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'File path is required'
            });
        }
        // Security check
        if (!filePath.startsWith('/uploads/')) {
            return res.status(403).json({
                success: false,
                message: 'Invalid file path'
            });
        }
        const fileInfo = uploadService_1.uploadService.getFileInfo(filePath);
        res.json({
            success: true,
            data: fileInfo
        });
    }
    catch (error) {
        console.error('File info error:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting file info'
        });
    }
});
// Upload validation endpoint (check file before upload)
router.post('/validate', auth_1.requireAuth, (req, res) => {
    try {
        const { fileName, fileSize, fileType } = req.body;
        const errors = [];
        // Check file type
        if (!fileType || !fileType.startsWith('image/')) {
            errors.push('Only image files are allowed');
        }
        // Check file size (10MB limit)
        if (!fileSize || fileSize > 10 * 1024 * 1024) {
            errors.push('File size must be less than 10MB');
        }
        // Check file name
        if (!fileName || fileName.length > 255) {
            errors.push('Invalid file name');
        }
        // Check file extension
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        if (!allowedExtensions.includes(fileExtension)) {
            errors.push('File type not supported. Allowed: JPG, JPEG, PNG, GIF, WEBP');
        }
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'File validation failed',
                errors
            });
        }
        res.json({
            success: true,
            message: 'File validation passed'
        });
    }
    catch (error) {
        console.error('File validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating file'
        });
    }
});
// Upload category image (Admin only)
const categoryImageUpload = uploadService_1.uploadService.createMulterConfig('temp');
router.post('/category-image', auth_1.requireAdmin, categoryImageUpload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image uploaded'
            });
        }
        // Upload single image to Cloudinary with WebP conversion
        const cloudinaryResult = await uploadService_1.uploadService.uploadToCloudinary(req.file.path, {
            folder: 'simri/categories',
            format: 'webp',
            transformation: [
                { width: 400, height: 300, crop: 'fill' },
                { quality: 'auto:good' }
            ]
        });
        // Clean up temp file (sync operation like other upload methods)
        try {
            require('fs').unlinkSync(req.file.path);
        }
        catch (unlinkError) {
            console.warn('Failed to delete temp file:', unlinkError);
        }
        res.json({
            success: true,
            data: {
                image_url: cloudinaryResult.secure_url,
                public_id: cloudinaryResult.public_id
            },
            message: 'Category image uploaded successfully'
        });
    }
    catch (error) {
        console.error('Category image upload error:', error);
        // Clean up temp file if it exists
        if (req.file?.path) {
            try {
                require('fs').unlinkSync(req.file.path);
            }
            catch (cleanupError) {
                console.warn('Failed to clean up temp file:', cleanupError);
            }
        }
        res.status(500).json({
            success: false,
            message: (error instanceof Error ? error.message : 'Unknown error') || 'Error uploading category image'
        });
    }
});
exports.default = router;
//# sourceMappingURL=upload.js.map