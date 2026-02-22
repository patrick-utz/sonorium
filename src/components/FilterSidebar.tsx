import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Music, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecordFormat } from "@/types/record";

interface FilterSidebarProps {
  formatFilter: RecordFormat | "all";
  genreFilter: string;
  sortBy: string;
  sortDirection: "asc" | "desc";
  allGenres: string[];
  onFormatChange: (format: RecordFormat | "all") => void;
  onGenreChange: (genre: string) => void;
  onSortChange: (sort: string) => void;
  onSortDirectionChange: () => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export function FilterSidebar({
  formatFilter,
  genreFilter,
  sortBy,
  sortDirection,
  allGenres,
  onFormatChange,
  onGenreChange,
  onSortChange,
  onSortDirectionChange,
  onResetFilters,
  hasActiveFilters,
}: FilterSidebarProps) {
  return (
    <div className="hidden md:flex flex-col gap-4 p-4 border-r border-border/50 bg-card/30">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Filter</h3>
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

      {/* Info Text */}
      <p className="text-xs text-muted-foreground">
        Wähle Filter, um deine Sammlung zu durchsuchen
      </p>
    </div>
  );
}
