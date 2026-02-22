import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GenreMapping {
  [key: string]: string;
}

interface GenreStandardizationUIProps {
  records: Array<{ id: string; album: string; artist: string; genre: string[] }>;
  onStandardizeGenres: (mappings: GenreMapping) => Promise<void>;
  onClose: () => void;
}

const STANDARD_GENRES = [
  "Rock",
  "Pop",
  "Jazz",
  "Jazz Fusion",
  "Jazz Latin",
  "Classical",
  "Electronic",
  "Hip-Hop",
  "Reggae",
  "Soul",
  "Country",
  "Folk",
  "Latin",
  "World",
];

export function GenreStandardizationUI({
  records,
  onStandardizeGenres,
  onClose,
}: GenreStandardizationUIProps) {
  const [genreMappings, setGenreMappings] = useState<GenreMapping>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Extrahiere alle einzigartigen Genres
  const uniqueGenres = useMemo(() => {
    const genres = new Set<string>();
    records.forEach((r) => {
      r.genre?.forEach((g) => {
        if (g && g.trim()) {
          genres.add(g.trim());
        }
      });
    });
    return Array.from(genres).sort();
  }, [records]);

  const handleMappingChange = (oldGenre: string, newGenre: string) => {
    setGenreMappings((prev) => ({
      ...prev,
      [oldGenre]: newGenre,
    }));
  };

  const handleStartProcess = async () => {
    setIsProcessing(true);
    setProgress(0);

    try {
      await onStandardizeGenres(genreMappings);
    } catch (error) {
      console.error("Error standardizing genres:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const allMapped = uniqueGenres.every((g) => genreMappings[g]);

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
          <h2 className="text-xl font-bold">Genres standardisieren</h2>
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
              {uniqueGenres.length} verschiedene Genre gefunden
            </p>
            <p className="text-xs text-muted-foreground">
              Mappen Sie alte Genre-Namen auf Standard-Genres
            </p>
          </div>

          {/* Genre Mappings */}
          {uniqueGenres.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {uniqueGenres.map((genre) => (
                <div
                  key={genre}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/20"
                >
                  <div className="flex-shrink-0 min-w-[150px]">
                    <p className="text-sm font-medium text-foreground truncate">
                      {genre}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {records.filter((r) => r.genre?.includes(genre)).length} Alben
                    </p>
                  </div>

                  <div className="flex-1">
                    <Select
                      value={genreMappings[genre] || ""}
                      onValueChange={(value) => handleMappingChange(genre, value)}
                      disabled={isProcessing}
                    >
                      <SelectTrigger className="bg-background border-border/50 h-9">
                        <SelectValue placeholder="Standard-Genre wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {STANDARD_GENRES.map((stdGenre) => (
                          <SelectItem key={stdGenre} value={stdGenre}>
                            {stdGenre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {genreMappings[genre] && (
                    <div className="flex-shrink-0 text-xs font-medium text-primary">
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Keine Genres gefunden
              </p>
            </div>
          )}

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
            disabled={!allMapped || isProcessing || uniqueGenres.length === 0}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Standardisiere...
              </>
            ) : (
              "Genres standardisieren"
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
