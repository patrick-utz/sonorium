import { useState, useRef } from "react";
import { compressImage } from "@/lib/imageUtils";
import { useRecords } from "@/context/RecordContext";
import { RecordCard } from "@/components/RecordCard";
import { Input } from "@/components/ui/input";
import { Search, Grid3X3, List, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Record, RecordFormat } from "@/types/record";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SortOption = "artist" | "album" | "year" | "dateAdded" | "rating";
type ViewMode = "grid" | "list";

export default function Collection() {
  const { getOwnedRecords, updateRecord, deleteRecord } = useRecords();
  const navigate = useNavigate();
  const records = getOwnedRecords();
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<RecordFormat | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("dateAdded");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

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

  const handleFormatFilter = (format: RecordFormat | "all") => {
    setFormatFilter(format);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Deine Sammlung
        </h1>
        <p className="text-muted-foreground mt-1">
          {records.length} Tonträger
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 bg-card border-border rounded-2xl text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Format Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hidden py-1">
        <button 
          className={cn("filter-tab whitespace-nowrap", formatFilter === "all" && "active")}
          onClick={() => handleFormatFilter("all")}
        >
          Alle
        </button>
        <button 
          className={cn("filter-tab whitespace-nowrap", formatFilter === "vinyl" && "active")}
          onClick={() => handleFormatFilter("vinyl")}
        >
          Vinyl
        </button>
        <button 
          className={cn("filter-tab whitespace-nowrap", formatFilter === "cd" && "active")}
          onClick={() => handleFormatFilter("cd")}
        >
          CD
        </button>
      </div>

      {/* View Toggle & Sort */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-card rounded-xl p-1">
          <button
            className={cn(
              "p-2 rounded-lg transition-colors",
              viewMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground"
            )}
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button
            className={cn(
              "p-2 rounded-lg transition-colors",
              viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground"
            )}
            onClick={() => setViewMode("list")}
          >
            <List className="w-5 h-5" />
          </button>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="bg-card text-foreground text-sm px-3 py-2 rounded-xl border-none focus:ring-2 focus:ring-primary"
        >
          <option value="dateAdded">Zuletzt hinzugefügt</option>
          <option value="artist">Künstler</option>
          <option value="album">Album</option>
          <option value="year">Jahr</option>
          <option value="rating">Bewertung</option>
        </select>
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
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-card flex items-center justify-center">
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
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
            className="grid grid-cols-2 gap-4"
          >
            {filteredRecords.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onClick={() => navigate(`/sammlung/${record.id}`)}
                onCoverUpdate={(coverArt) => updateRecord(record.id, { coverArt })}
                onDelete={() => deleteRecord(record.id)}
                variant="compact"
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

  const ratingScore = record.myRating ? (record.myRating * 2).toFixed(1) : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className="group flex items-center gap-4 p-3 rounded-2xl bg-card cursor-pointer hover:bg-secondary/50 transition-colors"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
        {record.coverArt ? (
          <img
            src={record.coverArt}
            alt={record.album}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full album-placeholder flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-muted" />
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
      {ratingScore && (
        <div className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
          {ratingScore}
        </div>
      )}
      <div className="text-xs text-muted-foreground uppercase">
        {record.format}
      </div>
    </motion.div>
  );
}