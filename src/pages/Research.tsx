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
  XCircle,
  FileDown,
  DollarSign,
  ExternalLink,
  RefreshCw,
  User,
  Award,
  Headphones,
  ThumbsUp,
  BookOpen
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
  const [searchMode, setSearchMode] = useState<"artist" | "album">("artist");
  const [searchQuery, setSearchQuery] = useState("");
  const [albumQuery, setAlbumQuery] = useState("");
  const [labelQuery, setLabelQuery] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<ArtistResearchResult | null>(null);
  const [albumResult, setAlbumResult] = useState<AlbumSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [pressingPrices, setPressingPrices] = useState<Record<string, PressingPrice>>({});
  const { profile, hasProfile } = useAudiophileProfile();
  const { addRecord } = useRecords();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 Sekunden Timeout

      // Get the current session for authentication
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
        if (response.status === 402) {
          throw new Error("Credits aufgebraucht. Bitte Workspace aufladen.");
        }
        throw new Error(errorData.error || `Fehler: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setResult(data);
      
      // Reset prices and fetch for all pressings
      setPressingPrices({});
      
      // Auto-fetch prices for all recommended pressings
      if (data.topRecommendations) {
        data.topRecommendations.forEach((album: AlbumRecommendation) => {
          album.bestPressings?.forEach((pressing, pIdx) => {
            if (!pressing.avoid && pressing.catalogNumber) {
              const key = `${album.rank}-${pIdx}`;
              fetchPressingPrice(album.artist, album.album, pressing.catalogNumber, pressing.label, key);
            }
          });
        });
      }
    } catch (err: any) {
      console.error("Research error:", err);
      if (err.name === 'AbortError') {
        setError("Zeitüberschreitung - die KI-Anfrage hat zu lange gedauert. Bitte erneut versuchen.");
      } else {
        setError(err.message || "Ein Fehler ist aufgetreten");
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Album/Pressing Search
  const handleAlbumSearch = async () => {
    if (!albumQuery.trim()) return;

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

      if (labelQuery.trim()) {
        requestBody.label = labelQuery.trim();
      }
      if (catalogQuery.trim()) {
        requestBody.catalogNumber = catalogQuery.trim();
      }

      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Nicht angemeldet. Bitte erneut einloggen.");
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
        if (response.status === 429) {
          throw new Error("Rate-Limit erreicht. Bitte versuche es in einer Minute erneut.");
        }
        if (response.status === 402) {
          throw new Error("Credits aufgebraucht. Bitte Workspace aufladen.");
        }
        throw new Error(errorData.error || `Fehler: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setAlbumResult(data);
    } catch (err: any) {
      console.error("Album search error:", err);
      if (err.name === 'AbortError') {
        setError("Zeitüberschreitung - die KI-Anfrage hat zu lange gedauert. Bitte erneut versuchen.");
      } else {
        setError(err.message || "Ein Fehler ist aufgetreten");
      }
    } finally {
      setIsSearching(false);
    }
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

    toast({
      title: "Zur Wunschliste hinzugefügt",
      description: `${result.artist} - ${result.album}`,
    });
  };

  const handleSelectAlternative = (release: AlternativeRelease) => {
    if (!albumResult) return;
    
    // Update search fields with alternative release info
    if (release.label) setLabelQuery(release.label);
    if (release.catalogNumber) setCatalogQuery(release.catalogNumber);
    
    toast({
      title: "Pressung ausgewählt",
      description: `${release.label || ''} ${release.catalogNumber ? `[${release.catalogNumber}]` : ''} ${release.year || ''}`,
    });
  };

  const fetchPressingPrice = async (artist: string, album: string, catalogNumber: string, label: string, key: string) => {
    setPressingPrices(prev => ({
      ...prev,
      [key]: { loading: true, numForSale: 0, currency: 'CHF' }
    }));

    try {
      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discogs-marketplace`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            artist, 
            album, 
            catalogNumber 
          }),
        }
      );

      const result = await response.json();
      
      if (result.data) {
        setPressingPrices(prev => ({
          ...prev,
          [key]: {
            releaseId: result.data.releaseId,
            lowestPrice: result.data.lowestPrice,
            lowestTotalPrice: result.data.lowestTotalPrice,
            numForSale: result.data.numForSale || 0,
            currency: result.data.currency || 'CHF',
            releaseUrl: result.data.releaseUrl,
            loading: false
          }
        }));
      } else {
        setPressingPrices(prev => ({
          ...prev,
          [key]: {
            loading: false,
            numForSale: 0,
            currency: 'CHF',
            error: 'Nicht gefunden'
          }
        }));
      }
    } catch (err) {
      console.error('Price fetch error:', err);
      setPressingPrices(prev => ({
        ...prev,
        [key]: {
          loading: false,
          numForSale: 0,
          currency: 'CHF',
          error: 'Fehler'
        }
      }));
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

  const exportToPDF = () => {
    if (!result) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = margin;

    const checkPageBreak = (height: number) => {
      if (y + height > pageHeight - 30) {
        doc.addPage();
        y = margin;
      }
    };

    // Title
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(result.artist, margin, y);
    y += 12;

    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100);
    doc.text("Vinyl-Recherche", margin, y);
    doc.setTextColor(0);
    y += 15;

    // Overview
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Übersicht", margin, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const overviewLines = doc.splitTextToSize(result.overview, pageWidth - 2 * margin);
    checkPageBreak(overviewLines.length * 5);
    doc.text(overviewLines, margin, y);
    y += overviewLines.length * 5 + 10;

    // Phases
    if (result.phases && result.phases.length > 0) {
      checkPageBreak(20);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Schaffensphasen", margin, y);
      y += 8;

      result.phases.forEach((phase) => {
        checkPageBreak(25);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${phase.name} (${phase.period})`, margin, y);
        y += 5;
        
        doc.setFont("helvetica", "normal");
        const phaseLines = doc.splitTextToSize(phase.description, pageWidth - 2 * margin);
        doc.text(phaseLines, margin, y);
        y += phaseLines.length * 4 + 3;
        
        doc.setFont("helvetica", "italic");
        doc.text(`Klangqualität: ${phase.audioQuality}`, margin, y);
        y += 8;
      });
      y += 5;
    }

    // Top Recommendations
    checkPageBreak(20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Top Vinyl-Empfehlungen", margin, y);
    y += 10;

    result.topRecommendations.forEach((album) => {
      checkPageBreak(40);
      
      // Album header
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`#${album.rank} ${album.album}`, margin, y);
      y += 5;
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`${album.artist} • ${album.year} • ${album.label}`, margin, y);
      y += 5;
      
      doc.text(`Musik: ${"★".repeat(album.musicalRating)}${"☆".repeat(5 - album.musicalRating)}  Klang: ${"★".repeat(album.soundRating)}${"☆".repeat(5 - album.soundRating)}`, margin, y);
      y += 6;

      const descLines = doc.splitTextToSize(album.description, pageWidth - 2 * margin);
      checkPageBreak(descLines.length * 4);
      doc.text(descLines, margin, y);
      y += descLines.length * 4 + 5;

      // Pressings
      if (album.bestPressings && album.bestPressings.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("Empfohlene Vinyl-Pressungen:", margin, y);
        y += 5;

        album.bestPressings.forEach((pressing) => {
          checkPageBreak(20);
          doc.setFont("helvetica", "normal");
          
          const qualityLabels: Record<string, string> = {
            reference: "REFERENZ",
            excellent: "Exzellent", 
            good: "Gut",
            acceptable: "Akzeptabel"
          };
          
          const pressingHeader = `• ${pressing.label}${pressing.catalogNumber ? ` [${pressing.catalogNumber}]` : ""} - ${qualityLabels[pressing.quality] || pressing.quality}`;
          doc.text(pressingHeader, margin + 3, y);
          y += 4;
          
          if (pressing.year || pressing.country) {
            doc.setFontSize(8);
            doc.text(`  ${pressing.year || ""} ${pressing.country ? `(${pressing.country})` : ""}`, margin + 3, y);
            y += 4;
          }
          
          if (pressing.notes) {
            doc.setFontSize(8);
            const noteLines = doc.splitTextToSize(pressing.notes, pageWidth - 2 * margin - 10);
            doc.text(noteLines, margin + 6, y);
            y += noteLines.length * 3.5 + 2;
          }
          
          if (pressing.matrixInfo) {
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.text(`  Matrix: ${pressing.matrixInfo}`, margin + 3, y);
            doc.setFont("helvetica", "normal");
            y += 4;
          }
        });
      }
      y += 8;
    });

    // Buying Tips
    if (result.buyingTips && result.buyingTips.length > 0) {
      checkPageBreak(20);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Kauftipps", margin, y);
      y += 8;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      result.buyingTips.forEach((tip) => {
        checkPageBreak(10);
        const tipLines = doc.splitTextToSize(`• ${tip}`, pageWidth - 2 * margin);
        doc.text(tipLines, margin, y);
        y += tipLines.length * 4 + 2;
      });
      y += 5;
    }

    // Avoid Labels
    if (result.avoidLabels && result.avoidLabels.length > 0) {
      checkPageBreak(15);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Zu vermeiden", margin, y);
      y += 8;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(result.avoidLabels.join(", "), margin, y);
      y += 10;
    }

    // Footer on each page
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150);
      doc.text("SONORIUM", pageWidth / 2, pageHeight - 10, { align: "center" });
      doc.text(`Seite ${i} von ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
      doc.setTextColor(0);
    }

    // Save
    const filename = `${result.artist.replace(/[^a-zA-Z0-9]/g, "_")}_Vinyl_Recherche.pdf`;
    doc.save(filename);

    toast({
      title: "PDF exportiert",
      description: filename,
    });
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

        {/* Search Mode Tabs */}
        <Card>
          <CardContent className="pt-6">
            <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as "artist" | "album")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="artist" className="gap-2">
                  <User className="w-4 h-4" />
                  Künstler-Recherche
                </TabsTrigger>
                <TabsTrigger value="album" className="gap-2">
                  <Disc3 className="w-4 h-4" />
                  Album/Pressung prüfen
                </TabsTrigger>
              </TabsList>

              {/* Artist Search */}
              <TabsContent value="artist" className="mt-0">
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
                    {isSearching && searchMode === "artist" ? (
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
                <p className="text-xs text-muted-foreground mt-2">
                  Suche nach einem Künstler, um eine umfassende Übersicht über die besten Alben und Pressungen zu erhalten.
                </p>
              </TabsContent>

              {/* Album/Pressing Search */}
              <TabsContent value="album" className="mt-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Künstler (optional)"
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <AlbumIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Album *"
                      className="pl-10"
                      value={albumQuery}
                      onChange={(e) => setAlbumQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAlbumSearch()}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Label (optional)"
                      className="pl-10"
                      value={labelQuery}
                      onChange={(e) => setLabelQuery(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Disc3 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Katalognummer (optional)"
                      className="pl-10"
                      value={catalogQuery}
                      onChange={(e) => setCatalogQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAlbumSearch()}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={handleAlbumSearch} 
                    disabled={isSearching || !albumQuery.trim()}
                    className="h-10 px-6 gap-2"
                  >
                    {isSearching && searchMode === "album" ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analysiere...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Pressung prüfen
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Gib Album-Details ein, um eine vollständige audiophile Beurteilung inkl. alternativer Pressungen zu erhalten.
                </p>
              </TabsContent>
            </Tabs>
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
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-3">
                        <Music className="w-6 h-6 text-accent" />
                        {result.artist}
                      </CardTitle>
                      <Badge variant="outline" className="mt-2">Vinyl-Recherche</Badge>
                    </div>
                    <Button variant="outline" onClick={exportToPDF} className="gap-2">
                      <FileDown className="w-4 h-4" />
                      PDF Export
                    </Button>
                  </div>
                  <CardDescription className="text-base mt-3">
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
                                Empfohlene Pressungen mit Discogs-Preisen
                              </h4>
                              <ScrollArea className="max-h-[400px]">
                                <div className="space-y-3">
                                  {album.bestPressings.map((pressing, pIdx) => {
                                    const priceKey = `${album.rank}-${pIdx}`;
                                    const priceData = pressingPrices[priceKey];
                                    
                                    return (
                                      <div 
                                        key={pIdx} 
                                        className={`p-4 rounded-lg border ${
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
                                        
                                        {/* Discogs Price Section */}
                                        {!pressing.avoid && pressing.catalogNumber && (
                                          <div className="mt-3 pt-3 border-t border-border/50">
                                            {priceData?.loading ? (
                                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                Preise werden geladen...
                                              </div>
                                            ) : priceData?.error ? (
                                              <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">
                                                  Preis nicht verfügbar
                                                </span>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 px-2 text-xs"
                                                  onClick={() => fetchPressingPrice(
                                                    album.artist, 
                                                    album.album, 
                                                    pressing.catalogNumber!, 
                                                    pressing.label,
                                                    priceKey
                                                  )}
                                                >
                                                  <RefreshCw className="w-3 h-3 mr-1" />
                                                  Erneut suchen
                                                </Button>
                                              </div>
                                            ) : priceData ? (
                                              <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex items-center gap-3">
                                                  {priceData.lowestPrice != null && (
                                                    <div className="flex items-center gap-1.5">
                                                      <DollarSign className="w-4 h-4 text-green-500" />
                                                      <span className="font-semibold text-green-500">
                                                        ab {priceData.lowestPrice.toFixed(0)} {priceData.currency}
                                                      </span>
                                                      {priceData.lowestTotalPrice != null && priceData.lowestTotalPrice !== priceData.lowestPrice && (
                                                        <span className="text-xs text-muted-foreground">
                                                          (+ Versand = ~{priceData.lowestTotalPrice.toFixed(0)} {priceData.currency})
                                                        </span>
                                                      )}
                                                    </div>
                                                  )}
                                                  <Badge variant="secondary" className="text-xs">
                                                    {priceData.numForSale} verfügbar
                                                  </Badge>
                                                </div>
                                                {priceData.releaseUrl && (
                                                  <a
                                                    href={priceData.releaseUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                                                  >
                                                    Auf Discogs ansehen
                                                    <ExternalLink className="w-3 h-3" />
                                                  </a>
                                                )}
                                              </div>
                                            ) : (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-xs"
                                                onClick={() => fetchPressingPrice(
                                                  album.artist, 
                                                  album.album, 
                                                  pressing.catalogNumber!, 
                                                  pressing.label,
                                                  priceKey
                                                )}
                                              >
                                                <DollarSign className="w-3 h-3 mr-1" />
                                                Preis abrufen
                                              </Button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
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

        {/* Album Search Results */}
        <AnimatePresence mode="wait">
          {albumResult && searchMode === "album" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Album Header */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {albumResult.coverArt ? (
                      <img 
                        src={albumResult.coverArt} 
                        alt={albumResult.album} 
                        className="w-32 h-32 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-secondary to-muted flex items-center justify-center flex-shrink-0">
                        <Disc3 className="w-16 h-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-2xl">{albumResult.album}</CardTitle>
                          <p className="text-lg text-muted-foreground">{albumResult.artist}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="outline">{albumResult.year}</Badge>
                            {albumResult.label && <Badge variant="secondary">{albumResult.label}</Badge>}
                            {albumResult.catalogNumber && (
                              <Badge variant="outline" className="font-mono">
                                {albumResult.catalogNumber}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button onClick={() => addAlbumToWishlist(albumResult)} className="gap-2 flex-shrink-0">
                          <Plus className="w-4 h-4" />
                          Wunschliste
                        </Button>
                      </div>
                      {albumResult.genre && albumResult.genre.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {albumResult.genre.map((g, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {g}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Vinyl Recommendation */}
              <Card className={
                albumResult.vinylRecommendation === 'must-have' 
                  ? 'border-green-500/50 bg-green-500/5' 
                  : albumResult.vinylRecommendation === 'nice-to-have'
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-muted'
              }>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {albumResult.vinylRecommendation === 'must-have' ? (
                      <>
                        <Award className="w-5 h-5 text-green-500" />
                        <span className="text-green-500">Must-Have auf Vinyl</span>
                      </>
                    ) : albumResult.vinylRecommendation === 'nice-to-have' ? (
                      <>
                        <ThumbsUp className="w-5 h-5 text-amber-500" />
                        <span className="text-amber-500">Nice-to-Have auf Vinyl</span>
                      </>
                    ) : (
                      <>
                        <Headphones className="w-5 h-5 text-muted-foreground" />
                        <span>Streaming empfohlen</span>
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{albumResult.recommendationReason}</p>
                </CardContent>
              </Card>

              {/* Ratings */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-accent">{albumResult.artisticRating}/5</div>
                      <div className="flex justify-center mt-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < albumResult.artisticRating ? 'fill-accent text-accent' : 'text-muted-foreground/30'}`} 
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Künstlerische Bewertung</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{albumResult.recordingQuality}/5</div>
                      <div className="flex justify-center mt-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < albumResult.recordingQuality ? 'fill-blue-400 text-blue-400' : 'text-muted-foreground/30'}`} 
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Aufnahmequalität</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{albumResult.masteringQuality}/5</div>
                      <div className="flex justify-center mt-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < albumResult.masteringQuality ? 'fill-violet-400 text-violet-400' : 'text-muted-foreground/30'}`} 
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Mastering-Qualität</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-500">{albumResult.criticScore}</div>
                      <div className="text-xs text-muted-foreground mt-2">Kritiker-Score</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Assessments */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Headphones className="w-5 h-5" />
                      Audiophile Beurteilung
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <p className="text-sm whitespace-pre-wrap">{albumResult.audiophileAssessment}</p>
                    </ScrollArea>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Music className="w-5 h-5" />
                      Künstlerische Beurteilung
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <p className="text-sm whitespace-pre-wrap">{albumResult.artisticAssessment}</p>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Critic Reviews */}
              {albumResult.criticReviews && albumResult.criticReviews.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Kritiken</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {albumResult.criticReviews.map((review, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-secondary/30 border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{review.source}</span>
                            {review.score != null && review.maxScore != null && (
                              <Badge variant="secondary">
                                {review.score}/{review.maxScore}
                              </Badge>
                            )}
                          </div>
                          {review.quote && (
                            <p className="text-xs text-muted-foreground italic">"{review.quote}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Alternative Releases */}
              {albumResult.alternativeReleases && albumResult.alternativeReleases.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Disc3 className="w-5 h-5" />
                      Alternative Pressungen
                    </CardTitle>
                    <CardDescription>
                      Wähle eine alternative Pressung aus, um sie zu übernehmen
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AlternativeReleases
                      releases={albumResult.alternativeReleases}
                      onSelect={handleSelectAlternative}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Pressing Details */}
              {albumResult.formatDetails && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pressungs-Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <span className="text-xs text-muted-foreground">Format</span>
                        <p className="text-sm font-medium">{albumResult.formatDetails}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Pressung</span>
                        <p className="text-sm font-medium">{albumResult.pressing}</p>
                      </div>
                    </div>
                    {albumResult.personalNotes && (
                      <div>
                        <span className="text-xs text-muted-foreground">Notizen</span>
                        <p className="text-sm">{albumResult.personalNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {albumResult.recommendations && albumResult.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      Ähnliche Empfehlungen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {albumResult.recommendations.map((rec, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-secondary/30 border border-border">
                          <div className="font-medium text-sm">{rec.album}</div>
                          <div className="text-xs text-muted-foreground">{rec.artist} • {rec.year}</div>
                          <p className="text-xs text-muted-foreground mt-2">{rec.reason}</p>
                          {rec.qualityScore && (
                            <div className="flex gap-0.5 mt-2">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3 h-3 ${i < rec.qualityScore! ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} 
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!result && !albumResult && !isSearching && !error && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchMode === "artist" ? "Künstler recherchieren" : "Album/Pressung prüfen"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {searchMode === "artist" 
                  ? "Gib den Namen eines Künstlers ein, um audiophile Empfehlungen mit den besten Pressungen zu erhalten."
                  : "Gib Album-Details ein, um eine vollständige audiophile Beurteilung inkl. Pressung-Infos und Alternativen zu erhalten."
                }
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
