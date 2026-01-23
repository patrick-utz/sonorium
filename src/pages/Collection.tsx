import { useState, useRef, useEffect } from "react";
import { compressImage } from "@/lib/imageUtils";
import { useRecords } from "@/context/RecordContext";
import { RecordCard } from "@/components/RecordCard";
import { StarRating } from "@/components/StarRating";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Grid3X3, List, SlidersHorizontal, Music, Tag, Sparkles, Heart, Loader2, CheckSquare, Square, ArrowUpDown, X, RotateCcw, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Record, RecordFormat } from "@/types/record";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useAudiophileProfile } from "@/context/AudiophileProfileContext";
import { MoodCategory } from "@/types/audiophileProfile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SortOption = "artist" | "album" | "year" | "dateAdded" | "rating";
type SortDirection = "asc" | "desc";
type ViewMode = "grid" | "list";

// Helper to extract last name from artist name
const getLastName = (artist: string): string => {
  // Handle special cases like "The Beatles", "Van Morrison"
  const prefixes = ["the", "van", "von", "de", "du", "la", "le"];
  const parts = artist.trim().split(/\s+/);
  
  if (parts.length === 1) return artist;
  
  // Check if last part is a common suffix (Jr., Sr., III, etc.)
  const suffixes = ["jr.", "sr.", "ii", "iii", "iv"];
  let lastName = parts[parts.length - 1];
  
  if (suffixes.includes(lastName.toLowerCase()) && parts.length > 2) {
    lastName = parts[parts.length - 2];
  }
  
  return lastName;
};

// Get decade from year
const getDecade = (year: number): string => {
  const decade = Math.floor(year / 10) * 10;
  return `${decade}er`;
};

