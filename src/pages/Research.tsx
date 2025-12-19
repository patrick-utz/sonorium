import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Search, 
  Loader2, 
  Music, 
  Star, 
  AlertTriangle, 
  CheckCircle2, 
  Plus,
  Settings2,
  Disc3,
  Album as AlbumIcon,
  Lightbulb,
  XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAudiophileProfile } from "@/context/AudiophileProfileContext";
import { AudiophileProfileEditor } from "@/components/AudiophileProfileEditor";
import { ArtistResearchResult, AlbumRecommendation } from "@/types/audiophileProfile";
import { useRecords } from "@/context/RecordContext";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function Research() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<ArtistResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const { profile, hasProfile } = useAudiophileProfile();
  const { addRecord } = useRecords();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('artist-research', {
        body: { artist: searchQuery, profile }
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setResult(data);
    } catch (err: any) {
      console.error("Research error:", err);
      setError(err.message || "Ein Fehler ist aufgetreten");
    } finally {
      setIsSearching(false);
    }
  };

  const addToWishlist = (album: AlbumRecommendation) => {
    // Find the best pressing
    const bestPressing = album.bestPressings?.find(p => p.quality === 'reference' || p.quality === 'excellent') 
      || album.bestPressings?.[0];

    addRecord({
      artist: album.artist,
      album: album.album,
      year: parseInt(album.year) || new Date().getFullYear(),
      genre: [],
      label: bestPressing?.label || album.label,
      catalogNumber: bestPressing?.catalogNumber || "",
      format: profile?.mediaFormat === 'cd' ? 'cd' : 'vinyl',
      status: "wishlist",
      myRating: album.musicalRating || 0,
      personalNotes: `${album.description}\n\nPressung: ${bestPressing?.notes || 'Siehe Empfehlungen'}`,
      tags: [],
      isFavorite: false,
    });

    toast({
      title: "Zur Wunschliste hinzugefügt",
      description: `${album.artist} - ${album.album}`,
    });
  };

  const getRatingStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        className={`w-3.5 h-3.5 ${i < rating ? 'star-filled' : 'star-empty'}`} 
      />
    ));
  };

  const getQualityBadge = (quality: string) => {
    const styles = {
      reference: "bg-accent/20 text-accent border-accent/30",
      excellent: "bg-green-500/20 text-green-400 border-green-500/30",
      good: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      acceptable: "bg-muted text-muted-foreground border-border",
    };
    const labels = {
      reference: "Referenz",
      excellent: "Exzellent",
      good: "Gut",
      acceptable: "Akzeptabel",
    };
    return (
      <Badge variant="outline" className={styles[quality as keyof typeof styles] || styles.acceptable}>
        {labels[quality as keyof typeof labels] || quality}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Recherche</h1>
            <p className="text-muted-foreground mt-1">
              Finde die besten Pressungen für deine Lieblingsmusiker
            </p>
          </div>
          
          <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings2 className="w-4 h-4" />
                {hasProfile ? "Profil bearbeiten" : "Profil einrichten"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Audiophiles Profil</DialogTitle>
              </DialogHeader>
              <AudiophileProfileEditor 
                compact 
                onClose={() => setShowProfileDialog(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Profile Status */}
        {!hasProfile && (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="flex items-center gap-4 py-4">
              <Lightbulb className="w-5 h-5 text-accent flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  Richte dein audiophiles Profil ein, um personalisierte Empfehlungen zu erhalten.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowProfileDialog(true)}>
                Jetzt einrichten
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Künstler eingeben, z.B. Wes Montgomery, Miles Davis..."
                  className="pl-10 h-12 text-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !searchQuery.trim()}
                className="h-12 px-6 gap-2"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Suche...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Recherchieren
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Music className="w-6 h-6 text-accent" />
                    {result.artist}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {result.overview}
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Phases */}
              {result.phases && result.phases.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Schaffensphasen</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {result.phases.map((phase, idx) => (
                        <div key={idx} className="p-4 rounded-lg bg-secondary/50 border border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{phase.name}</span>
                            <Badge variant="outline">{phase.period}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{phase.description}</p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Klangqualität:</span>{" "}
                            <span className="text-foreground">{phase.audioQuality}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlbumIcon className="w-5 h-5" />
                    Top Empfehlungen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="0" className="w-full">
                    <TabsList className="w-full justify-start overflow-x-auto">
                      {result.topRecommendations.map((album, idx) => (
                        <TabsTrigger key={idx} value={String(idx)} className="gap-2">
                          <span className="font-bold text-accent">#{album.rank}</span>
                          <span className="hidden sm:inline truncate max-w-[150px]">{album.album}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {result.topRecommendations.map((album, idx) => (
                      <TabsContent key={idx} value={String(idx)} className="mt-4">
                        <div className="space-y-4">
                          {/* Album Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-secondary to-muted flex items-center justify-center flex-shrink-0">
                              <Disc3 className="w-10 h-10 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-bold">{album.album}</h3>
                              <p className="text-muted-foreground">{album.artist} • {album.year} • {album.label}</p>
                              {album.phase && (
                                <Badge variant="outline" className="mt-2">{album.phase}</Badge>
                              )}
                              <div className="flex items-center gap-4 mt-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-muted-foreground">Musik:</span>
                                  <div className="flex">{getRatingStars(album.musicalRating)}</div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-muted-foreground">Klang:</span>
                                  <div className="flex">{getRatingStars(album.soundRating)}</div>
                                </div>
                              </div>
                            </div>
                            <Button onClick={() => addToWishlist(album)} className="gap-2 flex-shrink-0">
                              <Plus className="w-4 h-4" />
                              Wunschliste
                            </Button>
                          </div>

                          {/* Description */}
                          <p className="text-sm">{album.description}</p>
                          {album.notes && (
                            <p className="text-sm text-muted-foreground italic">{album.notes}</p>
                          )}

                          {/* Best Pressings */}
                          {album.bestPressings && album.bestPressings.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                Empfohlene Pressungen
                              </h4>
                              <ScrollArea className="max-h-[300px]">
                                <div className="space-y-2">
                                  {album.bestPressings.map((pressing, pIdx) => (
                                    <div 
                                      key={pIdx} 
                                      className={`p-3 rounded-lg border ${
                                        pressing.avoid 
                                          ? 'bg-destructive/5 border-destructive/30' 
                                          : 'bg-secondary/30 border-border'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium">{pressing.label}</span>
                                          {pressing.catalogNumber && (
                                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                              {pressing.catalogNumber}
                                            </code>
                                          )}
                                          {pressing.year && (
                                            <span className="text-xs text-muted-foreground">{pressing.year}</span>
                                          )}
                                          {pressing.country && (
                                            <span className="text-xs text-muted-foreground">({pressing.country})</span>
                                          )}
                                        </div>
                                        {pressing.avoid ? (
                                          <Badge variant="outline" className="border-destructive/50 text-destructive gap-1">
                                            <XCircle className="w-3 h-3" />
                                            Vermeiden
                                          </Badge>
                                        ) : (
                                          getQualityBadge(pressing.quality)
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">{pressing.notes}</p>
                                      {pressing.matrixInfo && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Matrix: <code className="bg-muted px-1 rounded">{pressing.matrixInfo}</code>
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>

              {/* Buying Tips & Avoid Labels */}
              <div className="grid gap-4 md:grid-cols-2">
                {result.buyingTips && result.buyingTips.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        Kauftipps
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.buyingTips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {result.avoidLabels && result.avoidLabels.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-destructive" />
                        Zu vermeiden
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {result.avoidLabels.map((label, idx) => (
                          <Badge key={idx} variant="outline" className="border-destructive/50 text-destructive">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!result && !isSearching && !error && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Künstler recherchieren</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Gib den Namen eines Künstlers ein, um audiophile Empfehlungen mit den besten Pressungen zu erhalten.
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
