import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useRecords } from "@/context/RecordContext";
import { Search, User, Disc, Music, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  type: "artist" | "album" | "genre";
  value: string;
  recordId?: string;
  count?: number;
}

export function QuickSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { records } = useRecords();

  const results = useMemo(() => {
    if (!query.trim()) return [];

    const searchTerm = query.toLowerCase();
    const matches: SearchResult[] = [];

    // Search artists
    const artistCounts = new Map<string, number>();
    records.forEach((r) => {
      if (r.artist.toLowerCase().includes(searchTerm)) {
        artistCounts.set(r.artist, (artistCounts.get(r.artist) || 0) + 1);
      }
    });
    artistCounts.forEach((count, artist) => {
      matches.push({ type: "artist", value: artist, count });
    });

    // Search albums
    records.forEach((r) => {
      if (r.album.toLowerCase().includes(searchTerm)) {
        matches.push({ type: "album", value: `${r.artist} – ${r.album}`, recordId: r.id });
      }
    });

    // Search genres
    const genreCounts = new Map<string, number>();
    records.forEach((r) => {
      r.genre?.forEach((g) => {
        if (g.toLowerCase().includes(searchTerm)) {
          genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
        }
      });
    });
    genreCounts.forEach((count, genre) => {
      matches.push({ type: "genre", value: genre, count });
    });

    return matches.slice(0, 10);
  }, [query, records]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    if (result.type === "album" && result.recordId) {
      navigate(`/details/${result.recordId}`);
    } else if (result.type === "artist") {
      navigate(`/sammlung?search=${encodeURIComponent(result.value)}`);
    } else if (result.type === "genre") {
      navigate(`/sammlung?genre=${encodeURIComponent(result.value)}`);
    }
    setQuery("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "artist":
        return <User className="w-4 h-4 text-primary" />;
      case "album":
        return <Disc className="w-4 h-4 text-muted-foreground" />;
      case "genre":
        return <Music className="w-4 h-4 text-accent-foreground" />;
      default:
        return null;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case "artist":
        return "Künstler";
      case "album":
        return "Album";
      case "genre":
        return "Genre";
      default:
        return "";
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Suchen..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-8 bg-secondary/50 border-border/50 focus:bg-background"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50"
          >
            <ul className="py-1 max-h-80 overflow-auto">
              {results.map((result, index) => (
                <li key={`${result.type}-${result.value}-${index}`}>
                  <button
                    onClick={() => handleSelect(result)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      index === selectedIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                  >
                    {getIcon(result.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.value}</p>
                      <p className="text-xs text-muted-foreground">
                        {getLabel(result.type)}
                        {result.count && ` · ${result.count} Einträge`}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
