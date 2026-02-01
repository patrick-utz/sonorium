import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  Link, 
  FileText, 
  Loader2, 
  Plus, 
  AlertTriangle,
  Store,
  TrendingDown,
  TrendingUp,
  Minus,
  Library,
  Heart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useRecords } from "@/context/RecordContext";

const stripDiacritics = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizeForMatch = (s: string) => {
  if (!s) return "";
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // remove (remaster), etc.
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/&/g, " and ")
    .replace(/\bfeat\.?\b|\bft\.?\b/gi, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeArtist = (artist: string) => {
  const a = normalizeForMatch(artist);
  // handle "Last, First"
  const comma = a.match(/^([^,]+),\s*(.+)$/);
  const reordered = comma ? `${comma[2]} ${comma[1]}` : a;
  return reordered.replace(/^the\s+/, "").trim();
};

const normalizeAlbum = (album: string) => normalizeForMatch(album);

const makeKey = (artist: string, album: string) => `${normalizeArtist(artist)}|${normalizeAlbum(album)}`;

interface ExtractedAlbum {
  artist: string;
  album: string;
  year?: number;
  label?: string;
  catalogNumber?: string;
  price?: number;
  currency?: string;
  condition?: string;
  shopName?: string;
  relevanceScore: number;
  matchReason: string;
  inCollection: boolean;
  inWishlist: boolean;
  recommendedPressing?: string;
  discogsPrice?: number;
  priceAssessment?: 'sehr gut' | 'gut' | 'fair' | 'teuer' | 'sehr teuer';
}

interface AnalysisResult {
  shopName: string;
  totalAlbumsFound: number;
  albums: ExtractedAlbum[];
  summary: string;
}

interface ListResearchTabProps {
  onAddToWishlist: (album: {
    artist: string;
    album: string;
    year?: number;
    label?: string;
    catalogNumber?: string;
    shopName?: string;
    price?: number;
    personalNotes?: string;
  }) => void;
}

export function ListResearchTab({ onAddToWishlist }: ListResearchTabProps) {
  const [inputMode, setInputMode] = useState<'url' | 'file' | 'text'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [shopOverride, setShopOverride] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { records } = useRecords();

  // Extra safety: derive owned/wishlist flags from local record state as well,
  // so already-owned albums never appear and wishlist state is consistent.
  const ownedKeySet = useMemo(() => {
    return new Set(
      records
        .filter((r) => r.status === "owned")
        .map((r) => makeKey(r.artist, r.album))
    );
  }, [records]);

  const wishlistKeySet = useMemo(() => {
    return new Set(
      records
        .filter((r) => r.status === "wishlist")
        .map((r) => makeKey(r.artist, r.album))
    );
  }, [records]);

  const displayAlbums = useMemo(() => {
    if (!result?.albums) return [] as ExtractedAlbum[];
    return result.albums
      .map((a) => {
        const key = makeKey(a.artist, a.album);
        return {
          ...a,
          inCollection: Boolean(a.inCollection) || ownedKeySet.has(key),
          inWishlist: Boolean(a.inWishlist) || wishlistKeySet.has(key),
        };
      })
      // Never show owned items
      .filter((a) => !a.inCollection);
  }, [result, ownedKeySet, wishlistKeySet]);

  const hiddenOwnedCount = useMemo(() => {
    if (!result?.albums) return 0;
    return Math.max(0, result.albums.length - displayAlbums.length);
  }, [result, displayAlbums.length]);

  // Extract text from PDF by reading as text (simple extraction for vinyl lists)
  const extractTextFromPdf = async (file: File): Promise<string> => {
    // For PDF files, we read the raw bytes and extract text patterns
    // This is a simple approach that works for most text-heavy PDFs like vinyl catalogs
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Convert bytes to string, filtering for printable characters
    let rawText = '';
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      // Keep printable ASCII and common extended chars
      if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
        rawText += String.fromCharCode(byte);
      } else if (byte >= 192 && byte <= 255) {
        // Handle some UTF-8 chars
        rawText += String.fromCharCode(byte);
      }
    }
    
    // Extract text between parentheses (common PDF text encoding)
    const textMatches = rawText.match(/\(([^)]+)\)/g) || [];
    const extractedText = textMatches
      .map(match => match.slice(1, -1))
      .filter(text => text.length > 1 && !/^[\\\/\d.]+$/.test(text))
      .join(' ');
    
    // Also look for plain text sections
    const plainTextSections = rawText.match(/BT[\s\S]*?ET/g) || [];
    const additionalText = plainTextSections
      .map(section => {
        const innerMatches = section.match(/\(([^)]+)\)/g) || [];
        return innerMatches.map(m => m.slice(1, -1)).join(' ');
      })
      .join(' ');
    
    const combinedText = extractedText + ' ' + additionalText;
    
    // Clean up the text
    const cleanedText = combinedText
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '')
      .trim();
    
    // If extraction yielded very little, inform user
    if (cleanedText.length < 100) {
      throw new Error('PDF-Text konnte nicht extrahiert werden. Bitte kopiere den Text manuell und verwende die Text-Eingabe.');
    }
    
    return cleanedText;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.type.startsWith('text/')) {
      toast({ 
        title: "Ungültiges Format", 
        description: "Nur PDF und Text-Dateien werden unterstützt.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Nicht angemeldet");
      }

      let content: string;
      const contentType = 'text'; // Always send as text now

      if (file.type === 'application/pdf') {
        // Extract text from PDF client-side
        toast({ 
          title: "PDF wird analysiert...", 
          description: "Text wird extrahiert" 
        });
        content = await extractTextFromPdf(file);
      } else {
        content = await file.text();
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-list`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            content,
            contentType,
            shopName: shopOverride || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Fehler: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      toast({ 
        title: "Analyse abgeschlossen", 
        description: `${data.totalAlbumsFound} Alben gefunden` 
      });
    } catch (err: any) {
      setError(err.message || "Analyse fehlgeschlagen");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUrlAnalyze = async () => {
    if (!urlInput.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Nicht angemeldet");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-list`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            content: urlInput,
            contentType: 'url',
            sourceUrl: urlInput,
            shopName: shopOverride || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Fehler: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      toast({ 
        title: "Analyse abgeschlossen", 
        description: `${data.totalAlbumsFound} Alben gefunden` 
      });
    } catch (err: any) {
      setError(err.message || "Analyse fehlgeschlagen");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTextAnalyze = async () => {
    if (!textInput.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Nicht angemeldet");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-list`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            content: textInput,
            contentType: 'text',
            shopName: shopOverride || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Fehler: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      toast({ 
        title: "Analyse abgeschlossen", 
        description: `${data.totalAlbumsFound} Alben gefunden` 
      });
    } catch (err: any) {
      setError(err.message || "Analyse fehlgeschlagen");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPriceAssessmentBadge = (assessment?: string) => {
    const styles: Record<string, string> = {
      'sehr gut': 'bg-green-500/20 text-green-400 border-green-500/30',
      'gut': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'fair': 'bg-accent/20 text-accent border-accent/30',
      'teuer': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'sehr teuer': 'bg-destructive/20 text-destructive border-destructive/30',
    };
    const icons: Record<string, React.ReactNode> = {
      'sehr gut': <TrendingDown className="w-3 h-3" />,
      'gut': <TrendingDown className="w-3 h-3" />,
      'fair': <Minus className="w-3 h-3" />,
      'teuer': <TrendingUp className="w-3 h-3" />,
      'sehr teuer': <TrendingUp className="w-3 h-3" />,
    };
    if (!assessment) return null;
    return (
      <Badge variant="outline" className={`${styles[assessment] || ''} gap-1 text-[10px]`}>
        {icons[assessment]}
        {assessment}
      </Badge>
    );
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-emerald-400';
    if (score >= 40) return 'text-accent';
    return 'text-muted-foreground';
  };

  const handleAddToWishlist = (album: ExtractedAlbum) => {
    onAddToWishlist({
      artist: album.artist,
      album: album.album,
      year: album.year,
      label: album.label,
      catalogNumber: album.catalogNumber,
      shopName: album.shopName || result?.shopName,
      price: album.price,
      personalNotes: [
        album.matchReason,
        album.recommendedPressing ? `Empfohlene Pressung: ${album.recommendedPressing}` : null,
        album.condition ? `Zustand: ${album.condition}` : null,
        album.shopName || result?.shopName ? `Shop: ${album.shopName || result?.shopName}` : null,
      ].filter(Boolean).join('\n'),
    });
    toast({ 
      title: "Zur Wunschliste hinzugefügt", 
      description: `${album.artist} - ${album.album}` 
    });
  };

  return (
    <div className="space-y-4">
      {/* Input Mode Selection */}
      <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'url' | 'file' | 'text')}>
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="url" className="gap-1.5 text-xs">
            <Link className="w-3.5 h-3.5" />
            URL
          </TabsTrigger>
          <TabsTrigger value="file" className="gap-1.5 text-xs">
            <Upload className="w-3.5 h-3.5" />
            PDF
          </TabsTrigger>
          <TabsTrigger value="text" className="gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" />
            Text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="mt-3 space-y-3">
          <Input
            placeholder="https://shop.de/vinyl-liste..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="h-10"
          />
          <div className="flex gap-2">
            <Input
              placeholder="Shop-Name (optional)"
              value={shopOverride}
              onChange={(e) => setShopOverride(e.target.value)}
              className="h-10 flex-1"
            />
            <Button 
              onClick={handleUrlAnalyze}
              disabled={isAnalyzing || !urlInput.trim()}
              className="h-10 gap-2"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
              Analysieren
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="file" className="mt-3 space-y-3">
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.txt,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button 
            variant="outline" 
            className="w-full h-20 border-dashed flex-col gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm">Analysiere...</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6" />
                <span className="text-sm">PDF oder Text-Datei hochladen</span>
              </>
            )}
          </Button>
          <Input
            placeholder="Shop-Name (optional)"
            value={shopOverride}
            onChange={(e) => setShopOverride(e.target.value)}
            className="h-10"
          />
        </TabsContent>

        <TabsContent value="text" className="mt-3 space-y-3">
          <Textarea
            placeholder="Füge hier eine Vinyl-Liste ein (z.B. kopiert aus einem Newsletter, Katalog, etc.)..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="min-h-[120px] text-sm"
          />
          <div className="flex gap-2">
            <Input
              placeholder="Shop-Name (optional)"
              value={shopOverride}
              onChange={(e) => setShopOverride(e.target.value)}
              className="h-10 flex-1"
            />
            <Button 
              onClick={handleTextAnalyze}
              disabled={isAnalyzing || !textInput.trim()}
              className="h-10 gap-2"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Analysieren
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Error */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Summary Card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Store className="w-4 h-4 text-primary" />
                    {result.shopName || 'Liste'}
                  </CardTitle>
                  <Badge variant="secondary">{displayAlbums.length} Alben</Badge>
                </div>
                {hiddenOwnedCount > 0 && (
                  <CardDescription className="text-xs mt-1">
                    {hiddenOwnedCount} bereits in deiner Sammlung ausgeblendet
                  </CardDescription>
                )}
                {result.summary && (
                  <CardDescription className="text-sm mt-2">
                    {result.summary}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>

            {/* Album List */}
            <Card>
              <CardHeader className="py-3 pb-2">
                <CardTitle className="text-sm">Passende Alben für dich</CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-2">
                    {displayAlbums.map((album, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`p-3 rounded-lg border ${
                          album.inCollection 
                            ? 'bg-green-500/5 border-green-500/20' 
                            : album.inWishlist 
                            ? 'bg-accent/5 border-accent/20' 
                            : 'bg-secondary/50 border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{album.album}</p>
                              {album.inCollection && (
                                <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/30 gap-1">
                                  <Library className="w-2.5 h-2.5" />
                                  Sammlung
                                </Badge>
                              )}
                              {album.inWishlist && (
                                <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/30 gap-1">
                                  <Heart className="w-2.5 h-2.5" />
                                  Wunschliste
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {album.artist} {album.year && `· ${album.year}`}
                            </p>
                            {album.label && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {album.label} {album.catalogNumber && `[${album.catalogNumber}]`}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {/* Relevance Score */}
                            <div className={`text-xs font-mono ${getRelevanceColor(album.relevanceScore)}`}>
                              {album.relevanceScore}%
                            </div>
                            {/* Price & Assessment */}
                            {album.price && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium">
                                  {album.price.toFixed(0)} {album.currency || 'EUR'}
                                </span>
                                {getPriceAssessmentBadge(album.priceAssessment)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Match Reason */}
                        {album.matchReason && (
                          <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2">
                            💡 {album.matchReason}
                          </p>
                        )}

                        {/* Recommended Pressing */}
                        {album.recommendedPressing && (
                          <p className="text-[10px] text-accent mt-1">
                            ✨ {album.recommendedPressing}
                          </p>
                        )}

                        {/* Discogs Price Comparison */}
                        {album.discogsPrice && album.price && (
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                            <span>Discogs: ~{album.discogsPrice} {album.currency || 'EUR'}</span>
                            {album.price < album.discogsPrice && (
                              <span className="text-green-400">
                                ({Math.round((1 - album.price / album.discogsPrice) * 100)}% günstiger)
                              </span>
                            )}
                          </div>
                        )}

                        {/* Add Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 text-xs gap-1"
                          disabled={album.inWishlist}
                          onClick={() => {
                            if (album.inWishlist) return;
                            handleAddToWishlist(album);
                          }}
                        >
                          {album.inWishlist ? (
                            <Heart className="w-3 h-3" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                          {album.inWishlist ? "Schon auf Wunschliste" : "Zur Wunschliste"}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
