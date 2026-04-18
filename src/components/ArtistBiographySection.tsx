import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Loader2, Sparkles, RefreshCw, MapPin, Calendar, Users, Award } from "lucide-react";

interface ArtistBiography {
  artist: string;
  origin?: string;
  activeYears?: string;
  genres?: string[];
  shortBio?: string;
  history?: string;
  keyFacts?: string[];
  influences?: string[];
  legacy?: string;
}

interface CacheEntry {
  data: ArtistBiography;
  timestamp: number;
}

const CACHE_KEY = "sonorium_artist_bio_cache";
const CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getCacheKey(artist: string) {
  return artist.toLowerCase().trim();
}

function readCache(artist: string): ArtistBiography | null {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return null;
    const cache: Record<string, CacheEntry> = JSON.parse(stored);
    const entry = cache[getCacheKey(artist)];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(artist: string, data: ArtistBiography) {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    const cache: Record<string, CacheEntry> = stored ? JSON.parse(stored) : {};
    cache[getCacheKey(artist)] = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("Bio cache write error:", e);
  }
}

interface Props {
  artist: string;
}

export function ArtistBiographySection({ artist }: Props) {
  const { toast } = useToast();
  const [bio, setBio] = useState<ArtistBiography | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // On mount, check cache
  useEffect(() => {
    const cached = readCache(artist);
    if (cached) {
      setBio(cached);
      setHasLoadedOnce(true);
    }
  }, [artist]);

  const fetchBio = useCallback(async (force = false) => {
    if (loading) return;
    if (!force) {
      const cached = readCache(artist);
      if (cached) {
        setBio(cached);
        setHasLoadedOnce(true);
        return;
      }
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('artist-biography', {
        body: { artist },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data && data.artist) {
        setBio(data);
        writeCache(artist, data);
        setHasLoadedOnce(true);
      } else {
        throw new Error("Keine Biografie erhalten");
      }
    } catch (err) {
      console.error("Bio fetch error:", err);
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Biografie konnte nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [artist, loading, toast]);

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Über {artist}
          </CardTitle>
          {bio && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchBio(true)}
              disabled={loading}
              className="gap-2 h-8"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span className="text-xs">Aktualisieren</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!bio && !loading && (
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              Lade die Geschichte von {artist} mit KI-Unterstützung.
            </p>
            <Button onClick={() => fetchBio(false)} variant="outline" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Biografie laden
            </Button>
          </div>
        )}

        {loading && !bio && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            KI recherchiert...
          </div>
        )}

        {bio && (
          <div className="space-y-5">
            {/* Meta-Infos */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {bio.origin && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {bio.origin}
                </div>
              )}
              {bio.activeYears && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {bio.activeYears}
                </div>
              )}
            </div>

            {/* Genres */}
            {bio.genres && bio.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {bio.genres.map((g) => (
                  <Badge key={g} variant="secondary" className="text-xs">
                    {g}
                  </Badge>
                ))}
              </div>
            )}

            {/* Kurzbio */}
            {bio.shortBio && (
              <p className="text-sm text-foreground leading-relaxed font-medium">
                {bio.shortBio}
              </p>
            )}

            {/* Geschichte */}
            {bio.history && (
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line md:columns-2 md:gap-8">
                {bio.history}
              </div>
            )}

            {/* Key Facts */}
            {bio.keyFacts && bio.keyFacts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  Wichtige Fakten
                </h4>
                <ul className="space-y-1.5">
                  {bio.keyFacts.map((fact, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Einflüsse */}
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

            {/* Vermächtnis */}
            {bio.legacy && (
              <div className="border-l-2 border-primary/30 pl-3 italic text-sm text-muted-foreground">
                {bio.legacy}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
