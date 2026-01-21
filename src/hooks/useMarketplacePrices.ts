import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplacePrice, ShopPreference, DEFAULT_SHOPS } from "@/types/audiophileProfile";
import { useAudiophileProfile } from "@/context/AudiophileProfileContext";

export function useMarketplacePrices() {
  const [prices, setPrices] = useState<Record<string, MarketplacePrice[]>>({});
  const [loading, setLoading] = useState(false);
  const { profile } = useAudiophileProfile();

  const getEnabledShops = useCallback((): string[] => {
    const shops = profile?.shops || DEFAULT_SHOPS;
    return shops
      .filter((s) => s.enabled)
      .sort((a, b) => a.priority - b.priority)
      .map((s) => s.id);
  }, [profile?.shops]);

  const fetchPrices = useCallback(
    async (artist: string, album: string, catalogNumber?: string): Promise<MarketplacePrice[]> => {
      const cacheKey = `${artist}|${album}|${catalogNumber || ""}`.toLowerCase();
      
      // Return cached if available
      if (prices[cacheKey]) {
        return prices[cacheKey];
      }

      setLoading(true);
      const enabledShops = getEnabledShops();

      // Initialize with loading states
      const initialPrices: MarketplacePrice[] = enabledShops.map((shopId) => {
        const shop = (profile?.shops || DEFAULT_SHOPS).find((s) => s.id === shopId);
        return {
          shopId,
          shopName: shop?.name || shopId,
          shopUrl: shop?.url || "",
          country: shop?.country || "?",
          currency: shop?.country === "DE" ? "EUR" : "CHF",
          loading: true,
        };
      });

      setPrices((prev) => ({ ...prev, [cacheKey]: initialPrices }));

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error("Nicht angemeldet");
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/marketplace-search`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              artist,
              album,
              catalogNumber,
              shops: enabledShops,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Suche fehlgeschlagen");
        }

        const data = await response.json();
        
        const results: MarketplacePrice[] = (data.results || []).map((r: any) => ({
          shopId: r.shopId,
          shopName: r.shopName,
          shopUrl: r.shopUrl,
          country: r.country,
          price: r.price,
          currency: r.currency,
          shippingEstimate: r.shippingEstimate,
          totalEstimate: r.totalEstimate,
          numForSale: r.numForSale,
          condition: r.condition,
          productUrl: r.productUrl,
          inStock: r.inStock,
          loading: false,
          error: r.error,
        }));

        setPrices((prev) => ({ ...prev, [cacheKey]: results }));
        return results;
      } catch (err) {
        console.error("Marketplace search error:", err);
        const errorResults = initialPrices.map((p) => ({
          ...p,
          loading: false,
          error: "Verbindungsfehler",
        }));
        setPrices((prev) => ({ ...prev, [cacheKey]: errorResults }));
        return errorResults;
      } finally {
        setLoading(false);
      }
    },
    [getEnabledShops, prices, profile?.shops]
  );

  const clearCache = useCallback(() => {
    setPrices({});
  }, []);

  return {
    prices,
    loading,
    fetchPrices,
    clearCache,
    getEnabledShops,
  };
}
