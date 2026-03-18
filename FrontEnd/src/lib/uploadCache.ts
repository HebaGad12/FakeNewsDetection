/**
 * Upload cache - maintains references to uploaded files by content hash
 * This ensures the same file always gets the same upload path
 */

interface CachedUpload {
  fileHash: string;
  uploadPath: string;
  uploadedAt: number;
  fileName: string;
}

const CACHE_KEY = "media_upload_cache";
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

/**
 * Generate a SHA-256 hash of file content
 */
async function generateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

/**
 * Get cached upload by file hash
 */
export async function getCachedUpload(file: File): Promise<string | null> {
  try {
    const fileHash = await generateFileHash(file);
    const cache = getUploadCache();
    const cached = cache.find((c) => c.fileHash === fileHash);

    if (cached) {
      // Check if cache is still valid
      if (Date.now() - cached.uploadedAt < CACHE_DURATION) {
        console.log(
          `[UploadCache] Found cached upload for ${file.name}: ${cached.uploadPath}`
        );
        return cached.uploadPath;
      } else {
        // Remove expired cache entry
        removeFromCache(fileHash);
      }
    }
  } catch (error) {
    console.error("[UploadCache] Error generating file hash:", error);
  }

  return null;
}

/**
 * Cache an upload result by file hash
 */
export async function cacheUpload(
  file: File,
  uploadPath: string
): Promise<void> {
  try {
    const fileHash = await generateFileHash(file);
    const cache = getUploadCache();

    // Remove any existing entry with the same hash
    const filtered = cache.filter((c) => c.fileHash !== fileHash);

    // Add new entry
    filtered.push({
      fileHash,
      uploadPath,
      uploadedAt: Date.now(),
      fileName: file.name,
    });

    // Keep cache size manageable (max 100 entries)
    if (filtered.length > 100) {
      filtered.shift();
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
    console.log(
      `[UploadCache] Cached upload for ${file.name}: ${uploadPath}`
    );
  } catch (error) {
    console.error("[UploadCache] Error caching upload:", error);
  }
}

/**
 * Get entire upload cache
 */
function getUploadCache(): CachedUpload[] {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error("[UploadCache] Error reading cache:", error);
    return [];
  }
}

/**
 * Remove entry from cache by file hash
 */
function removeFromCache(fileHash: string): void {
  try {
    const cache = getUploadCache();
    const filtered = cache.filter((c) => c.fileHash !== fileHash);
    localStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("[UploadCache] Error removing from cache:", error);
  }
}

/**
 * Clear all upload cache
 */
export function clearUploadCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log("[UploadCache] Cache cleared");
  } catch (error) {
    console.error("[UploadCache] Error clearing cache:", error);
  }
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): {
  entries: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
} {
  const cache = getUploadCache();
  if (cache.length === 0) {
    return { entries: 0, oldestEntry: null, newestEntry: null };
  }

  const timestamps = cache.map((c) => c.uploadedAt);
  return {
    entries: cache.length,
    oldestEntry: new Date(Math.min(...timestamps)),
    newestEntry: new Date(Math.max(...timestamps)),
  };
}

/**
 * Get all cached uploads for debugging
 */
export function getAllCachedUploads(): CachedUpload[] {
  return getUploadCache();
}
