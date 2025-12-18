import { useState } from "react";
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
import { Search, Grid3X3, List, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Record, RecordFormat } from "@/types/record";
import { cn } from "@/lib/utils";

type SortOption = "artist" | "album" | "year" | "dateAdded" | "rating";
type ViewMode = "grid" | "list";

export default function Collection() {
  const { getOwnedRecords } = useRecords();
  const navigate = useNavigate();
  const records = getOwnedRecords();

  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<RecordFormat | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("dateAdded");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Filter and sort records
  const filteredRecords = records
    .filter((record) => {
      const matchesSearch =
        record.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.album.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.genre.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFormat = formatFilter === "all" || record.format === formatFilter;
      return matchesSearch && matchesFormat;
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
              placeholder="Suchen nach Künstler, Album, Genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-border/50"
            />
          </div>

          <div className="flex gap-2">
            <Select
              value={formatFilter}
              onValueChange={(v) => setFormatFilter(v as RecordFormat | "all")}
            >
              <SelectTrigger className="w-[120px] bg-card border-border/50">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="vinyl">Vinyl</SelectItem>
                <SelectItem value="cd">CD</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[140px] bg-card border-border/50">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sortieren" />
              </SelectTrigger>
              <SelectContent>
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
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ListItem({ record, onClick }: { record: Record; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className="flex items-center gap-4 p-3 rounded-lg bg-card border border-border/50 cursor-pointer hover:shadow-card transition-all"
    >
      <div className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0">
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
