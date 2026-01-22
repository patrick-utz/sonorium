import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GripVertical, Plus, Trash2, ExternalLink, Pencil } from "lucide-react";
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
  const [editingShop, setEditingShop] = useState<ShopPreference | null>(null);
  const [newShop, setNewShop] = useState({
    name: "",
    url: "",
    searchUrlTemplate: "",
    country: "CH",
  });
  const [shopToDelete, setShopToDelete] = useState<ShopPreference | null>(null);
  const [draggedShopId, setDraggedShopId] = useState<string | null>(null);
  const [dragOverShopId, setDragOverShopId] = useState<string | null>(null);

  const handleDragStart = (shopId: string) => {
    setDraggedShopId(shopId);
  };

  const handleDragOver = (e: React.DragEvent, shopId: string) => {
    e.preventDefault();
    if (draggedShopId && draggedShopId !== shopId) {
      setDragOverShopId(shopId);
    }
  };

  const handleDragEnd = () => {
    if (!profile || !draggedShopId || !dragOverShopId) {
      setDraggedShopId(null);
      setDragOverShopId(null);
      return;
    }

    const shopsCopy = [...shops].sort((a, b) => a.priority - b.priority);
    const draggedIdx = shopsCopy.findIndex((s) => s.id === draggedShopId);
    const dropIdx = shopsCopy.findIndex((s) => s.id === dragOverShopId);

    if (draggedIdx !== -1 && dropIdx !== -1) {
      const [draggedShop] = shopsCopy.splice(draggedIdx, 1);
      shopsCopy.splice(dropIdx, 0, draggedShop);
      shopsCopy.forEach((s, i) => (s.priority = i + 1));
      updateProfile({ ...profile, shops: shopsCopy });
    }

    setDraggedShopId(null);
    setDragOverShopId(null);
  };

  const handleDragLeave = () => {
    setDragOverShopId(null);
  };
  const toggleShop = (shopId: string) => {
    if (!profile) return;
    const updatedShops = shops.map((s) =>
      s.id === shopId ? { ...s, enabled: !s.enabled } : s
    );
    updateProfile({ ...profile, shops: updatedShops });
  };

  const confirmDeleteShop = () => {
    if (!profile || !shopToDelete) return;
    
    const updatedShops = shops
      .filter(s => s.id !== shopToDelete.id)
      .map((s, i) => ({ ...s, priority: i + 1 }));
    updateProfile({ ...profile, shops: updatedShops });
    toast.success(`${shopToDelete.name} entfernt`);
    setShopToDelete(null);
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

  const startEditing = (shop: ShopPreference) => {
    setEditingShop(shop);
    setNewShop({
      name: shop.name,
      url: shop.url,
      searchUrlTemplate: shop.searchUrlTemplate || "",
      country: shop.country,
    });
    setShowAddForm(true);
  };

  const cancelEditing = () => {
    setEditingShop(null);
    setNewShop({ name: "", url: "", searchUrlTemplate: "", country: "CH" });
    setShowAddForm(false);
  };

  const saveShop = () => {
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

    // Check for duplicate (exclude current shop when editing)
    const duplicateExists = shops.some(s => 
      s.name.toLowerCase() === name.toLowerCase() && 
      (!editingShop || s.id !== editingShop.id)
    );
    if (duplicateExists) {
      toast.error("Ein Shop mit diesem Namen existiert bereits");
      return;
    }

    if (editingShop) {
      // Update existing shop
      const updatedShops = shops.map(s => 
        s.id === editingShop.id 
          ? { 
              ...s, 
              name, 
              url, 
              country: newShop.country,
              searchUrlTemplate: searchUrlTemplate || `${url}/search?q={query}`,
            } 
          : s
      );
      updateProfile({ ...profile, shops: updatedShops });
      toast.success(`${name} aktualisiert`);
    } else {
      // Add new shop
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
      toast.success(`${name} hinzugefügt`);
    }

    setEditingShop(null);
    setNewShop({ name: "", url: "", searchUrlTemplate: "", country: "CH" });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Ziehe Shops per Drag-and-Drop um die Priorität zu ändern.
      </p>
      
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {shops
          .sort((a, b) => a.priority - b.priority)
          .map((shop, idx) => (
            <div
              key={shop.id}
              draggable
              onDragStart={() => handleDragStart(shop.id)}
              onDragOver={(e) => handleDragOver(e, shop.id)}
              onDragEnd={handleDragEnd}
              onDragLeave={handleDragLeave}
              className={`flex items-center gap-2 p-2 rounded-lg border bg-card transition-all ${
                draggedShopId === shop.id 
                  ? "opacity-50 border-primary" 
                  : dragOverShopId === shop.id 
                    ? "border-primary bg-primary/5" 
                    : "border-border"
              }`}
            >
              <div className="p-0.5 text-muted-foreground cursor-grab active:cursor-grabbing">
                <GripVertical className="w-3.5 h-3.5" />
              </div>
              
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
                onClick={() => startEditing(shop)}
                className="p-1 text-muted-foreground hover:text-primary"
                title="Shop bearbeiten"
              >
                <Pencil className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => setShopToDelete(shop)}
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

      {/* Add/Edit Shop Form */}
      {!showAddForm ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={() => {
            setEditingShop(null);
            setShowAddForm(true);
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          Eigenen Shop hinzufügen
        </Button>
      ) : (
        <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/50">
          {editingShop && (
            <p className="text-xs font-medium text-primary">
              Bearbeiten: {editingShop.name}
            </p>
          )}
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
              onClick={cancelEditing}
            >
              Abbrechen
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs"
              onClick={saveShop}
              disabled={!newShop.name.trim() || !newShop.url.trim()}
            >
              {editingShop ? "Speichern" : "Hinzufügen"}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!shopToDelete} onOpenChange={(open) => !open && setShopToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Shop entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du <strong>{shopToDelete?.name}</strong> wirklich aus deiner Liste entfernen?
              {!shopToDelete?.isCustom && (
                <span className="block mt-2 text-muted-foreground">
                  Du kannst diesen Standard-Shop später wiederherstellen.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteShop} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
