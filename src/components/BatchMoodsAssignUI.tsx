import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoodCategory } from "@/types/audiophileProfile";
import { Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface BatchMoodsAssignUIProps {
  records: Array<{ id: string; album: string; artist: string; moods?: string[] }>;
  allMoods: MoodCategory[];
  onAssignMoods: (selectedMoods: string[], deleteTags: boolean) => Promise<void>;
  onClose: () => void;
}

export function BatchMoodsAssignUI({
  records,
  allMoods,
  onAssignMoods,
  onClose,
}: BatchMoodsAssignUIProps) {
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [deleteTags, setDeleteTags] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const enabledMoods = allMoods.filter((m) => m.enabled);

  const toggleMood = (moodName: string) => {
    setSelectedMoods((prev) =>
      prev.includes(moodName)
        ? prev.filter((m) => m !== moodName)
        : [...prev, moodName]
    );
  };

  const handleStartProcess = async () => {
    if (selectedMoods.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      await onAssignMoods(selectedMoods, deleteTags);
      // Progress wird durch die Parent-Komponente gesetzt
    } catch (error) {
      console.error("Error assigning moods:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const recordsWithoutMoods = records.filter(
    (r) => !r.moods || r.moods.length === 0
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-card border border-border/50 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border/30 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Stimmungen zuweisen</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Info */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {recordsWithoutMoods.length} von {records.length} Alben ohne Stimmung
            </p>
            <p className="text-xs text-muted-foreground">
              {records.length} Alben werden aktualisiert
            </p>
          </div>

          {/* Moods Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Stimmungen auswählen:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {enabledMoods.map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => toggleMood(mood.name)}
                  disabled={isProcessing}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium",
                    selectedMoods.includes(mood.name)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 bg-muted hover:border-primary/50"
                  )}
                  style={
                    selectedMoods.includes(mood.name)
                      ? {
                          borderColor: `hsl(${mood.color})`,
                          backgroundColor: `hsl(${mood.color} / 0.1)`,
                          color: `hsl(${mood.color})`,
                        }
                      : {}
                  }
                >
                  <span className="mr-2">{mood.icon}</span>
                  {mood.name}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-4 border-t border-border/30">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteTags}
                onChange={(e) => setDeleteTags(e.target.checked)}
                disabled={isProcessing}
                className="w-4 h-4 rounded border-border/50"
              />
              <span className="text-sm font-medium">
                Stichworte löschen
              </span>
            </label>
            <p className="text-xs text-muted-foreground ml-7">
              Entfernt alte Tags/Stichworte von allen Alben
            </p>
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2 pt-4 border-t border-border/30">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Verarbeitung läuft...</p>
                <p className="text-xs text-muted-foreground">
                  {progress}/{records.length}
                </p>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(progress / records.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-primary"
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {!isProcessing && records.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-border/30">
              <p className="text-sm font-medium">Preview (erste 5):</p>
              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                {records.slice(0, 5).map((record) => (
                  <div key={record.id} className="text-xs text-muted-foreground">
                    • {record.artist} - {record.album}
                  </div>
                ))}
                {records.length > 5 && (
                  <div className="text-xs text-muted-foreground italic">
                    + {records.length - 5} weitere...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border/30 px-6 py-4 flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleStartProcess}
            disabled={selectedMoods.length === 0 || isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verarbeite...
              </>
            ) : (
              `Stimmungen zuweisen (${selectedMoods.length})`
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
