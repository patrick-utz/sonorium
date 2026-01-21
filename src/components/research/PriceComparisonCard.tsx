import { memo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ExternalLink,
  Loader2,
  RefreshCw,
  DollarSign,
  Package,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarketplacePrice } from "@/types/audiophileProfile";
import { motion, AnimatePresence } from "framer-motion";

interface PriceComparisonCardProps {
  prices: MarketplacePrice[];
  onRefresh?: () => void;
  isLoading?: boolean;
  compact?: boolean;
}

const CountryFlag = memo(({ country }: { country: string }) => {
  const flags: Record<string, string> = {
    CH: "🇨🇭",
    DE: "🇩🇪",
    INT: "🌍",
    US: "🇺🇸",
    UK: "🇬🇧",
  };
  return <span className="text-sm">{flags[country] || "🌐"}</span>;
});
CountryFlag.displayName = "CountryFlag";

export const PriceComparisonCard = memo(function PriceComparisonCard({
  prices,
  onRefresh,
  isLoading,
  compact = false,
}: PriceComparisonCardProps) {
  const [expanded, setExpanded] = useState(!compact);

  // Get best price
  const pricesWithValues = prices.filter((p) => p.price != null && !p.error);
  const bestPrice = pricesWithValues.length > 0
    ? pricesWithValues.reduce((min, p) => (p.totalEstimate || p.price!) < (min.totalEstimate || min.price!) ? p : min)
    : null;

  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-all flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Preisvergleich</span>
          {bestPrice && (
            <Badge variant="secondary" className="text-xs">
              ab {bestPrice.price?.toFixed(0)} {bestPrice.currency}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {prices.length} Shops
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <Card className={cn(compact && "border-primary/20")}>
      <CardHeader className="py-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Store className="w-4 h-4" />
            Preisvergleich
          </CardTitle>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              </Button>
            )}
            {compact && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setExpanded(false)}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-0 pb-3 space-y-2">
        <AnimatePresence>
          {prices.map((shop, idx) => (
            <motion.div
              key={shop.shopId}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "p-2.5 rounded-md border transition-all",
                shop.error
                  ? "bg-muted/30 border-border"
                  : bestPrice?.shopId === shop.shopId
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-card border-border"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                {/* Shop info */}
                <div className="flex items-center gap-2 min-w-0">
                  <CountryFlag country={shop.country} />
                  <span className="text-sm font-medium truncate">{shop.shopName}</span>
                  {bestPrice?.shopId === shop.shopId && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-400 border-green-500/30">
                      Best
                    </Badge>
                  )}
                </div>

                {/* Price or status */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {shop.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : shop.error ? (
                    <span className="text-xs text-muted-foreground">{shop.error}</span>
                  ) : shop.price != null ? (
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-sm font-semibold text-green-500">
                          {shop.price.toFixed(0)} {shop.currency}
                        </span>
                      </div>
                      {shop.totalEstimate && shop.totalEstimate !== shop.price && (
                        <span className="text-[10px] text-muted-foreground">
                          inkl. Porto ~{shop.totalEstimate.toFixed(0)} {shop.currency}
                        </span>
                      )}
                    </div>
                  ) : shop.productUrl ? (
                    <Badge variant="outline" className="text-xs">
                      Suche öffnen
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}

                  {/* Link */}
                  {shop.productUrl && (
                    <a
                      href={shop.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-accent" />
                    </a>
                  )}
                </div>
              </div>

              {/* Additional info */}
              {shop.numForSale != null && shop.numForSale > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Package className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    {shop.numForSale} verfügbar
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {prices.length === 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Keine Shops konfiguriert
          </div>
        )}
      </CardContent>
    </Card>
  );
});
