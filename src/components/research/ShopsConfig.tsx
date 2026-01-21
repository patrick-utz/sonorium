import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { GripVertical } from "lucide-react";
import { ShopPreference, DEFAULT_SHOPS } from "@/types/audiophileProfile";
import { useAudiophileProfile } from "@/context/AudiophileProfileContext";

function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    CH: "🇨🇭",
    DE: "🇩🇪",
    INT: "🌍",
    US: "🇺🇸",
    UK: "🇬🇧",
  };
  return flags[country] || "🌐";
}

export function ShopsConfig() {
  const { profile, updateProfile } = useAudiophileProfile();
  const shops = profile?.shops || DEFAULT_SHOPS;

  const toggleShop = (shopId: string) => {
    if (!profile) return;
    const updatedShops = shops.map((s) =>
      s.id === shopId ? { ...s, enabled: !s.enabled } : s
    );
    updateProfile({ ...profile, shops: updatedShops });
  };

  const moveShopUp = (shopId: string) => {
    if (!profile) return;
    const shopsCopy = [...shops];
    const idx = shopsCopy.findIndex((s) => s.id === shopId);
    if (idx > 0) {
      [shopsCopy[idx - 1], shopsCopy[idx]] = [shopsCopy[idx], shopsCopy[idx - 1]];
      shopsCopy.forEach((s, i) => (s.priority = i + 1));
      updateProfile({ ...profile, shops: shopsCopy });
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Aktiviere/deaktiviere Shops für den Preisvergleich. Reihenfolge = Priorität.
      </p>
      
      <div className="space-y-2">
        {shops
          .sort((a, b) => a.priority - b.priority)
          .map((shop, idx) => (
            <div
              key={shop.id}
              className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card"
            >
              <button
                type="button"
                onClick={() => moveShopUp(shop.id)}
                disabled={idx === 0}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-grab"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{getCountryFlag(shop.country)}</span>
                  <span className="font-medium text-xs">{shop.name}</span>
                </div>
              </div>

              <Switch
                checked={shop.enabled}
                onCheckedChange={() => toggleShop(shop.id)}
                className="scale-75"
              />
            </div>
          ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Discogs = echte Preise • Andere = Suchlink
      </p>
    </div>
  );
}
