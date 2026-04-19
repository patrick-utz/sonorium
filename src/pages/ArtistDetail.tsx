import { useMemo, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecords } from "@/context/RecordContext";
import { useArtistBios } from "@/context/ArtistBiographyContext";
import { isStale } from "@/hooks/useArtistBiographies";
import { useAudiophileProfile } from "@/context/AudiophileProfileContext";
import { useResearchCache } from "@/hooks/useResearchCache";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  RefreshCw,
  Sparkles,
  MapPin,
  Calendar,
  Users,
  Award,
  Star,
  Disc3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { RecordCard } from "@/components/RecordCard";
import { lookupAlbumCover } from "@/lib/albumCoverLookup";
import { Heart, Check } from "lucide-react";

export default function ArtistDetail() {
  const { name } = useParams<{ name: string }>();
  const artistName = decodeURIComponent(name || "");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { records, addRecord } = useRecords();
  const { getByArtist, generateBio, ensureBio } = useArtistBios();
  const { profile } = useAudiophileProfile();
  const { getArtistCache, setArtistCache } = useResearchCache();
  const [loading, setLoading] = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);

  // Top recommendations (Must-Haves) for this artist
  const [topRecs, setTopRecs] = useState<any[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsTriggered, setRecsTriggered] = useState(false);
  const [showAllMustHaves, setShowAllMustHaves] = useState(false);
  // Map of "artist|album" → cover URL (or null when looked up but not found)
  const [coverMap, setCoverMap] = useState<Record<string, string | null>>({});
  const [addedAlbums, setAddedAlbums] = useState<Set<string>>(new Set());
  const [addingAlbum, setAddingAlbum] = useState<string | null>(null);

  const bio = getByArtist(artistName);

  const albums = useMemo(
    () =>
      records
        .filter((r) => r.artist.toLowerCase().trim() === artistName.toLowerCase().trim())
        .sort((a, b) => (a.year || 0) - (b.year || 0)),
    [records, artistName]
  );

  // Album titles already in user's collection/wishlist (lowercased) — to filter out
  const ownedAlbumTitles = useMemo(
    () => new Set(albums.map((a) => a.album.toLowerCase().trim())),
    [albums]
  );

  // Auto-load on mount
  useEffect(() => {
    if (autoTriggered) return;
    setAutoTriggered(true);
    const run = async () => {
      try {
        if (!bio) {
          setLoading(true);
          await ensureBio(artistName);
        } else if (isStale(bio.updated_at)) {
          setLoading(true);
          await generateBio(artistName, true);
        }
      } catch (e) {
        console.warn("Bio load failed:", e);
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistName]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await generateBio(artistName, true);
      toast({ title: "Biografie aktualisiert" });
    } catch (e) {
      toast({
        title: "Fehler",
        description: e instanceof Error ? e.message : "Aktualisierung fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load top recommendations (Must-Haves) for this artist
  const loadRecommendations = async (force = false) => {
    if (!artistName) return;

    // Try cache first
    if (!force) {
      const cached = getArtistCache(artistName);
      if (cached?.topRecommendations?.length) {
        setTopRecs(cached.topRecommendations);
        return;
      }
    }

    setRecsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("artist-research", {
        body: { artist: artistName, profile: profile || null },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const recs = Array.isArray(data?.topRecommendations) ? data.topRecommendations : [];
      setTopRecs(recs);
      setArtistCache(artistName, data);
    } catch (e) {
      console.warn("Top recs load failed:", e);
      if (force) {
        toast({
          title: "Empfehlungen konnten nicht geladen werden",
          description: e instanceof Error ? e.message : "Unbekannter Fehler",
          variant: "destructive",
        });
      }
    } finally {
      setRecsLoading(false);
    }
  };

  // Auto-load recommendations once on mount
  useEffect(() => {
    if (recsTriggered) return;
    setRecsTriggered(true);
    loadRecommendations(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistName]);

  // Filter out albums the user already owns / has on the wishlist.
  // Keep up to 5 candidates so the user can toggle "Mehr anzeigen".
  const mustHavesAll = useMemo(() => {
    return topRecs
      .filter((r: any) => {
        const title = (r?.album || "").toLowerCase().trim();
        if (!title) return false;
        return !ownedAlbumTitles.has(title);
      })
      .slice(0, 5);
  }, [topRecs, ownedAlbumTitles]);

  const mustHaves = useMemo(
    () => (showAllMustHaves ? mustHavesAll : mustHavesAll.slice(0, 3)),
    [mustHavesAll, showAllMustHaves]
  );

  // Fetch covers for visible Must-Haves (iTunes → MusicBrainz fallback)
  useEffect(() => {
    let cancelled = false;
    const todo = mustHaves.filter((r: any) => {
      const key = `${artistName.toLowerCase().trim()}|${(r?.album || "").toLowerCase().trim()}`;
      return r?.album && !(key in coverMap);
    });
    if (todo.length === 0) return;

    (async () => {
      for (const r of todo) {
        const album = r.album as string;
        const key = `${artistName.toLowerCase().trim()}|${album.toLowerCase().trim()}`;
        try {
          const url = await lookupAlbumCover(artistName, album);
          if (cancelled) return;
          setCoverMap((prev) => ({ ...prev, [key]: url }));
        } catch (e) {
          console.warn("Cover lookup failed for", album, e);
          if (!cancelled) {
            setCoverMap((prev) => ({ ...prev, [key]: null }));
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mustHaves, artistName]);

  // Add a recommended album directly to the wishlist
  const handleAddToWishlist = async (rec: any) => {
    const key = (rec?.album || "").toLowerCase().trim();
    if (!key || addedAlbums.has(key) || addingAlbum === key) return;
    setAddingAlbum(key);
    try {
      const coverKey = `${artistName.toLowerCase().trim()}|${key}`;
      const cover = coverMap[coverKey];
      const bestPressing = Array.isArray(rec.bestPressings) && rec.bestPressings.length > 0
        ? rec.bestPressings[0]
        : null;
      await addRecord({
        artist: artistName,
        album: rec.album,
        year: bestPressing?.year ?? rec.year ?? new Date().getFullYear(),
        genre: [],
        label: bestPressing?.label ?? rec.label ?? "",
        catalogNumber: bestPressing?.catalogNumber,
        format: "vinyl",
        pressing: bestPressing
          ? `${bestPressing.label ?? ""}${bestPressing.catalogNumber ? ` · ${bestPressing.catalogNumber}` : ""}${bestPressing.year ? ` (${bestPressing.year})` : ""}`.trim()
          : undefined,
        coverArt: cover || undefined,
        myRating: 3,
        criticScore: typeof rec.criticScore === "number" ? rec.criticScore : undefined,
        status: "wishlist",
        vinylRecommendation: "must-have",
        recommendationReason: rec.description || `Top-Empfehlung von ${artistName}`,
      });
      setAddedAlbums((prev) => new Set(prev).add(key));
      toast({
        title: "Zur Wunschliste hinzugefügt",
        description: `${rec.album} – ${artistName}`,
      });
    } catch (e) {
      toast({
        title: "Fehler",
        description: e instanceof Error ? e.message : "Konnte nicht zur Wunschliste hinzugefügt werden",
        variant: "destructive",
      });
    } finally {
      setAddingAlbum(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/kuenstler")}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Alle Künstler
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          {bio?.artist_image && (
            <img
              src={bio.artist_image}
              alt={artistName}
              className="w-24 h-24 md:w-32 md:h-32 rounded-lg object-cover border border-border/50 shadow-md"
            />
          )}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
              {!bio?.artist_image && <BookOpen className="w-8 h-8 text-primary" />}
              {artistName}
            </h1>
            <p className="text-muted-foreground mt-1">
              {albums.length} {albums.length === 1 ? "Album" : "Alben"} in deiner Sammlung
            </p>
          </div>
        </div>
        {bio && (
          <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Aktualisieren
          </Button>
        )}
      </div>

      {/* Bio */}
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="p-6">
          {!bio && loading && (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              KI erstellt Biografie...
            </div>
          )}

          {!bio && !loading && (
            <div className="flex flex-col items-start gap-3 py-2">
              <p className="text-sm text-muted-foreground">Noch keine Biografie verfügbar.</p>
              <Button onClick={handleRefresh} variant="default" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Biografie erstellen
              </Button>
            </div>
          )}

          {bio && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {bio.origin && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {bio.origin}
                  </div>
                )}
                {bio.active_years && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {bio.active_years}
                  </div>
                )}
              </div>

              {bio.genres && bio.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {bio.genres.map((g) => (
                    <Badge key={g} variant="secondary" className="text-xs">
                      {g}
                    </Badge>
                  ))}
                </div>
              )}

              {bio.short_bio && (
                <p className="text-base text-foreground leading-relaxed font-medium">
                  {bio.short_bio}
                </p>
              )}

              {bio.history && (
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line md:columns-2 md:gap-8">
                  {bio.history}
                </div>
              )}

              {bio.key_facts && bio.key_facts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    Wichtige Fakten
                  </h4>
                  <ul className="space-y-1.5">
                    {bio.key_facts.map((fact, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {bio.influences && bio.influences.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Einflüsse
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {bio.influences.map((inf) => (
                      <Badge key={inf} variant="outline" className="text-xs">
                        {inf}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {bio.legacy && (
                <div className="border-l-2 border-primary/30 pl-3 italic text-sm text-muted-foreground">
                  {bio.legacy}
                </div>
              )}

              <p className="text-xs text-muted-foreground/60">
                Aktualisiert: {new Date(bio.updated_at).toLocaleDateString("de-CH")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Albums */}
      {albums.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Diskografie in deiner Sammlung</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {albums.map((record) => (
              <RecordCard key={record.id} record={record} />
            ))}
          </div>
        </div>
      )}

      {/* Must-Haves: Top 3 AI recommendations not in collection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Must-Haves
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Die wichtigsten Alben dieses Künstlers, die noch in deiner Sammlung fehlen.
            </p>
          </div>
          <Button
            onClick={() => loadRecommendations(true)}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={recsLoading}
          >
            {recsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Aktualisieren
          </Button>
        </div>

        {recsLoading && mustHaves.length === 0 && (
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              KI sucht die Must-Have-Pressungen...
            </CardContent>
          </Card>
        )}

        {!recsLoading && mustHaves.length === 0 && topRecs.length === 0 && (
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Noch keine Empfehlungen geladen.{" "}
              <button
                type="button"
                onClick={() => loadRecommendations(true)}
                className="text-primary hover:underline"
              >
                Jetzt laden
              </button>
            </CardContent>
          </Card>
        )}

        {!recsLoading && mustHaves.length === 0 && topRecs.length > 0 && (
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Du besitzt bereits alle Must-Have-Alben dieses Künstlers. 🎉
            </CardContent>
          </Card>
        )}

        {mustHaves.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {mustHaves.map((rec: any, idx: number) => {
                const musical = typeof rec.musicalRating === "number" ? rec.musicalRating : null;
                const sound = typeof rec.soundRating === "number" ? rec.soundRating : null;
                const coverKey = `${artistName.toLowerCase().trim()}|${(rec.album || "").toLowerCase().trim()}`;
                const coverUrl = coverMap[coverKey]; // undefined = pending, null = not found, string = found
                const coverPending = !(coverKey in coverMap);
                return (
                  <Card
                    key={`${rec.album}-${idx}`}
                    className="bg-gradient-card border-border/50 hover:border-primary/40 transition-colors overflow-hidden flex flex-col"
                  >
                    {/* Cover */}
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={`${rec.album} – ${artistName}`}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={() =>
                            setCoverMap((prev) => ({ ...prev, [coverKey]: null }))
                          }
                        />
                      ) : coverPending ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/60" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-vinyl">
                          <Disc3 className="w-12 h-12 text-primary/40" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge variant="outline" className="gap-1.5 text-xs bg-background/80 backdrop-blur">
                          <Award className="w-3 h-3" />
                          Rang {rec.rank ?? idx + 1}
                        </Badge>
                      </div>
                      {/* Top-right: Critic Score Badge (always visible, like RecordCard) */}
                      {typeof rec.criticScore === "number" && (
                        <div
                          className="absolute top-2 right-2 z-10"
                          title={rec.criticScoreReason || undefined}
                        >
                          <div className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 shadow-lg">
                            <span className="text-xs font-semibold text-white tabular-nums">
                              {Math.round(rec.criticScore)}
                              <span className="text-white/60 text-[10px]">/100</span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
                      <div>
                        <h3 className="font-semibold text-foreground leading-tight">
                          {rec.album}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {[rec.year, rec.label].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      </div>
                      {(musical !== null || sound !== null || typeof rec.criticScore === "number") && (
                        <div className="flex items-center gap-3 text-xs flex-wrap">
                          {typeof rec.criticScore === "number" && (
                            <div
                              className="flex items-center gap-1 text-foreground"
                              title={rec.criticScoreReason || undefined}
                            >
                              <Award className="w-3.5 h-3.5 text-primary" />
                              <span className="tabular-nums font-semibold">{rec.criticScore}/100</span>
                              <span className="text-muted-foreground">Kritik</span>
                            </div>
                          )}
                          {musical !== null && (
                            <div className="flex items-center gap-1 text-foreground">
                              <Star className="w-3.5 h-3.5 fill-current text-primary" />
                              <span className="tabular-nums">{musical}/5</span>
                              <span className="text-muted-foreground">Musik</span>
                            </div>
                          )}
                          {sound !== null && (
                            <div className="flex items-center gap-1 text-foreground">
                              <Disc3 className="w-3.5 h-3.5 text-primary" />
                              <span className="tabular-nums">{sound}/5</span>
                              <span className="text-muted-foreground">Klang</span>
                            </div>
                          )}
                        </div>
                      )}
                      {rec.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                          {rec.description}
                        </p>
                      )}
                      {Array.isArray(rec.bestPressings) && rec.bestPressings.length > 0 && (
                        <div className="pt-2 border-t border-border/50 space-y-1">
                          <p className="text-xs font-semibold text-foreground">
                            Empfohlene Pressung:
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {rec.bestPressings[0].label}
                            {rec.bestPressings[0].catalogNumber && ` · ${rec.bestPressings[0].catalogNumber}`}
                            {rec.bestPressings[0].year && ` (${rec.bestPressings[0].year})`}
                          </p>
                        </div>
                      )}
                      {(() => {
                        const albumKey = (rec.album || "").toLowerCase().trim();
                        const isAdded = addedAlbums.has(albumKey);
                        const isAdding = addingAlbum === albumKey;
                        return (
                          <Button
                            variant={isAdded ? "ghost" : "default"}
                            size="sm"
                            className="w-full h-8 text-xs gap-1.5 mt-auto"
                            onClick={() => handleAddToWishlist(rec)}
                            disabled={isAdded || isAdding}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Auf Wunschliste
                              </>
                            ) : isAdding ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Wird hinzugefügt…
                              </>
                            ) : (
                              <>
                                <Heart className="w-3.5 h-3.5" />
                                Auf Wunschliste
                              </>
                            )}
                          </Button>
                        );
                      })()}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Mehr / Weniger anzeigen */}
            {mustHavesAll.length > 3 && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAllMustHaves((v) => !v)}
                >
                  {showAllMustHaves ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Weniger anzeigen
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Mehr anzeigen ({mustHavesAll.length - 3} weitere)
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
