import React, { useState, useEffect } from "react";
import { Record } from "@/types/record";
import { MoodCategory } from "@/types/audiophileProfile";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BatchAssignMoodsWithReviewUIProps {
  records: Record[];
  userMoods: MoodCategory[];
  isOpen: boolean;
  onClose: () => void;
  onApply: (assignments: { recordId: string; moods: string[] }[]) => void;
}

interface MoodAssignment {
  recordId: string;
  moods: string[];
}

export function BatchAssignMoodsWithReviewUI({
  records,
  userMoods,
  isOpen,
  onClose,
  onApply,
}: BatchAssignMoodsWithReviewUIProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [assignments, setAssignments] = useState<Map<string, string[]>>(new Map());
  const [selectedMoods, setSelectedMoods] = useState<Map<string, boolean>>(new Map());

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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-assign-moods-v2`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recordIds: records.map((r) => r.id),
            userMoods: userMoods.filter((m) => m.enabled).map((m) => m.name),
            maxMoodsPerAlbum: 3,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate suggestions");

      const data = await response.json();

      // Map assignments
      const newAssignments = new Map<string, string[]>();
      if (data.assignments && Array.isArray(data.assignments)) {
        data.assignments.forEach(
          (assignment: { recordId: string; moods: string[] }) => {
            newAssignments.set(assignment.recordId, assignment.moods);
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

  const toggleMood = (recordId: string, mood: string) => {
    const current = assignments.get(recordId) || [];
    const updated = current.includes(mood)
      ? current.filter((m) => m !== mood)
      : [...current, mood];
    setAssignments(new Map(assignments.set(recordId, updated)));
  };

  const addMoodOption = (recordId: string, mood: string) => {
    const current = assignments.get(recordId) || [];
    if (!current.includes(mood) && current.length < 3) {
      setAssignments(new Map(assignments.set(recordId, [...current, mood])));
    }
  };

  const handleApply = () => {
    const finalAssignments: MoodAssignment[] = Array.from(assignments.entries()).map(
      ([recordId, moods]) => ({
        recordId,
        moods,
      })
    );

    onApply(finalAssignments);
    onClose();
  };

  const enabledMoodNames = userMoods.filter((m) => m.enabled).map((m) => m.name);
  const completeCount = Array.from(assignments.values()).filter(
    (moods) => moods.length > 0
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Stimmungen zuweisen</DialogTitle>
          <DialogDescription>
            KI-Vorschläge für {records.length} Alben
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
                  const moods = assignments.get(record.id) || [];
                  const availableMoods = enabledMoodNames.filter(
                    (m) => !moods.includes(m)
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
                        </div>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {index + 1}/{records.length}
                        </span>
                      </div>

                      {/* Selected Moods */}
                      <div className="flex flex-wrap gap-1">
                        <AnimatePresence>
                          {moods.map((mood) => (
                            <motion.div
                              key={mood}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <Badge
                                variant="default"
                                className="gap-1 cursor-pointer hover:opacity-80"
                                onClick={() => toggleMood(record.id, mood)}
                              >
                                {mood}
                                <X className="w-3 h-3" />
                              </Badge>
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        {/* Add Mood Button/Dropdown */}
                        {moods.length < 3 && availableMoods.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {availableMoods.slice(0, 3).map((mood) => (
                              <button
                                key={mood}
                                onClick={() => addMoodOption(record.id, mood)}
                                className="text-xs px-2 py-1 rounded border border-dashed border-muted-foreground/50 hover:border-primary text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                {mood}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* More Options Indicator */}
                      {moods.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">
                          Keine Stimmung zugewiesen
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
