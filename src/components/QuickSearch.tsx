import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRecords } from "@/context/RecordContext";
import { Search, User, Disc, Music, X, ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  type: "artist" | "album" | "genre";
  value: string;
  recordId?: string;
  count?: number;
  coverArt?: string;
}

export function QuickSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { records } = useRecords();

  const results = useMemo(() => {
    if (!query.trim()) return [];

    setIsSearching(true);
    const searchTerm = query.toLowerCase().trim();
    const matches: SearchResult[] = [];

    // Search albums first (more specific)
    records.forEach((r) => {
      if (r.album.toLowerCase().includes(searchTerm) || 
          r.artist.toLowerCase().includes(searchTerm)) {
        matches.push({ 
          type: "album", 
          value: r.album,
          recordId: r.id,
          coverArt: r.coverArt
        });
      }
    });

    // Search artists
    const artistCounts = new Map<string, number>();
    records.forEach((r) => {
      if (r.artist.toLowerCase().includes(searchTerm)) {
        artistCounts.set(r.artist, (artistCounts.get(r.artist) || 0) + 1);
      }
    });
    artistCounts.forEach((count, artist) => {
      // Don't add if already in album results
      if (!matches.some(m => m.type === "album" && records.find(r => r.id === m.recordId)?.artist === artist)) {
        matches.push({ type: "artist", value: artist, count });
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

    setIsSearching(false);
    return matches.slice(0, 8);
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

  // Keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = useCallback((result: SearchResult) => {
    if (result.type === "album" && result.recordId) {
      navigate(`/sammlung/${result.recordId}`);
    } else if (result.type === "artist") {
      navigate(`/sammlung?search=${encodeURIComponent(result.value)}`);
    } else if (result.type === "genre") {
      navigate(`/sammlung?genre=${encodeURIComponent(result.value)}`);
    }
    setQuery("");
    setIsOpen(false);
  }, [navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
  }, [results, selectedIndex, handleSelect]);

  const getIcon = (type: string) => {
    switch (type) {
      case "artist":
        return <User className="w-4 h-4 text-primary" />;
      case "album":
        return <Disc className="w-4 h-4 text-muted-foreground" />;
      case "genre":
        return <Music className="w-4 h-4 text-accent" />;
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
    <div ref={containerRef} className="relative w-full">
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Suchen... (⌘K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-8 h-10 bg-secondary/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all"
        />
        {query ? (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        ) : isSearching ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        ) : null}
      </div>

      <AnimatePresence>
        {isOpen && (results.length > 0 || (query.trim() && results.length === 0)) && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50"
          >
            {results.length > 0 ? (
              <ul className="py-1.5 max-h-80 overflow-auto">
                {results.map((result, index) => {
                  const record = result.type === "album" && result.recordId 
                    ? records.find(r => r.id === result.recordId)
                    : null;
                  
                  return (
                    <li key={`${result.type}-${result.value}-${index}`}>
                      <motion.button
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleSelect(result)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all group",
                          index === selectedIndex
                            ? "bg-secondary"
                            : "hover:bg-secondary/50"
                        )}
                      >
                        {/* Cover thumbnail for albums */}
                        {result.type === "album" && record?.coverArt ? (
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            <img 
                              src={record.coverArt} 
                              alt="" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            {getIcon(result.type)}
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.value}</p>
                          <p className="text-xs text-muted-foreground">
                            {result.type === "album" && record ? (
                              <span>{record.artist} · {record.year}</span>
                            ) : (
                              <>
                                {getLabel(result.type)}
                                {result.count && ` · ${result.count} Einträge`}
                              </>
                            )}
                          </p>
                        </div>
                        
                        <ArrowRight className={cn(
                          "w-4 h-4 text-muted-foreground transition-all",
                          index === selectedIndex ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                        )} />
                      </motion.button>
                    </li>
                  );
                })}
              </ul>
            ) : query.trim() ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Keine Ergebnisse für „{query}"
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
