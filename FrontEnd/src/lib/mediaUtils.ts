/**
 * Media utilities for file type validation and categorization
 */

// Define allowed file extensions and their corresponding media types
export const MEDIA_EXTENSIONS = {
  // Image formats
  image: {
    extensions: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg"],
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/bmp",
      "image/svg+xml",
    ],
    label: "image",
  },
  // Video formats
  video: {
    extensions: [".mp4", ".webm", ".mov", ".avi", ".mkv", ".flv", ".wmv"],
    mimeTypes: [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
      "video/x-flv",
      "video/x-ms-wmv",
    ],
    label: "video",
  },
} as const;

export type MediaType = "image" | "video";

/**
 * Get the media type (image or video) from a file extension
 */
export const getMediaTypeFromExtension = (
  filename: string
): MediaType | null => {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf("."));

  if (MEDIA_EXTENSIONS.image.extensions.includes(extension)) {
    return "image";
  }
  if (MEDIA_EXTENSIONS.video.extensions.includes(extension)) {
    return "video";
  }

  return null;
};

/**
 * Get the media type from MIME type
 */
export const getMediaTypeFromMimeType = (mimeType: string): MediaType | null => {
  if (MEDIA_EXTENSIONS.image.mimeTypes.includes(mimeType)) {
    return "image";
  }
  if (MEDIA_EXTENSIONS.video.mimeTypes.includes(mimeType)) {
    return "video";
  }

  return null;
};

/**
 * Validate if a file is allowed based on extension and MIME type
 */
export const isValidMediaFile = (file: File): {
  valid: boolean;
  mediaType: MediaType | null;
  error?: string;
} => {
  // Check MIME type first
  const mediaTypeFromMime = getMediaTypeFromMimeType(file.type);
  
  // Check extension
  const mediaTypeFromExt = getMediaTypeFromExtension(file.name);

  // If MIME type is recognized, use it (more reliable)
  if (mediaTypeFromMime) {
    return { valid: true, mediaType: mediaTypeFromMime };
  }

  // Fall back to extension-based check
  if (mediaTypeFromExt) {
    return { valid: true, mediaType: mediaTypeFromExt };
  }

  // Invalid file type
  const allowedExts = [
    ...MEDIA_EXTENSIONS.image.extensions,
    ...MEDIA_EXTENSIONS.video.extensions,
  ].join(", ");

  return {
    valid: false,
    mediaType: null,
    error: `File type not supported. Allowed types: ${allowedExts}`,
  };
};

/**
 * Get file size in MB
 */
export const getFileSizeInMB = (sizeInBytes: number): number => {
  return sizeInBytes / (1024 * 1024);
};

/**
 * Validate file size
 */
export const isValidFileSize = (
  file: File,
  maxSizeInMB: number = 100
): { valid: boolean; error?: string } => {
  const fileSizeInMB = getFileSizeInMB(file.size);

  if (fileSizeInMB > maxSizeInMB) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeInMB}MB. Your file is ${fileSizeInMB.toFixed(
        2
      )}MB`,
    };
  }

  return { valid: true };
};

/**
 * Comprehensive file validation
 */
export const validateMediaFile = (
  file: File,
  maxSizeInMB: number = 100
): {
  valid: boolean;
  mediaType: MediaType | null;
  errors: string[];
} => {
  const errors: string[] = [];
  let mediaType: MediaType | null = null;

  // Check file type
  const typeValidation = isValidMediaFile(file);
  if (!typeValidation.valid) {
    errors.push(typeValidation.error || "Invalid file type");
  } else {
    mediaType = typeValidation.mediaType;
  }

  // Check file size
  const sizeValidation = isValidFileSize(file, maxSizeInMB);
  if (!sizeValidation.valid) {
    errors.push(sizeValidation.error || "File size too large");
  }

  return {
    valid: errors.length === 0,
    mediaType,
    errors,
  };
};

/**
 * Get allowed MIME types for file input accept attribute
 */
export const getAllowedMimeTypes = (): string => {
  return [
    ...MEDIA_EXTENSIONS.image.mimeTypes,
    ...MEDIA_EXTENSIONS.video.mimeTypes,
  ].join(",");
};

/**
 * Get allowed extensions for display
 */
export const getAllowedExtensions = (): string => {
  return [
    ...MEDIA_EXTENSIONS.image.extensions,
    ...MEDIA_EXTENSIONS.video.extensions,
  ].join(", ");
};
