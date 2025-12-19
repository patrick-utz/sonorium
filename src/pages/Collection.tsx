import { useState, useRef, useEffect } from "react";
import { compressImage } from "@/lib/imageUtils";
import { useRecords } from "@/context/RecordContext";
import { RecordCard } from "@/components/RecordCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Grid3X3, List, SlidersHorizontal, Music, Tag, Camera, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Record, RecordFormat } from "@/types/record";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SortOption = "artist" | "album" | "year" | "dateAdded" | "rating";
type ViewMode = "grid" | "list";

export default function Collection() {
  const { getOwnedRecords, updateRecord, deleteRecord } = useRecords();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const records = getOwnedRecords();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<RecordFormat | "all">("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [moodFilter, setMoodFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("dateAdded");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Read filters from URL params on mount
  useEffect(() => {
    const genreParam = searchParams.get("genre");
    const tagParam = searchParams.get("tag");
    const moodParam = searchParams.get("mood");
    if (genreParam) {
      setGenreFilter(genreParam);
    }
    if (tagParam) {
      setTagFilter(tagParam);
    }
    if (moodParam) {
      setMoodFilter(moodParam);
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

  const handleMoodChange = (value: string) => {
    setMoodFilter(value);
    if (searchParams.has("mood")) {
      searchParams.delete("mood");
      setSearchParams(searchParams);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold gradient-text">
            Deine Sammlung
          </h1>
          <p className="text-muted-foreground mt-1">
            {records.length} Tonträger in deiner Sammlung
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
                onValueChange={handleGenreChange}
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
                onValueChange={handleTagChange}
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
                onValueChange={handleMoodChange}
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
            <div className="w-24 h-24 mx-auto mb-4 vinyl-disc" />
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">
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
              <RecordCard
                key={record.id}
                record={record}
                onClick={() => navigate(`/sammlung/${record.id}`)}
                onCoverUpdate={(coverArt) => updateRecord(record.id, { coverArt })}
                onDelete={() => deleteRecord(record.id)}
              />
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
                onClick={() => navigate(`/sammlung/${record.id}`)}
                onCoverUpdate={(coverArt) => updateRecord(record.id, { coverArt })}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ListItem({ record, onClick, onCoverUpdate }: { record: Record; onClick: () => void; onCoverUpdate: (coverArt: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte wähle eine Bilddatei");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      try {
        const compressed = await compressImage(result);
        onCoverUpdate(compressed);
        toast.success("Cover aktualisiert");
      } catch {
        toast.error("Fehler beim Komprimieren");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className="group flex items-center gap-4 p-3 rounded-lg bg-card border border-border/50 cursor-pointer hover:shadow-card transition-all"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
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
        <button
          onClick={handleUploadClick}
          className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Cover hochladen"
        >
          <Camera className="w-5 h-5 text-foreground" />
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate">{record.album}</h3>
        <p className="text-sm text-muted-foreground truncate">{record.artist}</p>
      </div>
      <div className="text-sm text-muted-foreground hidden sm:block">{record.year}</div>
      <div className="text-sm text-muted-foreground hidden md:block capitalize">
        {record.format}
      </div>
    </motion.div>
  );
}