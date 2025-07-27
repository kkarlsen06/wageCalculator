/**
 * Image Compression and Processing Utilities
 * Handles client-side image compression, resizing, and validation for profile pictures
 */

class ImageUtils {
    constructor() {
        this.maxWidth = 400;
        this.maxHeight = 400;
        this.maxFileSize = 500 * 1024; // 500KB
        this.quality = 0.8; // JPEG quality (0.1 to 1.0)
        this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    }

    /**
     * Validates if the file is an acceptable image type and size
     * @param {File} file - The file to validate
     * @returns {Object} - {valid: boolean, error: string}
     */
    validateFile(file) {
        if (!file) {
            return { valid: false, error: 'Ingen fil valgt' };
        }

        if (!this.allowedTypes.includes(file.type)) {
            return { 
                valid: false, 
                error: 'Ugyldig filtype. Kun JPG, PNG og WebP er tillatt.' 
            };
        }

        // Check if file is too large (before compression)
        if (file.size > 10 * 1024 * 1024) { // 10MB limit before compression
            return { 
                valid: false, 
                error: 'Filen er for stor. Maksimal størrelse er 10MB.' 
            };
        }

        return { valid: true, error: null };
    }

    /**
     * Compresses and resizes an image file or canvas
     * @param {File|HTMLCanvasElement} source - The image file or canvas to compress
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Blob>} - Compressed image blob
     */
    async compressImage(source, progressCallback = null) {
        // Handle canvas input directly
        if (source instanceof HTMLCanvasElement) {
            return this.compressCanvas(source, progressCallback);
        }

        // Handle file input (existing logic)
        return new Promise((resolve, reject) => {
            const validation = this.validateFile(source);
            if (!validation.valid) {
                reject(new Error(validation.error));
                return;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                try {
                    if (progressCallback) progressCallback(25);

                    // Calculate new dimensions while maintaining aspect ratio
                    const { width, height } = this.calculateDimensions(
                        img.width, 
                        img.height, 
                        this.maxWidth, 
                        this.maxHeight
                    );

                    canvas.width = width;
                    canvas.height = height;

                    if (progressCallback) progressCallback(50);

                    // Enable image smoothing for better quality
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    // Draw the resized image
                    ctx.drawImage(img, 0, 0, width, height);

                    if (progressCallback) progressCallback(75);

                    // Convert to blob with compression
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Kunne ikke komprimere bildet'));
                                return;
                            }

                            if (progressCallback) progressCallback(100);

                            // Check if compressed size is acceptable
                            if (blob.size <= this.maxFileSize) {
                                resolve(blob);
                            } else {
                                // If still too large, try with lower quality
                                this.compressWithLowerQuality(canvas, resolve, reject);
                            }
                        },
                        'image/jpeg',
                        this.quality
                    );
                } catch (error) {
                    reject(new Error('Feil ved bildeprosessering: ' + error.message));
                }
            };

            img.onerror = () => {
                reject(new Error('Kunne ikke laste bildet. Kontroller at filen er gyldig.'));
            };

