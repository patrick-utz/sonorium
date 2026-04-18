import { useEffect, useState } from "react";
import { useArtistBios } from "@/context/ArtistBiographyContext";
import { isStale } from "@/hooks/useArtistBiographies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Loader2, Sparkles, RefreshCw, MapPin, Calendar, Users, Award } from "lucide-react";

interface Props {
  artist: string;
}

export function ArtistBiographySection({ artist }: Props) {
  const { toast } = useToast();
  const { getByArtist, generateBio, ensureBio } = useArtistBios();
  const [loading, setLoading] = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);

  const bio = getByArtist(artist);

  // Auto-create on first open if missing, auto-refresh if stale
  useEffect(() => {
    if (!artist || autoTriggered) return;
    setAutoTriggered(true);

    const run = async () => {
      try {
        if (!bio) {
          setLoading(true);
          await ensureBio(artist);
        } else if (isStale(bio.updated_at)) {
          setLoading(true);
          await generateBio(artist, true);
        }
      } catch (e) {
        console.warn("Bio auto-load failed:", e);
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artist]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await generateBio(artist, true);
      toast({ title: "Biografie aktualisiert" });
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Aktualisierung fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
              onClick={handleRefresh}
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
              Noch keine Biografie verfügbar.
            </p>
            <Button onClick={handleRefresh} variant="outline" className="gap-2">
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
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {bio.origin && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {bio.origin}
                </div>
              )}
              {bio.active_years && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
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
              <p className="text-sm text-foreground leading-relaxed font-medium">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
