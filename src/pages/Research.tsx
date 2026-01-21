import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  XCircle,
  FileDown,
  DollarSign,
  ExternalLink,
  RefreshCw,
  User,
  Clock,
  Trash2,
  WifiOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAudiophileProfile } from "@/context/AudiophileProfileContext";
import { AudiophileProfileEditor } from "@/components/AudiophileProfileEditor";
import { ArtistResearchResult, AlbumRecommendation } from "@/types/audiophileProfile";
import { useRecords } from "@/context/RecordContext";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import { AlternativeReleases } from "@/components/AlternativeReleases";
import { AlternativeRelease, CriticReview, RecordRecommendation } from "@/types/record";
import { useResearchCache } from "@/hooks/useResearchCache";
import { CompactAlbumCard } from "@/components/research/CompactAlbumCard";
import { ExpandedPressingDetails } from "@/components/research/ExpandedPressingDetails";
import { QuickScanButton } from "@/components/research/QuickScanButton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PressingPrice {
  releaseId?: number;
  lowestPrice?: number;
  lowestTotalPrice?: number;
  numForSale: number;
  currency: string;
  releaseUrl?: string;
  loading: boolean;
  error?: string;
}

interface AlbumSearchResult {
  artist: string;
  album: string;
  year: number;
  genre: string[];
  label: string;
  catalogNumber: string;
  formatDetails: string;
  pressing: string;
  tags: string[];
  personalNotes: string;
  audiophileAssessment: string;
  artisticAssessment: string;
  recordingQuality: number;
  masteringQuality: number;
  artisticRating: number;
  criticScore: number;
  criticReviews: CriticReview[];
  vinylRecommendation: "must-have" | "nice-to-have" | "stream-instead";
  recommendationReason: string;
  recommendations: RecordRecommendation[];
  alternativeReleases?: AlternativeRelease[];
  coverArt?: string;
}

