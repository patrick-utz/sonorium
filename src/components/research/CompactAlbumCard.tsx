import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Plus, DollarSign, ExternalLink, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlbumRecommendation } from "@/types/audiophileProfile";

interface PressingPrice {
  lowestPrice?: number;
  lowestTotalPrice?: number;
  numForSale: number;
  currency: string;
  releaseUrl?: string;
  loading: boolean;
  error?: string;
}

interface CompactAlbumCardProps {
  album: AlbumRecommendation;
  onAddToWishlist: () => void;
  onExpand: () => void;
  priceData?: PressingPrice;
  isExpanded?: boolean;
}

const StarRating = memo(({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          className={cn(
            "w-3 h-3",
            i < rating ? "star-filled" : "star-empty"
          )}
        />
      ))}
  </div>
));
StarRating.displayName = "StarRating";

const QualityBadge = memo(({ quality }: { quality: string }) => {
  const styles: Record<string, string> = {
    reference: "bg-accent/20 text-accent border-accent/30",
    excellent: "bg-green-500/20 text-green-400 border-green-500/30",
    good: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    acceptable: "bg-muted text-muted-foreground border-border",
  };
  const labels: Record<string, string> = {
    reference: "Ref",
    excellent: "Exc",
    good: "Gut",
    acceptable: "OK",
  };
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", styles[quality] || styles.acceptable)}>
      {labels[quality] || quality}
    </Badge>
  );
});
QualityBadge.displayName = "QualityBadge";

export const CompactAlbumCard = memo(function CompactAlbumCard({
  album,
  onAddToWishlist,
  onExpand,
  priceData,
  isExpanded,
}: CompactAlbumCardProps) {
  const bestPressing = album.bestPressings?.find(
    (p) => !p.avoid && (p.quality === "reference" || p.quality === "excellent")
  ) || album.bestPressings?.[0];

  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-all",
        isExpanded
          ? "bg-secondary/50 border-primary/30"
          : "bg-card border-border hover:border-primary/20"
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-primary">#{album.rank}</span>
        </div>

        {/* Album info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{album.album}</h4>
          <p className="text-xs text-muted-foreground truncate">
            {album.year} · {album.label}
          </p>

          {/* Ratings inline */}
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">M:</span>
              <StarRating rating={album.musicalRating} />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">K:</span>
              <StarRating rating={album.soundRating} />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onAddToWishlist();
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onExpand}
          >
            <ChevronRight
              className={cn(
                "w-4 h-4 transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </Button>
        </div>
      </div>

      {/* Best pressing preview */}
      {bestPressing && !bestPressing.avoid && (
        <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <QualityBadge quality={bestPressing.quality} />
            <code className="text-[10px] bg-muted px-1 py-0.5 rounded truncate">
              {bestPressing.catalogNumber}
            </code>
            {bestPressing.country && (
              <span className="text-[10px] text-muted-foreground">
                {bestPressing.country}
              </span>
            )}
          </div>

          {/* Price */}
          {priceData && !priceData.loading && !priceData.error && priceData.lowestPrice != null && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3 h-3 text-green-500" />
              <span className="text-xs font-medium text-green-500">
                ab {priceData.lowestPrice.toFixed(0)} {priceData.currency}
              </span>
              {priceData.releaseUrl && (
                <a
                  href={priceData.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-accent"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
