import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Star,
  Plus,
  DollarSign,
  ExternalLink,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AlbumRecommendation } from "@/types/audiophileProfile";
import { motion } from "framer-motion";

interface PressingPrice {
  lowestPrice?: number;
  lowestTotalPrice?: number;
  numForSale: number;
  currency: string;
  releaseUrl?: string;
  loading: boolean;
  error?: string;
}

interface ExpandedPressingDetailsProps {
  album: AlbumRecommendation;
  onAddToWishlist: () => void;
  pressingPrices: Record<string, PressingPrice>;
  onFetchPrice: (catalogNumber: string, label: string, key: string) => void;
  albumIndex: number;
}

const QualityBadge = memo(({ quality }: { quality: string }) => {
  const styles: Record<string, string> = {
    reference: "bg-accent/20 text-accent border-accent/30",
    excellent: "bg-green-500/20 text-green-400 border-green-500/30",
    good: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    acceptable: "bg-muted text-muted-foreground border-border",
  };
  const labels: Record<string, string> = {
    reference: "Referenz",
    excellent: "Exzellent",
    good: "Gut",
    acceptable: "Akzeptabel",
  };
  return (
    <Badge variant="outline" className={cn("text-xs", styles[quality] || styles.acceptable)}>
      {labels[quality] || quality}
    </Badge>
  );
});
QualityBadge.displayName = "QualityBadge";

export const ExpandedPressingDetails = memo(function ExpandedPressingDetails({
  album,
  onAddToWishlist,
  pressingPrices,
  onFetchPrice,
  albumIndex,
}: ExpandedPressingDetailsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="p-4 bg-secondary/30 rounded-lg border border-border mt-2 space-y-4">
        {/* Description */}
        <p className="text-sm">{album.description}</p>
        {album.notes && (
          <p className="text-sm text-muted-foreground italic">{album.notes}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button onClick={onAddToWishlist} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Zur Wunschliste
          </Button>
        </div>

        {/* Pressings list */}
        {album.bestPressings && album.bestPressings.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Empfohlene Pressungen
            </h5>
            <div className="space-y-2">
              {album.bestPressings.map((pressing, pIdx) => {
                const priceKey = `${albumIndex}-${pIdx}`;
                const priceData = pressingPrices[priceKey];

                return (
                  <div
                    key={pIdx}
                    className={cn(
                      "p-3 rounded-md border",
                      pressing.avoid
                        ? "bg-destructive/5 border-destructive/30"
                        : "bg-card border-border"
                    )}
                  >
                    {/* Pressing header */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {pressing.label}
                        </span>
                        {pressing.catalogNumber && (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {pressing.catalogNumber}
                          </code>
                        )}
                        {pressing.year && (
                          <span className="text-xs text-muted-foreground">
                            {pressing.year}
                          </span>
                        )}
                        {pressing.country && (
                          <span className="text-xs text-muted-foreground">
                            ({pressing.country})
                          </span>
                        )}
                      </div>
                      {pressing.avoid ? (
                        <Badge
                          variant="outline"
                          className="border-destructive/50 text-destructive gap-1 text-xs"
                        >
                          <XCircle className="w-3 h-3" />
                          Vermeiden
                        </Badge>
                      ) : (
                        <QualityBadge quality={pressing.quality} />
                      )}
                    </div>

                    {/* Notes */}
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {pressing.notes}
                    </p>

                    {pressing.matrixInfo && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Matrix:{" "}
                        <code className="bg-muted px-1 rounded">
                          {pressing.matrixInfo}
                        </code>
                      </p>
                    )}

                    {/* Price section */}
                    {!pressing.avoid && pressing.catalogNumber && (
                      <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between flex-wrap gap-2">
                        {priceData?.loading ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Preise laden...
                          </div>
                        ) : priceData?.error ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-muted-foreground">
                              Nicht verfügbar
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() =>
                                onFetchPrice(
                                  pressing.catalogNumber!,
                                  pressing.label,
                                  priceKey
                                )
                              }
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Erneut
                            </Button>
                          </div>
                        ) : priceData ? (
                          <div className="flex items-center justify-between w-full flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              {priceData.lowestPrice != null && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-3.5 h-3.5 text-green-500" />
                                  <span className="text-sm font-semibold text-green-500">
                                    ab {priceData.lowestPrice.toFixed(0)}{" "}
                                    {priceData.currency}
                                  </span>
                                </div>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {priceData.numForSale} verfügbar
                              </Badge>
                            </div>
                            {priceData.releaseUrl && (
                              <a
                                href={priceData.releaseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                              >
                                Discogs
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() =>
                              onFetchPrice(
                                pressing.catalogNumber!,
                                pressing.label,
                                priceKey
                              )
                            }
                          >
                            <DollarSign className="w-3 h-3 mr-1" />
                            Preis abrufen
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});
