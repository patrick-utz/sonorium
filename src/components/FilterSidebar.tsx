import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Music, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecordFormat } from "@/types/record";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoodCategory } from "@/types/audiophileProfile";

interface FilterSidebarProps {
  formatFilter: RecordFormat | "all";
  genreFilter: string;
  sortBy: string;
  sortDirection: "asc" | "desc";
  moodFilter: string;
  allGenres: string[];
  configuredMoods: MoodCategory[];
  onFormatChange: (format: RecordFormat | "all") => void;
  onGenreChange: (genre: string) => void;
  onSortChange: (sort: string) => void;
  onSortDirectionChange: () => void;
  onMoodChange: (mood: string) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export function FilterSidebar({
  formatFilter,
  genreFilter,
  sortBy,
  sortDirection,
  moodFilter,
  allGenres,
  configuredMoods,
  onFormatChange,
  onGenreChange,
  onSortChange,
  onSortDirectionChange,
  onMoodChange,
  onResetFilters,
  hasActiveFilters,
}: FilterSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Collapse/Expand Toggle - Desktop Only */}
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden md:flex flex-col items-center justify-center py-4 px-2 border-r border-border/50 bg-card/30 min-h-[200px]"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(true)}
            title="Filter anzeigen"
            className="h-10 w-10 rounded-lg hover:bg-accent/20"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </motion.div>
      )}

      {/* Collapsible Filter Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -250, width: 0 }}
            animate={{ opacity: 1, x: 0, width: "auto" }}
            exit={{ opacity: 0, x: -250, width: 0 }}
            transition={{ duration: 0.3 }}
            className="hidden md:flex flex-col gap-4 p-4 border-r border-border/50 bg-card/30 min-w-[250px] overflow-hidden"
          >
            {/* Header with Close Button */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Filter</h3>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onResetFilters}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Zurücksetzen
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  title="Filter ausblenden"
                  className="h-6 w-6 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Format Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Format
              </label>
              <Select value={formatFilter} onValueChange={onFormatChange}>
                <SelectTrigger className="w-full bg-background border-border/50">
                  <SelectValue placeholder="Alle Formate" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Alle Formate</SelectItem>
                  <SelectItem value="vinyl">Vinyl</SelectItem>
                  <SelectItem value="cd">CD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Genre Filter */}
            {allGenres.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Genre
                </label>
                <Select value={genreFilter} onValueChange={onGenreChange}>
                  <SelectTrigger className="w-full bg-background border-border/50">
                    <Music className="w-4 h-4 mr-2 flex-shrink-0" />
                    <SelectValue placeholder="Alle Genres" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover max-h-[300px]">
                    <SelectItem value="all">Alle Genres</SelectItem>
                    {allGenres.map((genre) => (
                      <SelectItem key={genre} value={genre}>
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sort */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Sortierung
              </label>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={onSortChange}>
                  <SelectTrigger className="flex-1 bg-background border-border/50">
                    <SlidersHorizontal className="w-4 h-4 mr-2 flex-shrink-0" />
                    <SelectValue placeholder="Sortieren" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="dateAdded">Zuletzt hinzugefügt</SelectItem>
                    <SelectItem value="artist">Künstler (Nachname)</SelectItem>
                    <SelectItem value="album">Album</SelectItem>
                    <SelectItem value="year">Jahr</SelectItem>
                    <SelectItem value="rating">Bewertung</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onSortDirectionChange}
                  className="border-border/50"
                  title={sortDirection === "asc" ? "Aufsteigend (A→Z)" : "Absteigend (Z→A)"}
                >
                  <SlidersHorizontal
                    className={cn(
                      "w-4 h-4",
                      sortDirection === "desc" && "rotate-180"
                    )}
                  />
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border/30" />

            {/* Mood Filter Buttons */}
            {configuredMoods.filter(m => m.enabled).length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Stimmungen
                </label>
                <div className="flex flex-col gap-2">
                  {configuredMoods
                    .filter(m => m.enabled)
                    .sort((a, b) => a.priority - b.priority)
                    .map((mood) => {
                      const isActive = moodFilter === mood.name;
                      return (
                        <Button
                          key={mood.id}
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => onMoodChange(isActive ? "all" : mood.name)}
                          className={cn(
                            "w-full justify-start gap-2 transition-all border-l-4",
                            isActive && "ring-2 ring-offset-1 ring-offset-background"
                          )}
                          style={mood.color ? {
                            borderLeftColor: `hsl(${mood.color})`,
                            ...(isActive && {
                              backgroundColor: `hsl(${mood.color} / 0.15)`,
                            })
                          } : undefined}
                        >
                          <span>{mood.icon}</span>
                          <span className="text-xs">{mood.name}</span>
                        </Button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-border/30" />

            {/* Info Text */}
            <p className="text-xs text-muted-foreground">
              Wähle Filter, um deine Sammlung zu durchsuchen
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