            // Load the image
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Attempts compression with progressively lower quality if file is still too large
     * @param {HTMLCanvasElement} canvas - The canvas with the image
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    compressWithLowerQuality(canvas, resolve, reject) {
        let quality = this.quality - 0.1;
        const attemptCompression = () => {
            if (quality < 0.1) {
                reject(new Error('Kunne ikke komprimere bildet til ønsket størrelse'));
                return;
            }

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Kunne ikke komprimere bildet'));
                        return;
                    }

                    if (blob.size <= this.maxFileSize) {
                        resolve(blob);
                    } else {
                        quality -= 0.1;
                        attemptCompression();
                    }
                },
                'image/jpeg',
                quality
            );
        };

        attemptCompression();
    }

    /**
     * Calculates new dimensions while maintaining aspect ratio
     * @param {number} originalWidth - Original image width
     * @param {number} originalHeight - Original image height
     * @param {number} maxWidth - Maximum allowed width
     * @param {number} maxHeight - Maximum allowed height
     * @returns {Object} - {width: number, height: number}
     */
    calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
        let { width, height } = { width: originalWidth, height: originalHeight };

        // If image is smaller than max dimensions, keep original size
        if (width <= maxWidth && height <= maxHeight) {
            return { width, height };
        }

        // Calculate scaling factor
        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const ratio = Math.min(widthRatio, heightRatio);

        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        return { width, height };
    }

    /**
     * Creates a preview URL for an image file
     * @param {File|Blob} file - The image file
     * @returns {string} - Object URL for preview
     */
    createPreviewUrl(file) {
        return URL.createObjectURL(file);
    }

    /**
     * Revokes a preview URL to free memory
     * @param {string} url - The object URL to revoke
     */
    revokePreviewUrl(url) {
        URL.revokeObjectURL(url);
    }

    /**
     * Formats file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} - Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Compresses a canvas directly
     * @param {HTMLCanvasElement} canvas - The canvas to compress
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Blob>} - Compressed image blob
     */
    async compressCanvas(canvas, progressCallback = null) {
        return new Promise((resolve, reject) => {
            if (progressCallback) progressCallback(25);

            // Calculate new dimensions while maintaining aspect ratio
            const { width, height } = this.calculateDimensions(
                canvas.width,
                canvas.height,
                this.maxWidth,
                this.maxHeight
            );

            if (progressCallback) progressCallback(50);

            // Create new canvas with target dimensions
            const targetCanvas = document.createElement('canvas');
            const ctx = targetCanvas.getContext('2d');

            targetCanvas.width = width;
            targetCanvas.height = height;

            // Enable image smoothing for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Draw the resized image
            ctx.drawImage(canvas, 0, 0, width, height);

            if (progressCallback) progressCallback(75);

            // Convert to blob with compression
            targetCanvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Kunne ikke komprimere bildet'));
                        return;
                    }

                    if (progressCallback) progressCallback(100);

                    // Check if compressed size is acceptable
                    if (blob.size <= this.maxFileSize) {
                        resolve(blob);
                    } else {
                        // If still too large, try with lower quality
                        this.compressWithLowerQuality(targetCanvas, resolve, reject);
                    }
                },
                'image/jpeg',
                this.quality
            );
        });
    }

    /**
     * Creates a cropped canvas from an image element using crop data
     * @param {HTMLImageElement} imageElement - The image element
     * @param {Object} cropData - Crop data from Cropper.js
     * @param {number} outputSize - Desired output size (square)
     * @returns {HTMLCanvasElement} - Cropped canvas
     */
    createCroppedCanvas(imageElement, cropData, outputSize = 400) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = outputSize;
        canvas.height = outputSize;

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw the cropped portion
        ctx.drawImage(
            imageElement,
            cropData.x,
            cropData.y,
            cropData.width,
            cropData.height,
            0,
            0,
            outputSize,
            outputSize
        );

        return canvas;
    }

    /**
     * Creates a preview canvas for real-time crop feedback
     * @param {HTMLImageElement} imageElement - The image element
     * @param {Object} cropData - Crop data from Cropper.js
     * @param {number} previewSize - Preview size (square)
     * @returns {HTMLCanvasElement} - Preview canvas
     */
    createPreviewCanvas(imageElement, cropData, previewSize = 120) {
        return this.createCroppedCanvas(imageElement, cropData, previewSize);
    }

    /**
     * Converts a File to an Image element for cropping
     * Note: This method creates a temporary image for validation/processing
     * The blob URL is revoked after loading, so don't use img.src after resolution
     * @param {File} file - The image file
     * @returns {Promise<HTMLImageElement>} - Image element (with revoked src)
     */
    async fileToImage(file) {
        return new Promise((resolve, reject) => {
            const validation = this.validateFile(file);
            if (!validation.valid) {
                reject(new Error(validation.error));
                return;
            }

            const img = new Image();
            const url = URL.createObjectURL(file);

            const cleanup = () => {
                URL.revokeObjectURL(url);
            };

            img.onload = () => {
                cleanup();
                resolve(img);
            };

            img.onerror = (event) => {
                cleanup();
                console.error('Image load error:', event);
                reject(new Error('Kunne ikke laste bildet'));
            };

            // Set a timeout to prevent hanging
            setTimeout(() => {
                if (img.complete === false) {
                    cleanup();
                    reject(new Error('Bildet tok for lang tid å laste'));
                }
            }, 10000); // 10 second timeout

            img.src = url;
        });
    }

    /**
     * Creates a blob URL for a file (caller responsible for cleanup)
     * @param {File} file - The image file
     * @returns {string} - Blob URL (must be revoked by caller)
     */
    createBlobUrl(file) {
        const validation = this.validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
        return URL.createObjectURL(file);
    }

    /**
     * Generates a unique filename for the profile picture
     * @param {string} userId - The user's ID
     * @param {string} originalExtension - Original file extension
     * @returns {string} - Unique filename
     */
    generateProfilePictureFilename(userId, originalExtension = 'jpg') {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        return `${userId}/profile_${timestamp}_${randomString}.${originalExtension}`;
    }
}

// Create a global instance
window.imageUtils = new ImageUtils();

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageUtils;
}
