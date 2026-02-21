/**
 * Sharing Utilities - Generate shareable links, tokens, and manage collections
 */

import { Record } from "@/types/record";

/**
 * Generate a unique share token
 */
export function generateShareToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Generate shareable URL for a collection
 */
export function generateShareURL(token: string, baseURL: string = window.location.origin): string {
  return `${baseURL}/shared/${token}`;
}

/**
 * Filter records based on sharing options
 */
export interface ShareOptions {
  includeWishlist: boolean;
  onlyFavorites: boolean;
  genres?: string[];
  status?: Array<"owned" | "wishlist" | "checked-not-bought">;
}

export function filterRecordsForSharing(
  records: Record[],
  options: ShareOptions
): Record[] {
  let filtered = [...records];

  // Filter by status
  if (!options.includeWishlist) {
    filtered = filtered.filter((r) => r.status === "owned");
  }

  if (options.status && options.status.length > 0) {
    filtered = filtered.filter((r) => options.status!.includes(r.status));
  }

  // Filter by favorites
  if (options.onlyFavorites) {
    filtered = filtered.filter((r) => r.isFavorite);
  }

  // Filter by genres
  if (options.genres && options.genres.length > 0) {
    filtered = filtered.filter((r) =>
      r.genre.some((g) => options.genres!.includes(g))
    );
  }

  return filtered;
}

/**
 * Create share metadata
 */
export interface ShareMetadata {
  token: string;
  createdAt: string;
  expiresAt?: string;
  recordCount: number;
  options: ShareOptions;
  recipientEmail?: string;
}

/**
 * Store share metadata in localStorage
 */
export function storeShareMetadata(metadata: ShareMetadata): void {
  const shares = getStoredShares();
  shares.push(metadata);
  localStorage.setItem("sonorium_shares", JSON.stringify(shares));
}

/**
 * Get all stored shares
 */
export function getStoredShares(): ShareMetadata[] {
  const stored = localStorage.getItem("sonorium_shares");
  return stored ? JSON.parse(stored) : [];
}

/**
 * Delete a share
 */
export function deleteShare(token: string): void {
  const shares = getStoredShares();
  const filtered = shares.filter((s) => s.token !== token);
  localStorage.setItem("sonorium_shares", JSON.stringify(filtered));
}

/**
 * Check if share is expired
 */
export function isShareExpired(metadata: ShareMetadata): boolean {
  if (!metadata.expiresAt) return false;
  return new Date(metadata.expiresAt) < new Date();
}

/**
 * Format share metadata for display
 */
export function formatShareDate(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Get share statistics
 */
export interface ShareStats {
  totalShares: number;
  activeShares: number;
  totalRecordsShared: number;
  mostRecentShare?: ShareMetadata;
}

export function getShareStats(shares: ShareMetadata[]): ShareStats {
  const now = new Date();
  const active = shares.filter(
    (s) => !s.expiresAt || new Date(s.expiresAt) > now
  );

  return {
    totalShares: shares.length,
    activeShares: active.length,
    totalRecordsShared: shares.reduce((sum, s) => sum + s.recordCount, 0),
    mostRecentShare: shares.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0],
  };
}
