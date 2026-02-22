import { useState, useEffect } from "react";
import { useRecords } from "@/context/RecordContext";
import { RecordCard } from "@/components/RecordCard";
import { RecordGridSkeleton } from "@/components/RecordCardSkeleton";
import { StarRating } from "@/components/StarRating";
import { EditDropdown } from "@/components/EditDropdown";
import { FilterBar } from "@/components/FilterBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Heart, ShoppingCart, Music, Tag, Sparkles, SlidersHorizontal, Grid3X3, List, CheckSquare, Loader2, ChevronLeft, ChevronRight, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { RecordFormat } from "@/types/record";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAudiophileProfile } from "@/context/AudiophileProfileContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SortOption = "artist" | "album" | "year" | "dateAdded" | "rating";
type ViewMode = "grid" | "list";

export default function Wishlist() {
  const { getWishlistRecords, updateRecord, deleteRecord, toggleFavorite, toggleOrdered } = useRecords();
  const { profile } = useAudiophileProfile();
  const navigate = useNavigate();
  const records = getWishlistRecords();
  const configuredMoods = profile?.moods || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<RecordFormat | "all">("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [moodFilter, setMoodFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("dateAdded");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [isBatchEnriching, setIsBatchEnriching] = useState(false);

  // Pagination state for infinite scroll
  const ITEMS_PER_PAGE = 48;
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Filter bar collapsed/expanded state
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

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

  // Initialize loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 300); // 300ms loading state for perceived performance
    return () => clearTimeout(timer);
  }, []);

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
      const matchesFavorite = !showFavoritesOnly || record.isFavorite;
      return matchesSearch && matchesFormat && matchesGenre && matchesTag && matchesMood && matchesFavorite;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "artist":
          return a.artist.localeCompare(b.artist);
        case "album":
          return a.album.localeCompare(b.album);
        case "year":
          return b.year - a.year;
        case "rating":
          return b.myRating - a.myRating;
        case "dateAdded":
        default:
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      }
    });

  // Pagination: Only show the first displayCount items
  const displayedRecords = filteredRecords.slice(0, displayCount);
  const hasMoreRecords = filteredRecords.length > displayCount;

  // Handle infinite scroll trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRecords && !isLoadingMore) {
          setIsLoadingMore(true);
          // Simulate small delay for UX feedback
          setTimeout(() => {
            setDisplayCount((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredRecords.length));
            setIsLoadingMore(false);
          }, 300);
        }
      },
      { rootMargin: "500px 0px 500px 0px" }
    );

    // Find the sentinel element and observe it
    const sentinel = document.querySelector("[data-infinite-scroll-sentinel]");
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [hasMoreRecords, filteredRecords.length, isLoadingMore, displayCount]);

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [searchQuery, formatFilter, genreFilter, tagFilter, moodFilter, showFavoritesOnly, sortBy]);

  const handleMarkAsOwned = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateRecord(id, { status: "owned" });
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecords(newSelected);
  };

  const handleBatchEnrich = async () => {
    if (selectedRecords.size === 0) return;

    setIsBatchEnriching(true);
    const selectedIds = Array.from(selectedRecords);
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      const record = records.find((r) => r.id === id);
      if (!record) continue;

      try {
        const response = await supabase.functions.invoke("complete-record", {
          body: {
            artist: record.artist,
            album: record.album,
            year: record.year,
            format: record.format,
            label: record.label,
            catalogNumber: record.catalogNumber,
          },
        });

        if (response.error) {
          errorCount++;
          continue;
        }

        const data = response.data?.data || response.data;
        if (data) {
          updateRecord(id, {
            coverArt: data.coverArtBase64 || data.coverArt || record.coverArt,
            genre: data.genres?.length > 0 ? data.genres : record.genre,
            tags: data.tags?.length > 0 ? data.tags : record.tags,
            moods: data.moods?.length > 0 ? data.moods : record.moods,
            label: data.label || record.label,
            catalogNumber: data.catalogNumber || record.catalogNumber,
          });
          successCount++;
        }
      } catch (error) {
        console.error("Batch enrich error for record:", id, error);
        errorCount++;
      }
    }

    setIsBatchEnriching(false);
    setSelectedRecords(new Set());
    setIsSelectMode(false);

    if (successCount > 0) {
      toast.success(`${successCount} Einträge erfolgreich angereichert`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} Einträge konnten nicht angereichert werden`);
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

  const handleBatchAssignMoodsAI = async () => {
    if (selectedRecords.size === 0) {
      toast.error("Keine Alben ausgewählt");
      return;
    }

    const recordIds = Array.from(selectedRecords);

    try {
      setIsBatchEnriching(true);
      toast.loading(`Verarbeite ${recordIds.length} Alben...`);

      const response = await supabase.functions.invoke('bulk-assign-moods-v2', {
        body: {
          recordIds,
          userMoods: configuredMoods.filter(m => m.enabled).map(m => m.name),
          maxMoodsPerAlbum: 3,
        },
      });

      const data = response.data;

      // Directly apply all assignments without review
      for (const assignment of data.assignments) {
        await updateRecord(assignment.recordId, { moods: assignment.moods });
      }

      setIsSelectMode(false);
      setSelectedRecords(new Set());
      toast.success(`${data.assignments.length} Alben mit Stimmungen aktualisiert`);
    } catch (error) {
      toast.error("Fehler beim Zuweisen von Stimmungen");
      console.error(error);
    } finally {
      setIsBatchEnriching(false);
    }
  };

  const handleBatchAssignGenresAI = async () => {
    if (selectedRecords.size === 0) {
      toast.error("Keine Alben ausgewählt");
      return;
    }

    const recordIds = Array.from(selectedRecords);

    try {
      setIsBatchEnriching(true);
      toast.loading(`Verarbeite ${recordIds.length} Alben...`);

      const response = await supabase.functions.invoke('bulk-assign-genres', {
        body: {
          recordIds,
        },
      });

      const data = response.data;

      // Directly apply all assignments without review
      for (const assignment of data.assignments) {
        await updateRecord(assignment.recordId, { genre: assignment.genres });
      }

      setIsSelectMode(false);
      setSelectedRecords(new Set());
      toast.success(`${data.assignments.length} Alben mit Genres aktualisiert`);
    } catch (error) {
      toast.error("Fehler beim Standardisieren von Genres");
      console.error(error);
    } finally {
      setIsBatchEnriching(false);
    }
  };

  const handleBatchDeleteTags = async () => {
    if (selectedRecords.size === 0) {
      toast.error("Keine Alben ausgewählt");
      return;
    }

    const recordIds = Array.from(selectedRecords);

    try {
      setIsBatchEnriching(true);
      for (const id of recordIds) {
        await updateRecord(id, { tags: [] });
      }
      setIsSelectMode(false);
      setSelectedRecords(new Set());
      toast.success(`Tags bei ${recordIds.length} Alben gelöscht`);
    } catch (error) {
      toast.error("Fehler beim Löschen von Tags");
      console.error(error);
    } finally {
      setIsBatchEnriching(false);
    }
  };

  const handleBatchFixFavorites = async () => {
    if (selectedRecords.size === 0) {
      toast.error("Keine Alben ausgewählt");
      return;
    }

    const recordIds = Array.from(selectedRecords);

    try {
      setIsBatchEnriching(true);
      for (const id of recordIds) {
        const record = records.find((r) => r.id === id);
        if (record) {
          await updateRecord(id, { isFavorite: !record.isFavorite });
        }
      }
      setIsSelectMode(false);
      setSelectedRecords(new Set());
      toast.success(`Favoriten bei ${recordIds.length} Alben aktualisiert`);
    } catch (error) {
      toast.error("Fehler beim Aktualisieren von Favoriten");
      console.error(error);
    } finally {
      setIsBatchEnriching(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)]">
      {/* Main Content Area - Full Width */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sticky Header with shadow */}
        <div className="sticky top-0 z-30 bg-background pb-3 md:pb-4 space-y-2 md:space-y-4 shadow-[0_4px_12px_-4px_hsl(var(--foreground)/0.1)] border-b border-border/30">
        <div className="pt-2 md:pt-0">
          <h1 className="text-2xl md:text-4xl font-bold gradient-text flex items-center gap-2 md:gap-3">
            <Heart className="w-6 h-6 md:w-8 md:h-8 text-accent fill-accent" />
            Wunschliste
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

          <div className="flex gap-1.5 md:gap-2 flex-wrap items-center">
            {/* Batch Enrich Button - Only show when selecting */}
            {isSelectMode && selectedRecords.size > 0 && (
              <div className="hidden sm:flex gap-2 items-center">
                <Button
                  size="sm"
                  onClick={handleBatchEnrich}
                  disabled={isBatchEnriching}
                  className="gap-2"
                >
                  {isBatchEnriching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  KI-Anreicherung ({selectedRecords.size})
                </Button>
              </div>
            )}

            {/* Favoriten Filter */}
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className="gap-2"
            >
              <Heart className={cn("w-4 h-4", showFavoritesOnly && "fill-current")} />
              Favoriten
            </Button>

            {/* View Mode Toggle - Desktop Only */}
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

            {/* Filter Toggle Button - Show/Hide FilterBar */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
              title="Filter anzeigen/verstecken"
              className="gap-2 hidden sm:flex"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filter {isFilterBarOpen ? "−" : "+"}
            </Button>

            {/* Bearbeiten Dropdown - Hidden on mobile */}
            <div className="hidden sm:block">
              <EditDropdown
                isSelectMode={isSelectMode}
                onSelectModeChange={(enabled) => {
                  if (!enabled) {
                    setSelectedRecords(new Set());
                  }
                  setIsSelectMode(enabled);
                }}
                onVerifyCovers={() => {}}
                onAssignMoods={handleBatchAssignMoodsAI}
                onStandardizeGenres={handleBatchAssignGenresAI}
                onDeleteTags={handleBatchDeleteTags}
                onFixFavorites={handleBatchFixFavorites}
              />
            </div>
          </div>
        </div>

        {/* FilterBar - Expandable horizontal filter controls */}
        {isFilterBarOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-3 py-2 bg-card/50 border-t border-border/30"
          >
            <FilterBar
              formatFilter={formatFilter}
              genreFilter={genreFilter}
              sortBy={sortBy}
              sortDirection="asc"
              moodFilter={moodFilter}
              allGenres={allGenres}
              configuredMoods={configuredMoods}
              onFormatChange={setFormatFilter}
              onGenreChange={setGenreFilter}
              onSortChange={setSortBy}
              onSortDirectionChange={() => {}}
              onMoodChange={(mood) => setMoodFilter(mood === "all" ? "all" : mood)}
              onResetFilters={() => {
                setSearchQuery("");
                setFormatFilter("all");
                setGenreFilter("all");
                setTagFilter("all");
                setMoodFilter("all");
                setShowFavoritesOnly(false);
              }}
              hasActiveFilters={formatFilter !== "all" || genreFilter !== "all" || tagFilter !== "all" || moodFilter !== "all" || showFavoritesOnly || searchQuery !== ""}
            />
          </motion.div>
        )}

        {/* Mood Filter Buttons - Mobile only (sidebar shows them on desktop) */}
        {configuredMoods.filter(m => m.enabled).length > 0 && (
          <div className="flex md:hidden flex-wrap gap-2">
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
                    onClick={() => setMoodFilter(isActive ? "all" : mood.name)}
                    className={cn(
                      "border transition-all hover:scale-105",
                      isActive && "ring-2 ring-offset-1 ring-offset-background"
                    )}
                    style={mood.color ? {
                      borderColor: `hsl(${mood.color})`,
                      borderLeftWidth: '3px',
                      ...(isActive && {
                        backgroundColor: `hsl(${mood.color} / 0.15)`,
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
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {searchQuery ? "Keine Treffer" : "Deine Wunschliste ist leer"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? "Versuche einen anderen Suchbegriff"
                : "Füge Tonträger zu deiner Wunschliste hinzu, die du dir wünschst!"}
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate("/hinzufuegen")} className="gap-2">
                Tonträger hinzufügen
              </Button>
            )}
          </motion.div>
        ) : viewMode === "grid" ? (
          <>
            {isInitialLoading ? (
              <RecordGridSkeleton count={ITEMS_PER_PAGE} />
            ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3"
            >
              {displayedRecords.map((record, index) => (
              <div
                key={record.id}
                className="relative group"
                data-last-record-card-wishlist={index === displayedRecords.length - 1 ? "true" : undefined}
              >
                {isSelectMode && (
                  <div
                    className="absolute top-2 left-2 z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(record.id);
                    }}
                  >
                    <Checkbox
                      checked={selectedRecords.has(record.id)}
                      onCheckedChange={() => handleToggleSelect(record.id)}
                      className="bg-background/80 border-primary"
                    />
                  </div>
                )}
                <RecordCard
                  record={record}
                  onClick={() => isSelectMode ? handleToggleSelect(record.id) : navigate(`/sammlung/${record.id}`)}
                  onDelete={() => deleteRecord(record.id)}
                  onToggleFavorite={() => toggleFavorite(record.id)}
                  onToggleOrdered={() => toggleOrdered(record.id)}
                  onReloadCover={() => handleReloadCover(record)}
                  onRatingChange={(rating) => updateRecord(record.id, { myRating: rating })}
                />
                <Button
                  size="sm"
                  onClick={(e) => handleMarkAsOwned(record.id, e)}
                  className="absolute bottom-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity gap-1 bg-primary text-primary-foreground shadow-lg"
                >
                  <ShoppingCart className="w-3 h-3" />
                  Gekauft!
                </Button>
              </div>
              ))}
            </motion.div>
            )}
            {/* Infinite scroll sentinel - stable target for observer */}
            {hasMoreRecords && <div data-infinite-scroll-sentinel className="h-px" />}
            {/* Infinite scroll loading indicator */}
            {hasMoreRecords && isLoadingMore && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-8 gap-3"
              >
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {displayCount}/{filteredRecords.length} Tonträger geladen...
                </p>
              </motion.div>
            )}
          </>

        ) : (
          <>
            {isInitialLoading ? (
              <RecordGridSkeleton count={6} />
            ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {displayedRecords.map((record) => (
                <div
                  key={record.id}
                  onClick={() => isSelectMode ? handleToggleSelect(record.id) : navigate(`/sammlung/${record.id}`)}
                  className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/50 cursor-pointer hover:bg-card/80 transition-colors group"
                >
                {isSelectMode && (
                  <Checkbox
                    checked={selectedRecords.has(record.id)}
                    onCheckedChange={() => handleToggleSelect(record.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0"
                  />
                )}
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                  {record.coverArt ? (
                    <img
                      src={record.coverArt}
                      alt={record.album}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Heart className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">{record.album}</h3>
                    {/* Mood color indicators */}
                    {(() => {
                      const recordMoodsWithColors = (record.moods || [])
                        .map(moodName => {
                          const configured = configuredMoods.find(m => m.name === moodName && m.enabled);
                          return configured ? { name: moodName, color: configured.color, icon: configured.icon } : null;
                        })
                        .filter(Boolean)
                        .slice(0, 3);
                      return recordMoodsWithColors.length > 0 && (
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
                      );
                    })()}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{record.artist}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{record.year}</span>
                    {record.label && (
                      <>
                        <span>•</span>
                        <span className="truncate">{record.label}</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Interactive Star Rating */}
                <div onClick={(e) => e.stopPropagation()} className="hidden sm:block">
                  <StarRating 
                    rating={record.myRating} 
                    size="sm" 
                    interactive
                    onChange={(rating) => updateRecord(record.id, { myRating: rating })}
                  />
                </div>
                
                {/* Favorite Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(record.id);
                  }}
                  className="p-1.5 rounded-full hover:bg-muted transition-colors"
                  title={record.isFavorite ? "Von Favoriten entfernen" : "Zu Favoriten hinzufügen"}
                >
                  <Heart className={cn(
                    "w-4 h-4 transition-colors",
                    record.isFavorite ? "heart-favorite fill-current" : "text-muted-foreground hover:text-foreground"
                  )} />
                </button>

                {/* Package Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOrdered(record.id);
                  }}
                  className={cn(
                    "p-1.5 rounded-full transition-colors",
                    record.isOrdered
                      ? "bg-amber-500/20 text-amber-600 hover:bg-amber-500/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title={record.isOrdered ? "Paketmark entfernen" : "Als Paket markieren"}
                >
                  <Package className={cn(
                    "w-4 h-4 transition-colors",
                    record.isOrdered && "fill-current"
                  )} />
                </button>

                <Button
                  size="sm"
                  onClick={(e) => handleMarkAsOwned(record.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity gap-1 bg-primary text-primary-foreground"
                >
                  <ShoppingCart className="w-3 h-3" />
                  Gekauft!
                </Button>
              </div>
              ))}
            </motion.div>
            )}
            {/* Infinite scroll sentinel - stable target for observer */}
            {hasMoreRecords && <div data-infinite-scroll-sentinel className="h-px" />}
            {/* Infinite scroll loading indicator for List View */}
            {hasMoreRecords && isLoadingMore && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-8 gap-3"
              >
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {displayCount}/{filteredRecords.length} Tonträger geladen...
                </p>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
      </div>
      </div>
    </div>
  );
}
