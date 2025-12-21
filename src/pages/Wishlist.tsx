import { useState } from "react";
import { useRecords } from "@/context/RecordContext";
import { RecordCard } from "@/components/RecordCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Heart, ShoppingCart, Music, Tag, Sparkles, SlidersHorizontal, Grid3X3, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { RecordFormat } from "@/types/record";
import { cn } from "@/lib/utils";

type SortOption = "artist" | "album" | "year" | "dateAdded" | "rating";
type ViewMode = "grid" | "list";

export default function Wishlist() {
  const { getWishlistRecords, updateRecord, deleteRecord, toggleFavorite } = useRecords();
  const navigate = useNavigate();
  const records = getWishlistRecords();

  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<RecordFormat | "all">("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [moodFilter, setMoodFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("dateAdded");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

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
      return matchesSearch && matchesFormat && matchesGenre && matchesTag && matchesMood;
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

  const handleMarkAsOwned = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateRecord(id, { status: "owned" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold gradient-text flex items-center gap-3">
            <Heart className="w-8 h-8 text-accent fill-accent" />
            Wunschliste
          </h1>
          <p className="text-muted-foreground mt-1">
            {records.length} Tonträger auf deiner Wunschliste
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Suchen nach Künstler, Album, Genre, Stichwort..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-border/50"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Select
              value={formatFilter}
              onValueChange={(v) => setFormatFilter(v as RecordFormat | "all")}
            >
              <SelectTrigger className="w-[110px] bg-card border-border/50">
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
                onValueChange={(v) => setGenreFilter(v)}
              >
                <SelectTrigger className="w-[140px] bg-card border-border/50">
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
                onValueChange={(v) => setTagFilter(v)}
              >
                <SelectTrigger className="w-[140px] bg-card border-border/50">
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

            {allMoods.length > 0 && (
              <Select
                value={moodFilter}
                onValueChange={(v) => setMoodFilter(v)}
              >
                <SelectTrigger className="w-[140px] bg-card border-border/50">
                  <Sparkles className="w-4 h-4 mr-2 flex-shrink-0" />
                  <SelectValue placeholder="Stimmung" />
                </SelectTrigger>
                <SelectContent className="bg-popover max-h-[300px]">
                  <SelectItem value="all">Alle Stimmungen</SelectItem>
                  {allMoods.map((mood) => (
                    <SelectItem key={mood} value={mood}>
                      {mood}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[140px] bg-card border-border/50">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sortieren" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="dateAdded">Zuletzt hinzugefügt</SelectItem>
                <SelectItem value="artist">Künstler</SelectItem>
                <SelectItem value="album">Album</SelectItem>
                <SelectItem value="year">Jahr</SelectItem>
                <SelectItem value="rating">Bewertung</SelectItem>
              </SelectContent>
            </Select>

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
      </div>

      {/* Records Grid/List */}
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {filteredRecords.map((record) => (
              <div key={record.id} className="relative group">
                <RecordCard
                  record={record}
                  onClick={() => navigate(`/sammlung/${record.id}`)}
                  onDelete={() => deleteRecord(record.id)}
                  onToggleFavorite={() => toggleFavorite(record.id)}
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
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                onClick={() => navigate(`/sammlung/${record.id}`)}
                className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/50 cursor-pointer hover:bg-card/80 transition-colors group"
              >
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
                  <h3 className="font-semibold text-foreground truncate">{record.album}</h3>
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
      </AnimatePresence>
    </div>
  );
}
