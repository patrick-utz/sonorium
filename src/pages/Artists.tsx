import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecords } from "@/context/RecordContext";
import { useArtistBios } from "@/context/ArtistBiographyContext";
import { isStale } from "@/hooks/useArtistBiographies";
import { fetchArtistImageFromWikipedia } from "@/lib/artistImage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Search, BookOpen, RefreshCw, AlertTriangle, Image as ImageIcon, ArrowUpDown } from "lucide-react";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type SortKey = "name" | "albums" | "rating" | "critic" | "year";
type FilterKey = "all" | "missing" | "stale" | "withBio" | "noImage";

export default function Artists() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { records } = useRecords();
  const { bios, getByArtist, generateBio, fetchAll } = useArtistBios();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [individualLoading, setIndividualLoading] = useState<string | null>(null);
  const [imageBulkLoading, setImageBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterKey, setFilterKey] = useState<FilterKey>("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");

  // Aggregate artists from collection (with rating + critic averages)
  const artists = useMemo(() => {
    type Agg = {
      name: string;
      cover?: string;
      albumCount: number;
      firstYear: number;
      ratingSum: number;
      ratingCount: number;
      criticSum: number;
      criticCount: number;
      genres: Set<string>;
    };
    const map = new Map<string, Agg>();
    for (const r of records) {
      const key = r.artist.toLowerCase().trim();
      if (!key) continue;
      const existing = map.get(key);
      const rating = typeof r.myRating === "number" ? r.myRating : null;
      const critic = typeof r.criticScore === "number" ? r.criticScore : null;
      const recGenres = Array.isArray(r.genre) ? r.genre.filter(Boolean) : [];
      if (existing) {
        existing.albumCount += 1;
        if (!existing.cover && r.coverArt) existing.cover = r.coverArt;
        if (r.year && r.year < existing.firstYear) existing.firstYear = r.year;
        if (rating !== null) { existing.ratingSum += rating; existing.ratingCount += 1; }
        if (critic !== null) { existing.criticSum += critic; existing.criticCount += 1; }
        recGenres.forEach((g) => existing.genres.add(g));
      } else {
        map.set(key, {
          name: r.artist,
          cover: r.coverArt,
          albumCount: 1,
          firstYear: r.year || 9999,
          ratingSum: rating ?? 0,
          ratingCount: rating !== null ? 1 : 0,
          criticSum: critic ?? 0,
          criticCount: critic !== null ? 1 : 0,
          genres: new Set(recGenres),
        });
      }
    }
    return Array.from(map.values())
      .map((a) => ({
        ...a,
        genres: Array.from(a.genres).sort(),
        avgRating: a.ratingCount > 0 ? a.ratingSum / a.ratingCount : null,
        avgCritic: a.criticCount > 0 ? a.criticSum / a.criticCount : null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);

  // All distinct genres across collection (for the filter dropdown)
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    artists.forEach((a) => a.genres.forEach((g) => set.add(g)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [artists]);


  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = artists;

    // Filter
    if (filterKey !== "all") {
      list = list.filter((a) => {
        const bio = getByArtist(a.name);
        switch (filterKey) {
          case "missing": return !bio;
          case "withBio": return !!bio;
          case "stale": return !!bio && isStale(bio.updated_at);
          case "noImage": return !bio?.artist_image;
          default: return true;
        }
      });
    }

    // Genre filter
    if (genreFilter !== "all") {
      list = list.filter((a) => a.genres.includes(genreFilter));
    }

    // Search
    if (q) list = list.filter((a) => a.name.toLowerCase().includes(q));

    // Sort
    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      switch (sortKey) {
        case "albums": return (a.albumCount - b.albumCount) * dir;
        case "rating": return ((a.avgRating ?? -1) - (b.avgRating ?? -1)) * dir;
        case "critic": return ((a.avgCritic ?? -1) - (b.avgCritic ?? -1)) * dir;
        case "year": return (a.firstYear - b.firstYear) * dir;
        case "name":
        default: return a.name.localeCompare(b.name) * dir;
      }
    });
    return sorted;
  }, [artists, search, filterKey, sortKey, sortDir, getByArtist]);

  const missingCount = artists.filter((a) => !getByArtist(a.name)).length;
  const staleCount = artists.filter((a) => {
    const b = getByArtist(a.name);
    return b && isStale(b.updated_at);
  }).length;

  const handleGenerateOne = async (artistName: string) => {
    setIndividualLoading(artistName);
    try {
      await generateBio(artistName, true);
      toast({ title: "Biografie erstellt", description: artistName });
    } catch (e) {
      toast({
        title: "Fehler",
        description: e instanceof Error ? e.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setIndividualLoading(null);
    }
  };

  const handleBulkGenerate = async (mode: "missing" | "stale" | "all") => {
    let targets = artists.map((a) => a.name);
    if (mode === "missing") {
      targets = artists.filter((a) => !getByArtist(a.name)).map((a) => a.name);
    } else if (mode === "stale") {
      targets = artists
        .filter((a) => {
          const b = getByArtist(a.name);
          return b && isStale(b.updated_at);
        })
        .map((a) => a.name);
    }

    if (targets.length === 0) {
      toast({ title: "Nichts zu tun", description: "Keine passenden Künstler gefunden." });
      return;
    }

    setBulkLoading(true);
    setBulkProgress({ current: 0, total: targets.length });
    let success = 0;
    let failed = 0;

    for (let i = 0; i < targets.length; i++) {
      try {
        await generateBio(targets[i], mode !== "missing");
        success++;
      } catch (e) {
        console.warn("Bulk bio failed for", targets[i], e);
        failed++;
      }
      setBulkProgress({ current: i + 1, total: targets.length });
      // small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 800));
    }

    setBulkLoading(false);
    toast({
      title: "Bulk-Generierung abgeschlossen",
      description: `${success} erstellt, ${failed} fehlgeschlagen.`,
    });
  };

  // Count artists whose stored bio is missing an image
  const missingImagesCount = bios.filter((b) => !b.artist_image).length;

  const handleBulkFetchImages = async () => {
    if (!user) return;
    const targets = bios.filter((b) => !b.artist_image);
    if (targets.length === 0) {
      toast({ title: "Alle Bilder vorhanden", description: "Keine Künstlerbilder fehlen." });
      return;
    }
    setImageBulkLoading(true);
    setBulkProgress({ current: 0, total: targets.length });
    let success = 0;
    for (let i = 0; i < targets.length; i++) {
      const b = targets[i];
      try {
        const img = await fetchArtistImageFromWikipedia(b.artist_name);
        if (img) {
          await supabase
            .from("artist_biographies")
            .update({ artist_image: img })
            .eq("id", b.id);
          success++;
        }
      } catch (e) {
        console.warn("Image fetch failed for", b.artist_name, e);
      }
      setBulkProgress({ current: i + 1, total: targets.length });
      await new Promise((r) => setTimeout(r, 400));
    }
    await fetchAll();
    setImageBulkLoading(false);
    toast({
      title: "Künstlerbilder aktualisiert",
      description: `${success} von ${targets.length} Bildern gefunden.`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          Künstler
        </h1>
        <p className="text-muted-foreground">
          {artists.length} Künstler in deiner Sammlung • {bios.length} Biografien gespeichert
        </p>
      </div>

      {/* Bulk Actions */}
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <BookOpen className="w-3 h-3" />
              {bios.length} vorhanden
            </Badge>
            {missingCount > 0 && (
              <Badge variant="outline" className="gap-1.5">
                <Sparkles className="w-3 h-3" />
                {missingCount} fehlen
              </Badge>
            )}
            {staleCount > 0 && (
              <Badge variant="outline" className="gap-1.5 text-amber-600 border-amber-500/30">
                <AlertTriangle className="w-3 h-3" />
                {staleCount} veraltet (älter als 90 Tage)
              </Badge>
            )}
            {missingImagesCount > 0 && (
              <Badge variant="outline" className="gap-1.5">
                <ImageIcon className="w-3 h-3" />
                {missingImagesCount} ohne Bild
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {missingCount > 0 && (
              <Button
                onClick={() => handleBulkGenerate("missing")}
                disabled={bulkLoading || imageBulkLoading}
                variant="default"
                size="sm"
                className="gap-2"
              >
                {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Fehlende erstellen
              </Button>
            )}
            {staleCount > 0 && (
              <Button
                onClick={() => handleBulkGenerate("stale")}
                disabled={bulkLoading || imageBulkLoading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Veraltete aktualisieren
              </Button>
            )}
            {missingImagesCount > 0 && (
              <Button
                onClick={handleBulkFetchImages}
                disabled={bulkLoading || imageBulkLoading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {imageBulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                Bilder laden
              </Button>
            )}
          </div>
        </CardContent>
        {(bulkLoading || imageBulkLoading) && (
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-xs text-muted-foreground mb-1.5">
              {imageBulkLoading ? "Lade Bilder" : "Generiere"} {bulkProgress.current} / {bulkProgress.total}
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(bulkProgress.current / Math.max(bulkProgress.total, 1)) * 100}%` }}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Search + Sort + Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Künstler suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Sortieren" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Alphabetisch</SelectItem>
              <SelectItem value="albums">Anzahl Alben</SelectItem>
              <SelectItem value="rating">Meine Bewertung</SelectItem>
              <SelectItem value="critic">Kritik-Score</SelectItem>
              <SelectItem value="year">Erstes Jahr</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            title={sortDir === "asc" ? "Aufsteigend" : "Absteigend"}
          >
            <ArrowUpDown className={`w-4 h-4 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
          </Button>
          <Select value={filterKey} onValueChange={(v) => setFilterKey(v as FilterKey)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Künstler</SelectItem>
              <SelectItem value="missing">Ohne Biografie</SelectItem>
              <SelectItem value="withBio">Mit Biografie</SelectItem>
              <SelectItem value="stale">Veraltete Bios</SelectItem>
              <SelectItem value="noImage">Ohne Bild</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Result count */}
      {(filterKey !== "all" || search) && (
        <div className="text-sm text-muted-foreground">
          {filtered.length} von {artists.length} Künstlern
        </div>
      )}

      {/* Tile Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {artists.length === 0
            ? "Noch keine Künstler in deiner Sammlung."
            : "Keine Künstler gefunden."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((artist) => {
            const bio = getByArtist(artist.name);
            const stale = bio && isStale(bio.updated_at);
            const isLoadingThis = individualLoading === artist.name;
            // Prefer Wikipedia artist image, fall back to first album cover
            const heroImage = bio?.artist_image || artist.cover;
            return (
              <motion.div
                key={artist.name}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card
                  className="bg-gradient-card border-border/50 overflow-hidden cursor-pointer group h-full"
                  onClick={() => navigate(`/kuenstler/${encodeURIComponent(artist.name)}`)}
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {heroImage ? (
                      <img
                        src={heroImage}
                        alt={artist.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-vinyl">
                        <BookOpen className="w-12 h-12 text-primary/50" />
                      </div>
                    )}

                    {/* Critic score (top-left) */}
                    {artist.avgCritic !== null && (
                      <div className="absolute top-2 left-2">
                        <div className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20">
                          <span className="text-xs font-semibold text-white tabular-nums">
                            {Math.round(artist.avgCritic)}
                            <span className="text-white/60 text-[10px]">/100</span>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Status badge (top-right) */}
                    <div className="absolute top-2 right-2">
                      {!bio ? (
                        <Badge variant="outline" className="bg-background/80 backdrop-blur text-xs">
                          Keine Bio
                        </Badge>
                      ) : stale ? (
                        <Badge variant="outline" className="bg-background/80 backdrop-blur text-xs text-amber-600 border-amber-500/30">
                          Veraltet
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-background/80 backdrop-blur text-xs">
                          ✓ Bio
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-3 space-y-1.5">
                    <h3 className="font-semibold text-foreground truncate">{artist.name}</h3>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {artist.albumCount} {artist.albumCount === 1 ? "Album" : "Alben"}
                      </p>
                      {artist.avgRating !== null && (
                        <StarRating rating={Math.round(artist.avgRating)} size="sm" />
                      )}
                    </div>
                    {!bio && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full h-7 text-xs gap-1.5 mt-1"
                        disabled={isLoadingThis || bulkLoading}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateOne(artist.name);
                        }}
                      >
                        {isLoadingThis ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        Erstellen
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