export default function Research() {
  const [searchMode, setSearchMode] = useState<"artist" | "album">("album");
  const [searchQuery, setSearchQuery] = useState("");
  const [albumQuery, setAlbumQuery] = useState("");
  const [labelQuery, setLabelQuery] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isScanLoading, setIsScanLoading] = useState(false);
  const [result, setResult] = useState<ArtistResearchResult | null>(null);
  const [albumResult, setAlbumResult] = useState<AlbumSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [pressingPrices, setPressingPrices] = useState<Record<string, PressingPrice>>({});
  const [expandedAlbumIndex, setExpandedAlbumIndex] = useState<number | null>(null);
  const { profile, hasProfile } = useAudiophileProfile();
  const { addRecord } = useRecords();
  const cache = useResearchCache();

  // Handle barcode/catalog scan
  const handleBarcodeDetected = useCallback(async (barcode: string) => {
    setIsScanLoading(true);
    setError(null);
    setCatalogQuery(barcode);
    setSearchMode("album");
    
    // Auto-search with barcode
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Nicht angemeldet");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-record`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            barcode,
            format: profile?.mediaFormat === 'cd' ? 'cd' : 'vinyl',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Fehler: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setAlbumResult(data);
      setSearchQuery(data.artist || "");
      setAlbumQuery(data.album || "");
      setLabelQuery(data.label || "");
      
      // Cache the result
      cache.setAlbumCache(data.artist, data.album, data.label, barcode, data);

      toast({ title: "Album gefunden", description: `${data.artist} - ${data.album}` });
    } catch (err: any) {
      setError(err.message || "Scan fehlgeschlagen");
    } finally {
      setIsScanLoading(false);
    }
  }, [profile?.mediaFormat, cache]);

  // Handle image capture (label/cover photo)
  const handleImageCaptured = useCallback(async (imageBase64: string) => {
    setIsScanLoading(true);
    setError(null);
    setSearchMode("album");
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Nicht angemeldet");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-record`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            labelImage: imageBase64,
            format: profile?.mediaFormat === 'cd' ? 'cd' : 'vinyl',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Fehler: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setAlbumResult(data);
      setSearchQuery(data.artist || "");
      setAlbumQuery(data.album || "");
      setLabelQuery(data.label || "");
      setCatalogQuery(data.catalogNumber || "");

      toast({ title: "Album erkannt", description: `${data.artist} - ${data.album}` });
    } catch (err: any) {
      setError(err.message || "Bild-Analyse fehlgeschlagen");
    } finally {
      setIsScanLoading(false);
    }
  }, [profile?.mediaFormat]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    // Check cache first
    const cached = cache.getArtistCache(searchQuery);
    if (cached) {
      setResult(cached);
      toast({ title: "Aus Cache geladen", description: searchQuery });
      return;
    }

    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Nicht angemeldet. Bitte erneut einloggen.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/artist-research`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ artist: searchQuery, profile }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error("Rate-Limit erreicht. Bitte versuche es in einer Minute erneut.");
        }
        throw new Error(errorData.error || `Fehler: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setResult(data);
      cache.setArtistCache(searchQuery, data);
      
      setPressingPrices({});
      
      // Auto-fetch prices for first pressing of each album
      if (data.topRecommendations) {
        data.topRecommendations.forEach((album: AlbumRecommendation, idx: number) => {
          const firstPressing = album.bestPressings?.find(p => !p.avoid && p.catalogNumber);
          if (firstPressing) {
            fetchPressingPrice(album.artist, album.album, firstPressing.catalogNumber!, firstPressing.label, `${album.rank}-0`);
          }
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("Zeitüberschreitung - bitte erneut versuchen.");
      } else {
        setError(err.message || "Ein Fehler ist aufgetreten");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleAlbumSearch = async () => {
    if (!albumQuery.trim()) return;

    // Check cache
    const cached = cache.getAlbumCache(searchQuery, albumQuery, labelQuery, catalogQuery);
    if (cached) {
      setAlbumResult(cached);
      toast({ title: "Aus Cache geladen" });
      return;
    }

    setIsSearching(true);
    setError(null);
    setAlbumResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const searchText = `${searchQuery.trim()} ${albumQuery.trim()}`.trim();
      const requestBody: any = {
        searchText,
        format: profile?.mediaFormat === 'cd' ? 'cd' : 'vinyl',
      };

      if (labelQuery.trim()) requestBody.label = labelQuery.trim();
      if (catalogQuery.trim()) requestBody.catalogNumber = catalogQuery.trim();

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Nicht angemeldet.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-record`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Fehler: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setAlbumResult(data);
      cache.setAlbumCache(searchQuery, albumQuery, labelQuery, catalogQuery, data);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("Zeitüberschreitung - bitte erneut versuchen.");
      } else {
        setError(err.message || "Ein Fehler ist aufgetreten");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const fetchPressingPrice = async (artist: string, album: string, catalogNumber: string, label: string, key: string) => {
    // Check cache
    const cached = cache.getPriceCache(artist, album, catalogNumber);
    if (cached) {
      setPressingPrices(prev => ({ ...prev, [key]: { ...cached, loading: false } }));
      return;
    }

    setPressingPrices(prev => ({
      ...prev,
      [key]: { loading: true, numForSale: 0, currency: 'CHF' }
    }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discogs-marketplace`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ artist, album, catalogNumber }),
        }
      );

      const result = await response.json();
      
      if (result.data) {
        const priceData = {
          releaseId: result.data.releaseId,
          lowestPrice: result.data.lowestPrice,
          lowestTotalPrice: result.data.lowestTotalPrice,
          numForSale: result.data.numForSale || 0,
          currency: result.data.currency || 'CHF',
          releaseUrl: result.data.releaseUrl,
          loading: false
        };
        setPressingPrices(prev => ({ ...prev, [key]: priceData }));
        cache.setPriceCache(artist, album, catalogNumber, priceData);
      } else {
        setPressingPrices(prev => ({
          ...prev,
          [key]: { loading: false, numForSale: 0, currency: 'CHF', error: 'Nicht gefunden' }
        }));
      }
    } catch (err) {
      setPressingPrices(prev => ({
        ...prev,
        [key]: { loading: false, numForSale: 0, currency: 'CHF', error: 'Fehler' }
      }));
    }
  };

  const addToWishlist = (album: AlbumRecommendation) => {
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

    toast({ title: "Zur Wunschliste hinzugefügt", description: `${album.artist} - ${album.album}` });
  };

  const addAlbumToWishlist = (result: AlbumSearchResult) => {
    addRecord({
      artist: result.artist,
      album: result.album,
      year: result.year,
      genre: result.genre,
      label: result.label,
      catalogNumber: result.catalogNumber,
      format: profile?.mediaFormat === 'cd' ? 'cd' : 'vinyl',
      status: "wishlist",
      myRating: result.artisticRating || 0,
      personalNotes: result.personalNotes,
      tags: result.tags,
      isFavorite: false,
      coverArt: result.coverArt,
      vinylRecommendation: result.vinylRecommendation,
      recommendationReason: result.recommendationReason,
      audiophileAssessment: result.audiophileAssessment,
      artisticAssessment: result.artisticAssessment,
      recordingQuality: result.recordingQuality,
      masteringQuality: result.masteringQuality,
      criticScore: result.criticScore,
      criticReviews: result.criticReviews,
    });

    toast({ title: "Zur Wunschliste hinzugefügt", description: `${result.artist} - ${result.album}` });
  };

  const getRatingStars = (rating: number) => (
    <div className="flex gap-0.5">
      {Array(5).fill(0).map((_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < rating ? 'star-filled' : 'star-empty'}`} />
      ))}
    </div>
  );

  const getRecommendationBadge = (rec: string) => {
    const styles = {
      "must-have": "bg-green-500/20 text-green-400 border-green-500/30",
      "nice-to-have": "bg-accent/20 text-accent border-accent/30",
      "stream-instead": "bg-muted text-muted-foreground border-border",
    };
    const labels = {
      "must-have": "Must-Have",
      "nice-to-have": "Nice-to-Have",
      "stream-instead": "Streamen",
    };
    return (
      <Badge variant="outline" className={styles[rec as keyof typeof styles] || styles["stream-instead"]}>
        {labels[rec as keyof typeof labels] || rec}
      </Badge>
    );
  };

  const recentSearches = cache.getRecentSearches();

  return (
    <div className="space-y-4 pb-20">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">Recherche</h1>
          <p className="text-sm text-muted-foreground">
            Scan, suche & prüfe Pressungen
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Cache indicator */}
          {cache.cacheStats.albumCount > 0 && (
            <Badge variant="secondary" className="text-xs gap-1">
              <WifiOff className="w-3 h-3" />
              {cache.cacheStats.albumCount + cache.cacheStats.artistCount}
            </Badge>
          )}
          
          <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Settings2 className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Audiophiles Profil</DialogTitle>
              </DialogHeader>
              <AudiophileProfileEditor compact onClose={() => setShowProfileDialog(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Scan Section - Primary for store use */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <QuickScanButton
              onBarcodeDetected={handleBarcodeDetected}
              onImageCaptured={handleImageCaptured}
              isLoading={isScanLoading}
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Platte scannen</p>
              <p className="text-xs text-muted-foreground">
                EAN, Label-Foto oder Hülle fotografieren
              </p>
            </div>
            {isScanLoading && (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search Tabs */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as "artist" | "album")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-9 mb-4">
              <TabsTrigger value="album" className="gap-1.5 text-xs">
                <Disc3 className="w-3.5 h-3.5" />
                Pressung prüfen
              </TabsTrigger>
              <TabsTrigger value="artist" className="gap-1.5 text-xs">
                <User className="w-3.5 h-3.5" />
                Künstler
              </TabsTrigger>
            </TabsList>

            {/* Album/Pressing Search - Compact */}
            <TabsContent value="album" className="mt-0 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Künstler"
                  className="h-10 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Input
                  placeholder="Album *"
                  className="h-10 text-sm"
                  value={albumQuery}
                  onChange={(e) => setAlbumQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAlbumSearch()}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Label"
                  className="h-10 text-sm"
                  value={labelQuery}
                  onChange={(e) => setLabelQuery(e.target.value)}
                />
                <Input
                  placeholder="Katalog-Nr."
                  className="h-10 text-sm font-mono"
                  value={catalogQuery}
                  onChange={(e) => setCatalogQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAlbumSearch()}
                />
              </div>
              <Button 
                onClick={handleAlbumSearch} 
                disabled={isSearching || !albumQuery.trim()}
                className="w-full h-10 gap-2"
              >
                {isSearching && searchMode === "album" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analysiere...</>
                ) : (
                  <><Search className="w-4 h-4" /> Prüfen</>
                )}
              </Button>
            </TabsContent>

            {/* Artist Search */}
            <TabsContent value="artist" className="mt-0 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Künstler, z.B. Miles Davis"
                  className="h-10 text-sm flex-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching || !searchQuery.trim()}
                  className="h-10 px-4"
                >
                  {isSearching && searchMode === "artist" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recent Searches */}
      {recentSearches.length > 0 && !result && !albumResult && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {recentSearches.map((s, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="cursor-pointer whitespace-nowrap text-xs"
              onClick={() => {
                if (s.type === "artist") {
                  setSearchQuery(s.query);
                  setSearchMode("artist");
                } else {
                  const [artist, album] = s.query.split(" - ");
                  setSearchQuery(artist || "");
                  setAlbumQuery(album || s.query);
                  setSearchMode("album");
                }
              }}
            >
              {s.query}
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={cache.clearCache}
          >
            <Trash2 className="w-3 h-3 text-muted-foreground" />
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Artist Research Results - Compact */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Artist Header - Compact */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Music className="w-5 h-5 text-accent flex-shrink-0" />
                      <span className="truncate">{result.artist}</span>
                    </CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <FileDown className="w-4 h-4" />
                  </Button>
                </div>
                <CardDescription className="text-sm mt-2 line-clamp-3">
                  {result.overview}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Compact Album List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground px-1">
                Top Empfehlungen
              </h3>
              {result.topRecommendations.map((album, idx) => (
                <div key={idx}>
                  <CompactAlbumCard
                    album={album}
                    onAddToWishlist={() => addToWishlist(album)}
                    onExpand={() => setExpandedAlbumIndex(expandedAlbumIndex === idx ? null : idx)}
                    priceData={pressingPrices[`${album.rank}-0`]}
                    isExpanded={expandedAlbumIndex === idx}
                  />
                  <AnimatePresence>
                    {expandedAlbumIndex === idx && (
                      <ExpandedPressingDetails
                        album={album}
                        onAddToWishlist={() => addToWishlist(album)}
                        pressingPrices={pressingPrices}
                        onFetchPrice={(cat, label, key) => fetchPressingPrice(album.artist, album.album, cat, label, key)}
                        albumIndex={album.rank}
                      />
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Quick Tips */}
            {(result.buyingTips?.length > 0 || result.avoidLabels?.length > 0) && (
              <div className="grid gap-3 grid-cols-2">
                {result.buyingTips?.length > 0 && (
                  <Card className="col-span-1">
                    <CardContent className="py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-medium">Tipps</span>
                      </div>
                      <ul className="space-y-1">
                        {result.buyingTips.slice(0, 3).map((tip, i) => (
                          <li key={i} className="text-xs text-muted-foreground line-clamp-2">
                            • {tip}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                {result.avoidLabels?.length > 0 && (
                  <Card className="col-span-1">
                    <CardContent className="py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-destructive" />
                        <span className="text-xs font-medium">Vermeiden</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {result.avoidLabels.map((label, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Album Search Results - Compact */}
      <AnimatePresence mode="wait">
        {albumResult && searchMode === "album" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Album Header with Cover */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex gap-4">
                  {/* Cover */}
                  {albumResult.coverArt ? (
                    <img
                      src={albumResult.coverArt}
                      alt={albumResult.album}
                      className="w-24 h-24 rounded-lg object-cover shadow-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <Disc3 className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-lg truncate">{albumResult.album}</h2>
                    <p className="text-sm text-muted-foreground truncate">
                      {albumResult.artist} · {albumResult.year}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {albumResult.label} {albumResult.catalogNumber && `[${albumResult.catalogNumber}]`}
                    </p>

                    {/* Ratings */}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">Art:</span>
                        {getRatingStars(albumResult.artisticRating)}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">Klang:</span>
                        {getRatingStars(albumResult.masteringQuality)}
                      </div>
                    </div>

                    {/* Recommendation Badge */}
                    <div className="mt-2">
                      {getRecommendationBadge(albumResult.vinylRecommendation)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assessments - Compact */}
            <Card>
              <CardContent className="py-3 space-y-3">
                {albumResult.audiophileAssessment && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Audiophile Bewertung</p>
                    <p className="text-sm line-clamp-3">{albumResult.audiophileAssessment}</p>
                  </div>
                )}
                {albumResult.recommendationReason && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Empfehlung</p>
                    <p className="text-sm line-clamp-2">{albumResult.recommendationReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alternative Releases */}
            {albumResult.alternativeReleases && albumResult.alternativeReleases.length > 0 && (
              <Card>
                <CardHeader className="py-3 pb-2">
                  <CardTitle className="text-sm">Alternative Pressungen</CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-3">
                  <ScrollArea className="max-h-48">
                    <AlternativeReleases
                      releases={albumResult.alternativeReleases}
                      onSelect={(release) => {
                        if (release.label) setLabelQuery(release.label);
                        if (release.catalogNumber) setCatalogQuery(release.catalogNumber);
                        toast({ title: "Pressung ausgewählt", description: `${release.catalogNumber}` });
                      }}
                    />
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Add to Wishlist */}
            <Button
              onClick={() => addAlbumToWishlist(albumResult)}
              className="w-full h-12 gap-2"
            >
              <Plus className="w-5 h-5" />
              Zur Wunschliste hinzufügen
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!result && !albumResult && !isSearching && !isScanLoading && (
        <div className="text-center py-12">
          <Disc3 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">
            Scanne eine Platte oder suche nach Künstler/Album
          </p>
        </div>
      )}
    </div>
  );
}
