/**
 * Image Similarity Detection
 * Helps identify potentially mismatched or duplicate cover images
 */

/**
 * Calculate average color of an image (simple dominant color)
 * Used for quick similarity checking
 */
export async function getImageDominantColor(
  imageUrl: string
): Promise<{ r: number; g: number; b: number } | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let r = 0,
          g = 0,
          b = 0;

        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }

        const pixelCount = data.length / 4;
        resolve({
          r: Math.round(r / pixelCount),
          g: Math.round(g / pixelCount),
          b: Math.round(b / pixelCount),
        });
      };

      img.onerror = () => {
        resolve(null);
      };

      img.src = imageUrl;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Calculate color distance between two colors
 * Returns value between 0 (identical) and 1 (completely different)
 */
export function getColorDistance(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  const dr = (color1.r - color2.r) / 255;
  const dg = (color1.g - color2.g) / 255;
  const db = (color1.b - color2.b) / 255;

  return Math.sqrt(dr * dr + dg * dg + db * db) / Math.sqrt(3);
}

/**
 * Compare two cover images for similarity
 * Returns confidence level that they are the same
 */
export async function compareCoverImages(
  imageUrl1: string,
  imageUrl2: string
): Promise<{
  similarity: number; // 0-1 (0 = different, 1 = identical)
  confidence: "high" | "medium" | "low" | "insufficient-data";
  reason: string;
}> {
  try {
    const color1 = await getImageDominantColor(imageUrl1);
    const color2 = await getImageDominantColor(imageUrl2);

    if (!color1 || !color2) {
      return {
        similarity: 0.5,
        confidence: "insufficient-data",
        reason: "Bilder konnten nicht analysiert werden",
      };
    }

    const distance = getColorDistance(color1, color2);
    const similarity = 1 - distance; // Invert so 1 = identical

    let confidence: "high" | "medium" | "low" | "insufficient-data";
    let reason: string;

    if (similarity > 0.85) {
      confidence = "high";
      reason = "Farben sind sehr ähnlich - wahrscheinlich dasselbe Album";
    } else if (similarity > 0.65) {
      confidence = "medium";
      reason = "Farben sind ähnlich - könnte dasselbe Album sein";
    } else {
      confidence = "low";
      reason = "Farben unterscheiden sich deutlich - unterschiedliche Cover";
    }

    return {
      similarity,
      confidence,
      reason,
    };
  } catch (error) {
    console.error("Image comparison error:", error);
    return {
      similarity: 0.5,
      confidence: "insufficient-data",
      reason: "Fehler bei der Bildvergleichung",
    };
  }
}

/**
 * Detect if image is likely a vinyl/CD cover
 * Based on aspect ratio and other heuristics
 */
export async function isLikelyCoverArt(imageUrl: string): Promise<{
  isLikelyCover: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
}> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const ratio = img.width / img.height;
        const aspectDifference = Math.abs(ratio - 1); // Albums are typically square

        let isLikelyCover = false;
        let confidence: "high" | "medium" | "low" = "low";
        let reason = "Unerwartetes Seitenverhältnis";

        // Album covers are typically square or near-square
        if (aspectDifference < 0.1) {
          isLikelyCover = true;
          confidence = "high";
          reason = "Quadratisches Format passt zu Album-Cover";
        } else if (aspectDifference < 0.3) {
          isLikelyCover = true;
          confidence = "medium";
          reason = "Format ähnelt Album-Cover, aber nicht perfekt quadratisch";
        } else {
          isLikelyCover = false;
          reason = `Seitenverhältnis ${ratio.toFixed(2)} ist nicht typisch für Album-Cover`;
        }

        resolve({
          isLikelyCover,
          confidence,
          reason,
        });
      };

      img.onerror = () => {
        resolve({
          isLikelyCover: false,
          confidence: "low",
          reason: "Bild konnte nicht geladen werden",
        });
      };

      img.src = imageUrl;
    } catch {
      resolve({
        isLikelyCover: false,
        confidence: "low",
        reason: "Fehler bei der Bildprüfung",
      });
    }
  });
}
