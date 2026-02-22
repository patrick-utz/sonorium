import React, { useState, useEffect } from "react";
import { Record } from "@/types/record";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  "World"
];

interface BatchAssignGenresWithReviewUIProps {
  records: Record[];
  isOpen: boolean;
  onClose: () => void;
  onApply: (assignments: { recordId: string; genres: string[] }[]) => void;
}

interface GenreAssignment {
  recordId: string;
  genres: string[];
}

export function BatchAssignGenresWithReviewUI({
  records,
  isOpen,
  onClose,
  onApply,
}: BatchAssignGenresWithReviewUIProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [assignments, setAssignments] = useState<Map<string, string[]>>(new Map());

  // Generate AI suggestions on open
  useEffect(() => {
    if (isOpen && records.length > 0 && assignments.size === 0) {
      generateSuggestions();
    }
  }, [isOpen]);

  const generateSuggestions = async () => {
    setIsLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("No auth token");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-assign-genres`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recordIds: records.map((r) => r.id),
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate suggestions");

      const data = await response.json();

      // Map assignments
      const newAssignments = new Map<string, string[]>();
      if (data.assignments && Array.isArray(data.assignments)) {
        data.assignments.forEach(
          (assignment: { recordId: string; genres: string[] }) => {
            newAssignments.set(assignment.recordId, assignment.genres);
          }
        );
      }

      setAssignments(newAssignments);

      if (data.errors && data.errors.length > 0) {
        toast.warning(`Einige Fehler bei der Verarbeitung: ${data.errors.length}`);
      } else {
        toast.success(`${data.updated} Alben analysiert`);
      }
    } catch (error) {
      toast.error("Fehler beim Generieren von Vorschlägen");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGenre = (recordId: string, genre: string) => {
    const current = assignments.get(recordId) || [];
    const updated = current.includes(genre)
      ? current.filter((g) => g !== genre)
      : [...current, genre];
    setAssignments(new Map(assignments.set(recordId, updated)));
  };

  const addGenre = (recordId: string, genre: string) => {
    const current = assignments.get(recordId) || [];
    if (!current.includes(genre) && current.length < 2) {
      setAssignments(new Map(assignments.set(recordId, [...current, genre])));
    }
  };

  const handleApply = () => {
    const finalAssignments: GenreAssignment[] = Array.from(assignments.entries()).map(
      ([recordId, genres]) => ({
        recordId,
        genres,
      })
    );

    onApply(finalAssignments);
    onClose();
  };

  const completeCount = Array.from(assignments.values()).filter(
    (genres) => genres.length > 0
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Genres zuweisen</DialogTitle>
          <DialogDescription>
            Standardisiere Genres für {records.length} Alben
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Generiere Vorschläge...</p>
          </div>
        ) : (
          <>
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fortschritt</span>
                <span className="font-semibold">
                  {completeCount}/{records.length}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <motion.div
                  className="bg-primary h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(completeCount / records.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Records List - Scrollable */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-4">
              <AnimatePresence>
                {records.map((record, index) => {
                  const genres = assignments.get(record.id) || [];
                  const availableGenres = STANDARD_GENRES.filter(
                    (g) => !genres.includes(g)
                  );

                  return (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 bg-card border border-border/50 rounded-lg space-y-2"
                    >
                      {/* Album Info */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{record.album}</h4>
                          <p className="text-xs text-muted-foreground">{record.artist}</p>
                          {record.genre && record.genre.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Aktuell: {record.genre.join(", ")}
                            </p>
                          )}
                        </div>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {index + 1}/{records.length}
                        </span>
                      </div>

                      {/* Selected Genres */}
                      <div className="flex flex-wrap gap-1">
                        <AnimatePresence>
                          {genres.map((genre) => (
                            <motion.div
                              key={genre}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <Badge
                                variant="default"
                                className="gap-1 cursor-pointer hover:opacity-80"
                                onClick={() => toggleGenre(record.id, genre)}
                              >
                                {genre}
                                <X className="w-3 h-3" />
                              </Badge>
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        {/* Add Genre Button/Dropdown */}
                        {genres.length < 2 && availableGenres.length > 0 && (
                          <Select
                            onValueChange={(genre) => addGenre(record.id, genre)}
                          >
                            <SelectTrigger className="w-fit h-6 text-xs">
                              <SelectValue placeholder="Genre hinzufügen..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-48">
                              {availableGenres.map((genre) => (
                                <SelectItem key={genre} value={genre}>
                                  {genre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* More Options Indicator */}
                      {genres.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">
                          Kein Genre zugewiesen
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button
                onClick={handleApply}
                disabled={completeCount === 0}
                className="gap-2"
              >
                {completeCount > 0 ? `Übernehmen (${completeCount})` : "Übernehmen"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
