import { useState } from "react";
import { useAudiophileProfile } from "@/context/AudiophileProfileContext";
import { MoodCategory, DEFAULT_MOODS, MOOD_COLORS } from "@/types/audiophileProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  Sparkles, 
  GripVertical, 
  Plus, 
  Trash2, 
  Pencil, 
  Check, 
  X, 
  RotateCcw,
  Search,
  Palette,
  Wand2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useRecords } from "@/context/RecordContext";

const EMOJI_SUGGESTIONS = ["🌙", "⚡", "💭", "💫", "🎉", "🎯", "🔥", "❄️", "🌊", "🌸", "🎸", "🎹", "✨", "🌈", "🎭", "💎"];

export function MoodsConfig() {
  const { profile, updateProfile } = useAudiophileProfile();
  const { records, refreshRecords } = useRecords();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editColor, setEditColor] = useState<string | undefined>(undefined);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMoodName, setNewMoodName] = useState("");
  const [newMoodIcon, setNewMoodIcon] = useState("✨");
  const [newMoodColor, setNewMoodColor] = useState<string>(MOOD_COLORS[0].hsl);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAssigningMoods, setIsAssigningMoods] = useState(false);

  const moods = profile?.moods || DEFAULT_MOODS;
  const enabledMoods = moods.filter(m => m.enabled).sort((a, b) => a.priority - b.priority);
  const disabledMoods = moods.filter(m => !m.enabled).sort((a, b) => a.priority - b.priority);

  // Count records without moods
  const recordsWithoutMoods = records.filter(r => !r.moods || r.moods.length === 0).length;

  // Filter moods based on search
  const filteredEnabled = searchQuery 
    ? enabledMoods.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : enabledMoods;
  const filteredDisabled = searchQuery
    ? disabledMoods.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : disabledMoods;

  const handleToggle = async (moodId: string, enabled: boolean) => {
    if (!profile) return;
    
    const updatedMoods = moods.map(m => 
      m.id === moodId ? { ...m, enabled } : m
    );
    
    await updateProfile({ ...profile, moods: updatedMoods });
    toast.success(enabled ? "Stimmung aktiviert" : "Stimmung deaktiviert");
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId || !profile || draggedId === targetId) return;

    const draggedMood = moods.find(m => m.id === draggedId);
    const targetMood = moods.find(m => m.id === targetId);
    
    if (!draggedMood || !targetMood) return;

    // Only reorder within enabled moods
    const sortedEnabled = [...enabledMoods];
    const draggedIndex = sortedEnabled.findIndex(m => m.id === draggedId);
    const targetIndex = sortedEnabled.findIndex(m => m.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove and insert at new position
    sortedEnabled.splice(draggedIndex, 1);
    sortedEnabled.splice(targetIndex, 0, draggedMood);

    // Update priorities
    const updatedMoods = moods.map(m => {
      const newIndex = sortedEnabled.findIndex(s => s.id === m.id);
      if (newIndex !== -1) {
        return { ...m, priority: newIndex + 1 };
      }
      return m;
    });

    await updateProfile({ ...profile, moods: updatedMoods });
    setDraggedId(null);
  };

  const startEdit = (mood: MoodCategory) => {
    setEditingId(mood.id);
    setEditName(mood.name);
    setEditIcon(mood.icon);
    setEditColor(mood.color);
  };

  const saveEdit = async () => {
    if (!profile || !editingId || !editName.trim()) return;

    const updatedMoods = moods.map(m => 
      m.id === editingId ? { ...m, name: editName.trim(), icon: editIcon, color: editColor } : m
    );

    await updateProfile({ ...profile, moods: updatedMoods });
    setEditingId(null);
    setEditColor(undefined);
    toast.success("Stimmung aktualisiert");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditIcon("");
    setEditColor(undefined);
  };

  const handleAddMood = async () => {
    if (!profile || !newMoodName.trim()) return;

    const newId = newMoodName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const newMood: MoodCategory = {
      id: newId,
      name: newMoodName.trim(),
      icon: newMoodIcon,
      color: newMoodColor,
      enabled: true,
      priority: enabledMoods.length + 1,
      isCustom: true,
    };

    const updatedMoods = [...moods, newMood];
    await updateProfile({ ...profile, moods: updatedMoods });
    
    setShowAddDialog(false);
    setNewMoodName("");
    setNewMoodIcon("✨");
    setNewMoodColor(MOOD_COLORS[0].hsl);
    toast.success("Neue Stimmung hinzugefügt");
  };

  const handleColorChange = async (moodId: string, color: string) => {
    if (!profile) return;
    
    const updatedMoods = moods.map(m => 
      m.id === moodId ? { ...m, color } : m
    );
    
    await updateProfile({ ...profile, moods: updatedMoods });
  };

  const handleDelete = async (moodId: string) => {
    if (!profile) return;

    const mood = moods.find(m => m.id === moodId);
    if (!mood?.isCustom) {
      // For default moods, just disable them
      await handleToggle(moodId, false);
      return;
    }

    const updatedMoods = moods.filter(m => m.id !== moodId);
    await updateProfile({ ...profile, moods: updatedMoods });
    toast.success("Stimmung gelöscht");
  };

  const handleResetToDefaults = async () => {
    if (!profile) return;
    
    await updateProfile({ ...profile, moods: DEFAULT_MOODS });
    toast.success("Stimmungen auf Standard zurückgesetzt");
  };

  const handleBulkAssignMoods = async () => {
    setIsAssigningMoods(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Bitte melde dich an");
        return;
      }

      const response = await supabase.functions.invoke("bulk-assign-moods", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      if (result.success) {
        toast.success(result.message);
        // Refresh records to show new moods
        await refreshRecords();
      } else {
        throw new Error(result.error || "Unbekannter Fehler");
      }
    } catch (error) {
      console.error("Bulk assign moods error:", error);
      toast.error("Fehler beim Zuweisen der Stimmungen", {
        description: error instanceof Error ? error.message : "Bitte versuche es erneut",
      });
    } finally {
      setIsAssigningMoods(false);
    }
  };

  const MoodItem = ({ mood, isDraggable }: { mood: MoodCategory; isDraggable: boolean }) => {
    const isEditing = editingId === mood.id;

    return (
      <div
        draggable={isDraggable && !isEditing}
        onDragStart={() => handleDragStart(mood.id)}
        onDragOver={(e) => handleDragOver(e, mood.id)}
        onDrop={() => handleDrop(mood.id)}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border bg-card transition-all",
          isDraggable && !isEditing && "cursor-grab active:cursor-grabbing",
          draggedId === mood.id && "opacity-50",
          !mood.enabled && "opacity-60"
        )}
        style={mood.color && mood.enabled ? { 
          borderLeftWidth: '3px',
          borderLeftColor: `hsl(${mood.color})`
        } : undefined}
      >
        {isDraggable && !isEditing && (
          <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        
        {isEditing ? (
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1 flex-wrap">
                {EMOJI_SUGGESTIONS.slice(0, 8).map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setEditIcon(emoji)}
                    className={cn(
                      "w-8 h-8 rounded-md text-lg flex items-center justify-center transition-colors",
                      editIcon === emoji ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Farbe:</span>
              <div className="flex gap-1 flex-wrap">
                {MOOD_COLORS.map(color => (
                  <button
                    key={color.id}
                    onClick={() => setEditColor(color.hsl)}
                    className={cn(
                      "w-6 h-6 rounded-full transition-all border-2",
                      editColor === color.hsl ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: `hsl(${color.hsl})` }}
                    title={color.name}
                  />
                ))}
              </div>
              <div className="flex-1" />
              <Button size="sm" variant="ghost" onClick={saveEdit}>
                <Check className="w-4 h-4 text-primary mr-1" />
                Speichern
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                <X className="w-4 h-4 mr-1" />
                Abbrechen
              </Button>
            </div>
          </div>
        ) : (
          <>
            <span className="text-xl flex-shrink-0">{mood.icon}</span>
            <span className="flex-1 font-medium truncate">{mood.name}</span>
            
            {/* Color indicator */}
            {mood.color && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="w-5 h-5 rounded-full border border-border/50 hover:scale-110 transition-transform"
                    style={{ backgroundColor: `hsl(${mood.color})` }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="end">
                  <div className="flex gap-1 flex-wrap max-w-[200px]">
                    {MOOD_COLORS.map(color => (
                      <button
                        key={color.id}
                        onClick={() => handleColorChange(mood.id, color.hsl)}
                        className={cn(
                          "w-7 h-7 rounded-full transition-all border-2",
                          mood.color === color.hsl ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: `hsl(${color.hsl})` }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            
            {!mood.color && mood.enabled && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <Palette className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="end">
                  <div className="flex gap-1 flex-wrap max-w-[200px]">
                    {MOOD_COLORS.map(color => (
                      <button
                        key={color.id}
                        onClick={() => handleColorChange(mood.id, color.hsl)}
                        className="w-7 h-7 rounded-full transition-all border-2 border-transparent hover:scale-105"
                        style={{ backgroundColor: `hsl(${color.hsl})` }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {mood.enabled && (
              <Button size="icon" variant="ghost" onClick={() => startEdit(mood)}>
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
            
            {mood.isCustom && (
              <Button size="icon" variant="ghost" onClick={() => handleDelete(mood.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
            
            <Switch
              checked={mood.enabled}
              onCheckedChange={(checked) => handleToggle(mood.id, checked)}
            />
          </>
        )}
      </div>
    );
  };

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Stimmungen
            </CardTitle>
            <CardDescription className="mt-1">
              Konfiguriere deine 6 Haupt-Stimmungen für das Filtern und Kategorisieren
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleResetToDefaults}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Zurücksetzen
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Hinzufügen
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Color Preview Banner */}
        {enabledMoods.length > 0 && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground mb-3">Vorschau deiner Stimmungs-Palette</p>
            <div className="flex flex-wrap gap-3">
              {enabledMoods.map(mood => (
                <div 
                  key={mood.id} 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background transition-all hover:scale-105"
                  style={mood.color ? {
                    borderColor: `hsl(${mood.color})`,
                    borderLeftWidth: '3px',
                  } : undefined}
                >
                  <span className="text-sm">{mood.icon}</span>
                  <span className="text-sm font-medium">{mood.name}</span>
                  {mood.color && (
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: `hsl(${mood.color})` }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search - show when more than 6 moods */}
        {moods.length > 6 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Stimmungen durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Active Moods */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Aktive Stimmungen ({filteredEnabled.length})
          </h4>
          <div className="space-y-2">
            {filteredEnabled.map(mood => (
              <MoodItem key={mood.id} mood={mood} isDraggable={true} />
            ))}
            {filteredEnabled.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery ? "Keine Stimmungen gefunden" : "Keine aktiven Stimmungen"}
              </p>
            )}
          </div>
        </div>

        {/* Disabled Moods */}
        {filteredDisabled.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground">
              Deaktivierte Stimmungen ({filteredDisabled.length})
            </h4>
            <div className="space-y-2">
              {filteredDisabled.map(mood => (
                <MoodItem key={mood.id} mood={mood} isDraggable={false} />
              ))}
            </div>
          </div>
        )}

        {/* Bulk Assign Moods Section */}
        {recordsWithoutMoods > 0 && (
          <div className="pt-4 border-t border-border">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <Wand2 className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">
                    Stimmungen automatisch zuweisen
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {recordsWithoutMoods} {recordsWithoutMoods === 1 ? 'Album hat' : 'Alben haben'} noch keine Stimmungen. 
                    KI kann basierend auf Künstler und Genre passende Stimmungen zuweisen.
                  </p>
                  <Button 
                    onClick={handleBulkAssignMoods} 
                    disabled={isAssigningMoods}
                    className="mt-3 gap-2"
                    size="sm"
                  >
                    {isAssigningMoods ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Zuweisen...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        Jetzt Stimmungen zuweisen
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Add Mood Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Stimmung hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Icon wählen</label>
              <div className="flex gap-2 flex-wrap">
                {EMOJI_SUGGESTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setNewMoodIcon(emoji)}
                    className={cn(
                      "w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors",
                      newMoodIcon === emoji ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Farbe wählen</label>
              <div className="flex gap-2 flex-wrap">
                {MOOD_COLORS.map(color => (
                  <button
                    key={color.id}
                    onClick={() => setNewMoodColor(color.hsl)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all border-2",
                      newMoodColor === color.hsl ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: `hsl(${color.hsl})` }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="z.B. Nachdenklich, Sommerlich, etc."
                value={newMoodName}
                onChange={(e) => setNewMoodName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAddMood} disabled={!newMoodName.trim()}>
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
