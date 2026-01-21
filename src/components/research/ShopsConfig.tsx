import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, Plus, Trash2, ExternalLink } from "lucide-react";
import { ShopPreference, DEFAULT_SHOPS } from "@/types/audiophileProfile";
import { useAudiophileProfile } from "@/context/AudiophileProfileContext";
import { toast } from "sonner";

function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    CH: "🇨🇭",
    DE: "🇩🇪",
    INT: "🌍",
    US: "🇺🇸",
    UK: "🇬🇧",
    FR: "🇫🇷",
    AT: "🇦🇹",
    NL: "🇳🇱",
    JP: "🇯🇵",
  };
  return flags[country] || "🌐";
}

const COUNTRY_OPTIONS = [
  { value: "CH", label: "Schweiz" },
  { value: "DE", label: "Deutschland" },
  { value: "AT", label: "Österreich" },
  { value: "FR", label: "Frankreich" },
  { value: "NL", label: "Niederlande" },
  { value: "UK", label: "Grossbritannien" },
  { value: "US", label: "USA" },
  { value: "JP", label: "Japan" },
  { value: "INT", label: "International" },
];

export function ShopsConfig() {
  const { profile, updateProfile } = useAudiophileProfile();
  const shops = profile?.shops || DEFAULT_SHOPS;
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newShop, setNewShop] = useState({
    name: "",
    url: "",
    searchUrlTemplate: "",
    country: "CH",
  });

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

  const deleteShop = (shopId: string) => {
    if (!profile) return;
    const shop = shops.find(s => s.id === shopId);
    if (!shop) return;
    
    const updatedShops = shops
      .filter(s => s.id !== shopId)
      .map((s, i) => ({ ...s, priority: i + 1 }));
    updateProfile({ ...profile, shops: updatedShops });
    toast.success(`${shop.name} entfernt`);
  };

  // Get default shops that are not in the current list (for restore)
  const removedDefaultShops = DEFAULT_SHOPS.filter(
    defaultShop => !shops.some(s => s.id === defaultShop.id)
  );

  const restoreDefaultShop = (shopId: string) => {
    if (!profile) return;
    const defaultShop = DEFAULT_SHOPS.find(s => s.id === shopId);
    if (!defaultShop) return;
    
    const restoredShop = { ...defaultShop, priority: shops.length + 1 };
    updateProfile({ ...profile, shops: [...shops, restoredShop] });
    toast.success(`${defaultShop.name} wiederhergestellt`);
  };

  const restoreAllDefaults = () => {
    if (!profile) return;
    // Keep custom shops, reset default shops
    const customShops = shops.filter(s => s.isCustom);
    const allDefaults = DEFAULT_SHOPS.map((s, i) => ({ ...s, priority: i + 1 }));
    const combined = [
      ...allDefaults,
      ...customShops.map((s, i) => ({ ...s, priority: allDefaults.length + i + 1 }))
    ];
    updateProfile({ ...profile, shops: combined });
    toast.success("Standard-Shops wiederhergestellt");
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const addCustomShop = () => {
    if (!profile) return;
    
    // Validate inputs
    const name = newShop.name.trim();
    const url = newShop.url.trim();
    const searchUrlTemplate = newShop.searchUrlTemplate.trim();
    
    if (!name || name.length < 2 || name.length > 50) {
      toast.error("Name muss zwischen 2 und 50 Zeichen haben");
      return;
    }
    
    if (!validateUrl(url)) {
      toast.error("Ungültige Shop-URL");
      return;
    }
    
    if (searchUrlTemplate && !searchUrlTemplate.includes("{query}")) {
      toast.error("Such-URL muss {query} als Platzhalter enthalten");
      return;
    }
    
    if (searchUrlTemplate && !validateUrl(searchUrlTemplate.replace("{query}", "test"))) {
      toast.error("Ungültige Such-URL");
      return;
    }

    // Check for duplicate
    if (shops.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Ein Shop mit diesem Namen existiert bereits");
      return;
    }

    const customShop: ShopPreference = {
      id: `custom-${Date.now()}`,
      name,
      url,
      country: newShop.country,
      enabled: true,
      priority: shops.length + 1,
      isCustom: true,
      searchUrlTemplate: searchUrlTemplate || `${url}/search?q={query}`,
    };

    updateProfile({ ...profile, shops: [...shops, customShop] });
    setNewShop({ name: "", url: "", searchUrlTemplate: "", country: "CH" });
    setShowAddForm(false);
    toast.success(`${name} hinzugefügt`);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Aktiviere/deaktiviere Shops. Reihenfolge = Priorität im Preisvergleich.
      </p>
      
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
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
                  <span className="font-medium text-xs truncate">{shop.name}</span>
                  {shop.isCustom && (
                    <span className="text-[10px] text-muted-foreground">(eigener)</span>
                  )}
                </div>
              </div>

              <a
                href={shop.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-muted-foreground hover:text-accent"
              >
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                type="button"
                onClick={() => deleteShop(shop.id)}
                className="p-1 text-muted-foreground hover:text-destructive"
                title={shop.isCustom ? "Shop löschen" : "Shop entfernen"}
              >
                <Trash2 className="w-3 h-3" />
              </button>

              <Switch
                checked={shop.enabled}
                onCheckedChange={() => toggleShop(shop.id)}
                className="scale-75"
              />
            </div>
          ))}
      </div>

      {/* Add Custom Shop */}
      {!showAddForm ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          Eigenen Shop hinzufügen
        </Button>
      ) : (
        <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/50">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input
                placeholder="z.B. Vinyl Corner"
                className="h-8 text-xs"
                value={newShop.name}
                onChange={(e) => setNewShop({ ...newShop, name: e.target.value })}
                maxLength={50}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Land</Label>
              <Select
                value={newShop.country}
                onValueChange={(v) => setNewShop({ ...newShop, country: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {COUNTRY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">
                      {getCountryFlag(c.value)} {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Shop-URL *</Label>
            <Input
              placeholder="https://www.vinylcorner.ch"
              className="h-8 text-xs"
              value={newShop.url}
              onChange={(e) => setNewShop({ ...newShop, url: e.target.value })}
              type="url"
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Such-URL (optional)</Label>
            <Input
              placeholder="https://shop.ch/suche?q={query}"
              className="h-8 text-xs font-mono"
              value={newShop.searchUrlTemplate}
              onChange={(e) => setNewShop({ ...newShop, searchUrlTemplate: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground">
              Verwende <code className="bg-muted px-1 rounded">{"{query}"}</code> als Platzhalter für den Suchbegriff
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                setShowAddForm(false);
                setNewShop({ name: "", url: "", searchUrlTemplate: "", country: "CH" });
              }}
            >
              Abbrechen
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs"
              onClick={addCustomShop}
              disabled={!newShop.name.trim() || !newShop.url.trim()}
            >
              Hinzufügen
            </Button>
          </div>
        </div>
      )}

      {/* Restore Removed Default Shops */}
      {removedDefaultShops.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Entfernte Standard-Shops:</p>
          <div className="flex flex-wrap gap-1.5">
            {removedDefaultShops.map(shop => (
              <button
                key={shop.id}
                onClick={() => restoreDefaultShop(shop.id)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Plus className="w-3 h-3" />
                {getCountryFlag(shop.country)} {shop.name}
              </button>
            ))}
          </div>
          {removedDefaultShops.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={restoreAllDefaults}
            >
              Alle Standard-Shops wiederherstellen
            </Button>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Discogs = echte Marktpreise • Andere = öffnen Suchseite
      </p>
    </div>
  );
}
