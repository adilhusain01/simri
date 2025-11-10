import multer from 'multer';
interface ImageProcessingOptions {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
}
declare class UploadService {
    private uploadDir;
    constructor();
    private ensureUploadDirectories;
    createMulterConfig(destination: string, fileFilter?: (req: any, file: any, cb: any) => void): multer.Multer;
    processImage(inputPath: string, outputPath: string, options?: ImageProcessingOptions): Promise<void>;
    processProductImages(files: Express.Multer.File[]): Promise<string[]>;
    processAvatarImage(file: Express.Multer.File): Promise<string>;
    processReviewImages(files: Express.Multer.File[]): Promise<string[]>;
    processProductImagesCloudinary(files: Express.Multer.File[]): Promise<any[]>;
    deleteFile(filePath: string): Promise<boolean>;
    deleteProductImages(imageUrls: string | string[] | any[]): Promise<void>;
    getFileInfo(filePath: string): {
        exists: boolean;
        size: number;
        created: Date;
        modified: Date;
    } | {
        exists: boolean;
        size: number;
        created: null;
        modified: null;
    };
    deleteReviewImages(imageUrls: string[]): Promise<void>;
    uploadToCloudinary(filePath: string, options?: any): Promise<any>;
    deleteCategoryImage(imageUrl: string): Promise<void>;
}
export declare const uploadService: UploadService;
export {};
