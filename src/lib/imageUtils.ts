/**
 * Compress and resize an image for storage
 * @param dataUrl - Base64 data URL of the image
 * @param maxWidth - Maximum width (default 800px for better quality)
 * @param quality - JPEG quality 0-1 (default 0.85)
 * @returns Compressed base64 data URL
 */
export function compressImage(
  dataUrl: string,
  maxWidth = 800,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // Scale down if larger than maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Use better image smoothing for quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Compress image optimized for cover art (square-ish aspect ratio)
 * @param dataUrl - Base64 data URL
 * @returns Compressed and optimized cover image
 */
export function compressCoverImage(dataUrl: string): Promise<string> {
  return compressImage(dataUrl, 800, 0.85);
}

/**
 * Quick compress for thumbnails
 */
export function compressThumbnail(dataUrl: string): Promise<string> {
  return compressImage(dataUrl, 300, 0.7);
}