export default function Collection() {
  const { getOwnedRecords, updateRecord, deleteRecord, toggleFavorite } = useRecords();
  const { profile } = useAudiophileProfile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const records = getOwnedRecords();
  const configuredMoods = profile?.moods || [];
  
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<RecordFormat | "all">("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [moodFilter, setMoodFilter] = useState<string>("all");
  const [decadeFilter, setDecadeFilter] = useState<string>("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("dateAdded");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  
  // Batch selection state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [isBatchEnriching, setIsBatchEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 });

  // Check if any filter is active
  const hasActiveFilters = formatFilter !== "all" || genreFilter !== "all" || tagFilter !== "all" || moodFilter !== "all" || decadeFilter !== "all" || showFavoritesOnly || searchQuery !== "";

  // Reset all filters
  const resetAllFilters = () => {
    setSearchQuery("");
    setFormatFilter("all");
    setGenreFilter("all");
    setTagFilter("all");
    setMoodFilter("all");
    setDecadeFilter("all");
    setShowFavoritesOnly(false);
    // Clear URL params
    setSearchParams({});
  };

  // Get available decades from records
  const allDecades = Array.from(
    new Set(records.map((record) => getDecade(record.year)))
  ).sort((a, b) => parseInt(b) - parseInt(a)); // Newest first

  // Read filters from URL params on mount
  useEffect(() => {
    const genreParam = searchParams.get("genre");
    const tagParam = searchParams.get("tag");
    const moodParam = searchParams.get("mood");
    const favoriteParam = searchParams.get("favorites");
    if (genreParam) {
      setGenreFilter(genreParam);
    }
    if (tagParam) {
      setTagFilter(tagParam);
    }
    if (moodParam) {
      setMoodFilter(moodParam);
    }
    if (favoriteParam === "true") {
      setShowFavoritesOnly(true);
    }
  }, [searchParams]);

  // Clear URL params when filters change manually
  const handleGenreChange = (value: string) => {
    setGenreFilter(value);
    if (searchParams.has("genre")) {
      searchParams.delete("genre");
      setSearchParams(searchParams);
    }
  };

  const handleTagChange = (value: string) => {
    setTagFilter(value);
    if (searchParams.has("tag")) {
      searchParams.delete("tag");
      setSearchParams(searchParams);
    }
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === "asc" ? "desc" : "asc");
  };
  // Toggle selection for a record
  const toggleRecordSelection = (recordId: string) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  // Select/deselect all filtered records
  const toggleSelectAll = () => {
    if (selectedRecords.size === filteredRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredRecords.map(r => r.id)));
    }
  };

  // Exit selection mode
  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedRecords(new Set());
  };

  // Batch AI enrichment
  const handleBatchEnrich = async () => {
    if (selectedRecords.size === 0) {
      toast.error("Bitte wähle mindestens ein Album aus");
      return;
    }

    const recordsToEnrich = records.filter(r => selectedRecords.has(r.id));
    setIsBatchEnriching(true);
    setEnrichProgress({ current: 0, total: recordsToEnrich.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < recordsToEnrich.length; i++) {
      const record = recordsToEnrich[i];
      setEnrichProgress({ current: i + 1, total: recordsToEnrich.length });

      try {
        const response = await supabase.functions.invoke('complete-record', {
          body: {
            artist: record.artist,
            album: record.album,
            year: record.year,
            format: record.format,
            label: record.label,
            catalogNumber: record.catalogNumber,
          }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const aiData = response.data?.data;
        if (aiData) {
          updateRecord(record.id, {
            audiophileAssessment: aiData.audiophileAssessment || record.audiophileAssessment,
            artisticAssessment: aiData.artisticAssessment || record.artisticAssessment,
            recordingQuality: aiData.recordingQuality || record.recordingQuality,
            masteringQuality: aiData.masteringQuality || record.masteringQuality,
            artisticRating: aiData.artisticRating || record.artisticRating,
            criticScore: aiData.criticScore || record.criticScore,
            criticReviews: aiData.criticReviews || record.criticReviews,
            vinylRecommendation: aiData.vinylRecommendation || record.vinylRecommendation,
            recommendationReason: aiData.recommendationReason || record.recommendationReason,
            recommendations: aiData.recommendations || record.recommendations,
            tags: aiData.tags?.length ? aiData.tags : record.tags,
            personalNotes: aiData.personalNotes || record.personalNotes,
          });
          successCount++;
        }
      } catch (error) {
        console.error(`AI enrichment error for ${record.album}:`, error);
        errorCount++;
      }
    }

    setIsBatchEnriching(false);
    setEnrichProgress({ current: 0, total: 0 });
    exitSelectMode();

    if (successCount > 0 && errorCount === 0) {
      toast.success(`${successCount} Alben erfolgreich mit KI angereichert`);
    } else if (successCount > 0 && errorCount > 0) {
      toast.warning(`${successCount} Alben angereichert, ${errorCount} fehlgeschlagen`);
    } else {
      toast.error("KI-Anreicherung fehlgeschlagen");
    }
  };

  const handleMoodChange = (value: string) => {
    setMoodFilter(value);
    if (searchParams.has("mood")) {
      searchParams.delete("mood");
      setSearchParams(searchParams);
    }
  };

  const handleReloadCover = async (record: { id: string; artist: string; album: string; year: number; format: string; label?: string; catalogNumber?: string }) => {
    try {
      const response = await supabase.functions.invoke('complete-record', {
        body: {
          artist: record.artist,
          album: record.album,
          year: record.year,
          format: record.format,
          label: record.label,
          catalogNumber: record.catalogNumber,
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data?.data || response.data;
      const coverArt = data?.coverArtBase64 || data?.coverArt;

      if (coverArt) {
        updateRecord(record.id, { coverArt });
        toast.success("Cover erfolgreich geladen");
      } else {
        toast.error("Kein Cover gefunden");
      }
    } catch (error) {
      console.error("Cover reload error:", error);
      toast.error("Fehler beim Laden des Covers");
    }
  };

  // Extract all unique genres from records
  const allGenres = Array.from(
    new Set(records.flatMap((record) => record.genre))
  ).sort();

  // Extract all unique tags from records
  const allTags = Array.from(
    new Set(records.flatMap((record) => record.tags || []))
  ).sort();

  // Extract all unique moods from records
  const allMoods = Array.from(
    new Set(records.flatMap((record) => record.moods || []))
  ).sort();

  // Filter and sort records
  const filteredRecords = records
    .filter((record) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        record.artist.toLowerCase().includes(query) ||
        record.album.toLowerCase().includes(query) ||
        record.genre.some((g) => g.toLowerCase().includes(query)) ||
        record.tags?.some((t) => t.toLowerCase().includes(query));
      const matchesFormat = formatFilter === "all" || record.format === formatFilter;
      const matchesGenre = genreFilter === "all" || record.genre.includes(genreFilter);
      const matchesTag = tagFilter === "all" || record.tags?.includes(tagFilter);
      const matchesMood = moodFilter === "all" || record.moods?.includes(moodFilter);
      const matchesDecade = decadeFilter === "all" || getDecade(record.year) === decadeFilter;
      const matchesFavorite = !showFavoritesOnly || record.isFavorite;
      return matchesSearch && matchesFormat && matchesGenre && matchesTag && matchesMood && matchesDecade && matchesFavorite;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "artist":
          // Sort by last name
          comparison = getLastName(a.artist).localeCompare(getLastName(b.artist));
          break;
        case "album":
          comparison = a.album.localeCompare(b.album);
          break;
        case "year":
          comparison = a.year - b.year;
          break;
        case "rating":
          comparison = a.myRating - b.myRating;
          break;
        case "dateAdded":
        default:
          comparison = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Sticky Header with shadow */}
      <div className="sticky top-0 z-30 bg-background pb-3 md:pb-4 space-y-2 md:space-y-4 shadow-[0_4px_12px_-4px_hsl(var(--foreground)/0.1)] border-b border-border/30">
        <div className="pt-2 md:pt-0">
          <h1 className="text-2xl md:text-4xl font-bold gradient-text">
            Deine Sammlung
          </h1>
          <p className="text-muted-foreground text-sm md:text-base mt-0.5 md:mt-1">
            {records.length} Tonträger
          </p>
        </div>

        {/* Filters - Row 1: Search + Actions */}
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Suchen nach Künstler, Album, Genre, Stichwort..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-border/50"
            />
          </div>

          <div className="flex gap-1.5 md:gap-2 flex-wrap">
            {/* Batch Selection Mode */}
            {!isSelectMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSelectMode(true)}
                className="gap-2"
              >
                <CheckSquare className="w-4 h-4" />
                Auswählen
              </Button>
            ) : (
              <div className="flex gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="gap-2"
                >
                  {selectedRecords.size === filteredRecords.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {selectedRecords.size === filteredRecords.length ? "Keine" : "Alle"}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleBatchEnrich}
                  disabled={selectedRecords.size === 0 || isBatchEnriching}
                  className="gap-2"
                >
                  {isBatchEnriching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {enrichProgress.current}/{enrichProgress.total}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      KI ({selectedRecords.size})
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exitSelectMode}
                >
                  Abbrechen
                </Button>
              </div>
            )}

            {/* Favorites Toggle */}
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={cn(
                "gap-2",
                showFavoritesOnly && "bg-red-500 hover:bg-red-600 text-white"
              )}
            >
              <Heart className={cn("w-4 h-4", showFavoritesOnly && "fill-current")} />
              Favoriten
            </Button>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex border border-border/50 rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-none",
                  viewMode === "grid" && "bg-primary text-primary-foreground"
                )}
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-none",
                  viewMode === "list" && "bg-primary text-primary-foreground"
                )}
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters - Row 2: Filter Dropdowns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5 md:gap-3">
          <Select
            value={formatFilter}
            onValueChange={(v) => setFormatFilter(v as RecordFormat | "all")}
          >
            <SelectTrigger className="w-full bg-card border-border/50">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Alle Formate</SelectItem>
              <SelectItem value="vinyl">Vinyl</SelectItem>
              <SelectItem value="cd">CD</SelectItem>
            </SelectContent>
          </Select>

          {allGenres.length > 0 && (
            <Select
              value={genreFilter}
              onValueChange={handleGenreChange}
            >
              <SelectTrigger className="w-full bg-card border-border/50">
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

          {allTags.length > 0 && (
            <Select
              value={tagFilter}
              onValueChange={handleTagChange}
            >
              <SelectTrigger className="w-full bg-card border-border/50">
                <Tag className="w-4 h-4 mr-2 flex-shrink-0" />
                <SelectValue placeholder="Stichwort" />
              </SelectTrigger>
              <SelectContent className="bg-popover max-h-[300px]">
                <SelectItem value="all">Alle Stichworte</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Decade Filter */}
          {allDecades.length > 0 && (
            <Select
              value={decadeFilter}
              onValueChange={(v) => setDecadeFilter(v)}
            >
              <SelectTrigger className="w-full bg-card border-border/50">
                <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                <SelectValue placeholder="Dekade" />
              </SelectTrigger>
              <SelectContent className="bg-popover max-h-[300px]">
                <SelectItem value="all">Alle Dekaden</SelectItem>
                {allDecades.map((decade) => (
                  <SelectItem key={decade} value={decade}>
                    {decade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Sort with direction */}
          <div className="flex col-span-2 sm:col-span-1">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="flex-1 bg-card border-border/50 rounded-r-none border-r-0">
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
              onClick={toggleSortDirection}
              className="rounded-l-none border-border/50"
              title={sortDirection === "asc" ? "Aufsteigend (A→Z)" : "Absteigend (Z→A)"}
            >
              <ArrowUpDown className={cn("w-4 h-4", sortDirection === "desc" && "rotate-180")} />
            </Button>
          </div>
        </div>

        {/* Mood Filter Buttons - Row 3 */}
        {configuredMoods.filter(m => m.enabled).length > 0 && (
          <div className="flex flex-wrap gap-2">
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
                    onClick={() => handleMoodChange(isActive ? "all" : mood.name)}
                    className={cn(
                      "border transition-all hover:scale-105",
                      isActive && "ring-2 ring-offset-1 ring-offset-background"
                    )}
                    style={mood.color ? {
                      borderColor: `hsl(${mood.color})`,
                      borderLeftWidth: '3px',
                      ...(isActive && { 
                        backgroundColor: `hsl(${mood.color} / 0.15)`,
                        ringColor: `hsl(${mood.color})`
                      })
                    } : undefined}
                  >
                    <span className="mr-1.5">{mood.icon}</span>
                    <span>{mood.name}</span>
                  </Button>
                );
              })}
          </div>
        )}

        {/* Active Filters as Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">Filter:</span>
            
            {searchQuery && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Suche: "{searchQuery}"
                <button onClick={() => setSearchQuery("")} className="ml-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            
            {showFavoritesOnly && (
              <Badge variant="secondary" className="gap-1 pr-1">
                <Heart className="w-3 h-3 fill-current" />
                Favoriten
                <button onClick={() => setShowFavoritesOnly(false)} className="ml-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            
            {formatFilter !== "all" && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Format: {formatFilter}
                <button onClick={() => setFormatFilter("all")} className="ml-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            
            {genreFilter !== "all" && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Genre: {genreFilter}
                <button onClick={() => handleGenreChange("all")} className="ml-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            
            {tagFilter !== "all" && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Tag: {tagFilter}
                <button onClick={() => handleTagChange("all")} className="ml-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            
            {moodFilter !== "all" && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Stimmung: {moodFilter}
                <button onClick={() => handleMoodChange("all")} className="ml-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            
            {decadeFilter !== "all" && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Dekade: {decadeFilter}
                <button onClick={() => setDecadeFilter("all")} className="ml-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAllFilters}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3 h-3" />
              Alle zurücksetzen
            </Button>
          </div>
        )}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pt-4">
        <AnimatePresence mode="wait">
        {filteredRecords.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 mx-auto mb-4 vinyl-disc" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Keine Tonträger gefunden
            </h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Versuche einen anderen Suchbegriff"
                : "Füge deinen ersten Tonträger hinzu!"}
            </p>
          </motion.div>
        ) : viewMode === "grid" ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {filteredRecords.map((record) => (
              <div key={record.id} className="relative">
                {isSelectMode && (
                  <div 
                    className="absolute top-2 left-2 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRecordSelection(record.id);
                    }}
                  >
                    <Checkbox
                      checked={selectedRecords.has(record.id)}
                      className="h-5 w-5 bg-background/80 border-2"
                    />
                  </div>
                )}
                <RecordCard
                  record={record}
                  onClick={() => isSelectMode ? toggleRecordSelection(record.id) : navigate(`/sammlung/${record.id}`)}
                  onReloadCover={() => handleReloadCover(record)}
                  onDelete={() => deleteRecord(record.id)}
                  onToggleFavorite={() => toggleFavorite(record.id)}
                  onRatingChange={(rating) => updateRecord(record.id, { myRating: rating })}
                  className={cn(
                    isSelectMode && selectedRecords.has(record.id) && "ring-2 ring-primary"
                  )}
                />
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {filteredRecords.map((record) => (
              <ListItem
                key={record.id}
                record={record}
                configuredMoods={configuredMoods}
                onClick={() => isSelectMode ? toggleRecordSelection(record.id) : navigate(`/sammlung/${record.id}`)}
                isSelectMode={isSelectMode}
                isSelected={selectedRecords.has(record.id)}
                onToggleSelect={() => toggleRecordSelection(record.id)}
                onToggleFavorite={() => toggleFavorite(record.id)}
                onRatingChange={(rating) => updateRecord(record.id, { myRating: rating })}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

interface ListItemProps {
  record: Record;
  configuredMoods: MoodCategory[];
  onClick: () => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onToggleFavorite?: () => void;
  onRatingChange?: (rating: number) => void;
}

function ListItem({ record, configuredMoods, onClick, isSelectMode, isSelected, onToggleSelect, onToggleFavorite, onRatingChange }: ListItemProps) {
  // Get configured moods that match this record's moods (with colors)
  const recordMoodsWithColors = (record.moods || [])
    .map(moodName => {
      const configured = configuredMoods.find(m => m.name === moodName && m.enabled);
      return configured ? { name: moodName, color: configured.color, icon: configured.icon } : null;
    })
    .filter(Boolean)
    .slice(0, 3); // Show max 3 mood indicators

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-4 p-3 rounded-lg bg-card border border-border/50 cursor-pointer hover:shadow-card transition-all",
        isSelectMode && isSelected && "ring-2 ring-primary"
      )}
    >
      {isSelectMode && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
        >
          <Checkbox
            checked={isSelected}
            className="h-5 w-5"
          />
        </div>
      )}
      <div className="relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0">
        {record.coverArt ? (
          <img
            src={record.coverArt}
            alt={record.album}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-vinyl flex items-center justify-center">
            <div className="w-8 h-8 vinyl-disc" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground truncate">{record.album}</h3>
          {/* Mood color indicators */}
          {recordMoodsWithColors.length > 0 && (
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center gap-1 flex-shrink-0">
                {recordMoodsWithColors.map((mood, idx) => (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <div
                        className="w-2 h-2 rounded-full cursor-default"
                        style={{ backgroundColor: mood?.color ? `hsl(${mood.color})` : 'hsl(var(--muted-foreground))' }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="flex items-center gap-1.5">
                      <span>{mood?.icon}</span>
                      <span>{mood?.name}</span>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{record.artist}</p>
      </div>
      
      {/* Interactive Star Rating */}
      <div onClick={(e) => e.stopPropagation()} className="hidden sm:block">
        <StarRating 
          rating={record.myRating} 
          size="sm" 
          interactive={!!onRatingChange}
          onChange={onRatingChange}
        />
      </div>
      
      {/* Favorite Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite?.();
        }}
        className="p-1.5 rounded-full hover:bg-muted transition-colors"
        title={record.isFavorite ? "Von Favoriten entfernen" : "Zu Favoriten hinzufügen"}
      >
        <Heart className={cn(
          "w-4 h-4 transition-colors",
          record.isFavorite ? "heart-favorite fill-current" : "text-muted-foreground hover:text-foreground"
        )} />
      </button>
      
      <div className="text-sm text-muted-foreground hidden md:block">{record.year}</div>
      <div className="text-sm text-muted-foreground hidden lg:block capitalize">
        {record.format}
      </div>
    </motion.div>
  );
}