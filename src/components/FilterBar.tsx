import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Music, SlidersHorizontal, ChevronDown, X, RotateCcw } from "lucide-react";
import { RecordFormat } from "@/types/record";
import { MoodCategory } from "@/types/audiophileProfile";
import { cn } from "@/lib/utils";

interface FilterBarProps {
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
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
}

export function FilterBar({
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
  isOpen = false,
  onToggleOpen,
}: FilterBarProps) {
  const enabledMoods = configuredMoods.filter(m => m.enabled).sort((a, b) => a.priority - b.priority);
  const activeMood = enabledMoods.find(m => m.name === moodFilter);

  return (
    <div className="flex flex-col gap-2">
      {/* Main Filter Row - On one line */}
      <div className="flex gap-2 items-center flex-wrap">
        {/* Format Dropdown */}
        <Select value={formatFilter} onValueChange={onFormatChange}>
          <SelectTrigger className="w-32 bg-background border-border/50 h-9">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Alle Formate</SelectItem>
            <SelectItem value="vinyl">Vinyl</SelectItem>
            <SelectItem value="cd">CD</SelectItem>
          </SelectContent>
        </Select>

        {/* Genre Dropdown */}
        {allGenres.length > 0 && (
          <Select value={genreFilter} onValueChange={onGenreChange}>
            <SelectTrigger className="w-40 bg-background border-border/50 h-9">
              <Music className="w-4 h-4 mr-2 flex-shrink-0" />
              <SelectValue placeholder="Genre" />
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
        )}

        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-40 bg-background border-border/50 h-9">
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

        {/* Sort Direction Toggle Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onSortDirectionChange}
          className="border-border/50 h-9 w-9 p-0"
          title={sortDirection === "asc" ? "Aufsteigend (A→Z)" : "Absteigend (Z→A)"}
        >
          <SlidersHorizontal
            className={cn(
              "w-4 h-4",
              sortDirection === "desc" && "rotate-180"
            )}
          />
        </Button>

        {/* Moods Dropdown */}
        {enabledMoods.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "border-border/50 h-9",
                  moodFilter !== "all" && "bg-primary/10 border-primary/50"
                )}
              >
                {activeMood ? (
                  <>
                    <span>{activeMood.icon}</span>
                    <span className="text-xs ml-1">{activeMood.name}</span>
                  </>
                ) : (
                  <>
                    <span>🎵</span>
                    <span className="text-xs ml-1">Stimmung</span>
                  </>
                )}
                <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem
                onClick={() => onMoodChange("all")}
                className="cursor-pointer"
              >
                <span>Alle Stimmungen</span>
              </DropdownMenuItem>
              {enabledMoods.map((mood) => (
                <DropdownMenuItem
                  key={mood.id}
                  onClick={() => onMoodChange(mood.name)}
                  className="flex items-center gap-2 cursor-pointer"
                  style={mood.color ? {
                    backgroundColor: moodFilter === mood.name ? `hsl(${mood.color} / 0.15)` : "transparent"
                  } : undefined}
                >
                  <span>{mood.icon}</span>
                  <span>{mood.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Reset Filters Button - Only shown when filters are active */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-9 px-2 text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Zurücksetzen
          </Button>
        )}
      </div>

      {/* Info Text */}
      <p className="text-xs text-muted-foreground px-1">
        Wähle Filter, um deine Sammlung zu durchsuchen
      </p>
    </div>
  );
}
