import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecords } from "@/context/RecordContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/StarRating";
import { FormatBadge } from "@/components/FormatBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  Tag,
  Building2,
  Barcode,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  MinusCircle,
  Brain,
  Music,
  ShoppingCart,
  CalendarDays,
  Sparkles,
  ExternalLink,
  Star,
  Heart,
  Pencil,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  ExternalLink as ExternalLinkIcon,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const { getRecordById, deleteRecord, records, addRecord, toggleFavorite, updateRecord } = useRecords();
  const navigate = useNavigate();

  const record = getRecordById(id || "");

  if (!record) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-2">Nicht gefunden</h2>
        <p className="text-muted-foreground mb-4">Dieser Tonträger existiert nicht.</p>
        <Button onClick={() => navigate(-1)}>Zurück</Button>
      </div>
    );
  }

  const handleDelete = () => {
    deleteRecord(record.id);
    navigate("/sammlung");
  };

  const recommendationConfig = {
    "must-have": {
      icon: CheckCircle,
      label: "Must-Have",
      className: "bg-green-500/10 text-green-600 border-green-500/20",
    },
    "nice-to-have": {
      icon: AlertCircle,
      label: "Nice-to-Have",
      className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    },
    "stream-instead": {
      icon: MinusCircle,
      label: "Streamen reicht",
      className: "bg-muted text-muted-foreground border-border",
    },
  };

  const recConfig = record.vinylRecommendation
    ? recommendationConfig[record.vinylRecommendation]
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Zurück
      </Button>

      {/* Main Content */}
      <div className="grid md:grid-cols-[300px_1fr] gap-6 md:gap-8">
        {/* Cover Art */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="aspect-square rounded-xl overflow-hidden shadow-cover">
            {record.coverArt ? (
              <img
                src={record.coverArt}
                alt={`${record.artist} - ${record.album}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-vinyl flex items-center justify-center">
                <div className="w-1/2 h-1/2 vinyl-disc" />
              </div>
            )}
          </div>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <FormatBadge format={record.format} />
            <StatusBadge status={record.status} />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {record.album}
            </h1>
            <p className="text-xl text-muted-foreground mt-1">{record.artist}</p>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-3">
            <StarRating rating={record.myRating} size="lg" />
            <span className="text-sm text-muted-foreground">
              Deine Bewertung
            </span>
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {record.year}
            </div>
            {record.label && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                {record.label}
              </div>
            )}
            {record.catalogNumber && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Barcode className="w-4 h-4" />
                {record.catalogNumber}
              </div>
            )}
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-2">
            {record.genre.map((g) => (
              <Badge key={g} variant="secondary" className="gap-1">
                <Tag className="w-3 h-3" />
                {g}
              </Badge>
            ))}
          </div>

          {/* Format Details */}
          {(record.formatDetails || record.pressing) && (
            <p className="text-sm text-muted-foreground">
              {[record.formatDetails, record.pressing].filter(Boolean).join(" • ")}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4">
            <Button
              onClick={() => toggleFavorite(record.id)}
              variant={record.isFavorite ? "accent" : "outline"}
              className="gap-2"
            >
              <Heart className={cn(
                "w-4 h-4",
                record.isFavorite ? "heart-favorite fill-current" : "heart-inactive"
              )} />
              {record.isFavorite ? "Favorit" : "Favorit hinzufügen"}
            </Button>
            <Button
              asChild
              variant="outline"
              className="gap-2"
            >
              <a
                href={`https://tidal.com/search?q=${encodeURIComponent(`${record.artist} ${record.album}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
                Auf Tidal anhören
              </a>
            </Button>
            <Button
              onClick={() => navigate(`/bearbeiten/${record.id}`)}
              variant="secondary"
              className="gap-2"
            >
              <Edit className="w-4 h-4" />
              Bearbeiten
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2 text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                  Löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tonträger löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Möchtest du "{record.album}" von {record.artist} wirklich löschen?
                    Diese Aktion kann nicht rückgängig gemacht werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.div>
      </div>

      {/* Qualitätsbewertungen - volle Breite */}
      {(record.recordingQuality || record.masteringQuality || record.artisticRating || record.criticScore) && (
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Qualitätsbewertungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {record.recordingQuality && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm text-muted-foreground">Aufnahmequalität</span>
                  <StarRating rating={record.recordingQuality} size="sm" />
                </div>
              )}
              {record.masteringQuality && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm text-muted-foreground">Mastering-Qualität</span>
                  <StarRating rating={record.masteringQuality} size="sm" />
                </div>
              )}
              {record.artisticRating && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm text-muted-foreground">Künstlerische Bewertung</span>
                  <StarRating rating={record.artisticRating} size="sm" />
                </div>
              )}
              {record.criticScore && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm text-muted-foreground">Kritiker-Score</span>
                  <span className="font-semibold text-primary">{record.criticScore}/100</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vinyl Recommendation - volle Breite falls vorhanden */}
      {record.format === "vinyl" && recConfig && (
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Vinyl-Empfehlung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge
              variant="outline"
              className={cn("gap-2 text-base py-1.5", recConfig.className)}
            >
              <recConfig.icon className="w-4 h-4" />
              {recConfig.label}
            </Badge>
            {record.recommendationReason && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {record.recommendationReason}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Künstlerische und Audiophile Beurteilung - nebeneinander */}
      {(record.artisticAssessment || record.audiophileAssessment) && (
        <div className="grid md:grid-cols-2 gap-4">
          {record.artisticAssessment && (
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Künstlerische Beurteilung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {record.artisticAssessment}
                </p>
              </CardContent>
            </Card>
          )}
          {record.audiophileAssessment && (
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Audiophile Beurteilung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {record.audiophileAssessment}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Stichworte - volle Breite */}
      {record.tags && record.tags.length > 0 && (
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              Stichworte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {record.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-sm">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Persönliche Notizen - volle Breite */}
      {record.personalNotes && (
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Persönliche Notizen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {record.personalNotes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Kaufinformationen - volle Breite */}
      <PurchaseInfoCard record={record} updateRecord={updateRecord} />

      {/* Recommendations - Full Width */}
      {record.recommendations && record.recommendations.length > 0 && (
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Ähnliche Alben
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {record.recommendations.map((rec, index) => (
                <div key={index} className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {rec.coverArt && (
                      <img 
                        src={rec.coverArt} 
                        alt={`${rec.artist} - ${rec.album}`}
                        className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{rec.album}</p>
                      <p className="text-sm text-muted-foreground truncate">{rec.artist}</p>
                      {rec.year && <p className="text-xs text-muted-foreground">{rec.year}</p>}
                    </div>
                    {rec.qualityScore && (
                      <span className="flex flex-shrink-0">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < rec.qualityScore! ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                        ))}
                      </span>
                    )}
                  </div>
                  {rec.reason && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{rec.reason}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const query = encodeURIComponent(`${rec.artist} ${rec.album}`);
                        window.open(`https://open.spotify.com/search/${query}`, '_blank');
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[#1DB954]/10 text-[#1DB954] hover:bg-[#1DB954]/20 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Spotify
                    </button>
                    <button
                      onClick={() => {
                        const query = encodeURIComponent(`${rec.artist} ${rec.album}`);
                        window.open(`https://tidal.com/search?q=${query}`, '_blank');
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[#00FFFF]/10 text-[#00BFBF] hover:bg-[#00FFFF]/20 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Tidal
                    </button>
                    <button
                      onClick={() => {
                        const existingRecord = records.find(
                          r => r.artist.toLowerCase() === rec.artist.toLowerCase() && 
                               r.album.toLowerCase() === rec.album.toLowerCase()
                        );
                        
                        if (existingRecord) {
                          const location = existingRecord.status === 'owned' ? 'Sammlung' : 'Wunschliste';
                          alert(`${rec.artist} – ${rec.album} ist bereits in deiner ${location}.`);
                          return;
                        }
                        
                        addRecord({
                          artist: rec.artist,
                          album: rec.album,
                          year: rec.year || new Date().getFullYear(),
                          genre: record.genre || [],
                          label: '',
                          format: 'vinyl',
                          status: 'wishlist',
                          myRating: 0,
                          coverArt: rec.coverArt,
                        });
                        alert(`${rec.artist} – ${rec.album} zur Wunschliste hinzugefügt!`);
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Heart className="w-3 h-3" />
                      Wunschliste
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

// Purchase Info Component with inline editing
interface PurchaseInfoCardProps {
  record: {
    id: string;
    artist: string;
    album: string;
    catalogNumber?: string;
    barcode?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    purchaseLocation?: string;
    dateAdded: string;
  };
  updateRecord: (id: string, updates: Partial<{ purchaseDate?: string; purchasePrice?: number; purchaseLocation?: string }>) => void;
}

interface MarketplaceData {
  releaseId: number;
  releaseUrl: string;
  lowestPrice?: number;
  medianPrice?: number;
  highestPrice?: number;
  numForSale: number;
  currency: string;
}

function PurchaseInfoCard({ record, updateRecord }: PurchaseInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(
    record.purchaseDate ? new Date(record.purchaseDate) : undefined
  );
  const [purchasePrice, setPurchasePrice] = useState(
    record.purchasePrice?.toString() || ""
  );
  const [purchaseLocation, setPurchaseLocation] = useState(
    record.purchaseLocation || ""
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Discogs marketplace state
  const [marketplaceData, setMarketplaceData] = useState<MarketplaceData | null>(null);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);

  // Fetch Discogs marketplace prices
  useEffect(() => {
    const fetchMarketplaceData = async () => {
      setMarketplaceLoading(true);
      setMarketplaceError(null);
      
      try {
        const { data, error } = await supabase.functions.invoke('discogs-marketplace', {
          body: {
            artist: record.artist,
            album: record.album,
            catalogNumber: record.catalogNumber,
            barcode: record.barcode
          }
        });

        if (error) {
          console.error('Marketplace fetch error:', error);
          setMarketplaceError('Keine Preisdaten verfügbar');
        } else if (data?.data) {
          setMarketplaceData(data.data);
        } else if (data?.error) {
          setMarketplaceError(data.error);
        }
      } catch (err) {
        console.error('Marketplace fetch error:', err);
        setMarketplaceError('Fehler beim Laden der Preisdaten');
      } finally {
        setMarketplaceLoading(false);
      }
    };

    fetchMarketplaceData();
  }, [record.artist, record.album, record.catalogNumber, record.barcode]);

  const handleSave = () => {
    updateRecord(record.id, {
      purchaseDate: purchaseDate ? purchaseDate.toISOString().split("T")[0] : undefined,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
      purchaseLocation: purchaseLocation || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setPurchaseDate(record.purchaseDate ? new Date(record.purchaseDate) : undefined);
    setPurchasePrice(record.purchasePrice?.toString() || "");
    setPurchaseLocation(record.purchaseLocation || "");
    setIsEditing(false);
  };

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Kaufinformationen
          </CardTitle>
          {!isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="w-4 h-4" />
              Bearbeiten
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="gap-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
                Abbrechen
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                className="gap-1"
              >
                <Check className="w-4 h-4" />
                Speichern
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-muted-foreground">Kaufdatum</span>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !purchaseDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {purchaseDate ? format(purchaseDate, "dd.MM.yyyy", { locale: de }) : "Datum wählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <CalendarComponent
                    mode="single"
                    selected={purchaseDate}
                    onSelect={(date) => {
                      setPurchaseDate(date);
                      setCalendarOpen(false);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-muted-foreground">Preis (CHF)</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
                className="text-center"
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-muted-foreground">Gekauft bei</span>
              <Input
                type="text"
                value={purchaseLocation}
                onChange={(e) => setPurchaseLocation(e.target.value)}
                placeholder="Händler / Shop"
                className="text-center"
              />
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm text-muted-foreground">Kaufdatum</span>
              <span className="font-medium flex items-center gap-1">
                <CalendarDays className="w-4 h-4" />
                {record.purchaseDate 
                  ? new Date(record.purchaseDate).toLocaleDateString("de-CH")
                  : <span className="text-muted-foreground/50">–</span>
                }
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm text-muted-foreground">Preis</span>
              <span className="font-semibold">
                {record.purchasePrice 
                  ? `CHF ${record.purchasePrice.toFixed(2)}`
                  : <span className="text-muted-foreground/50">–</span>
                }
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm text-muted-foreground">Gekauft bei</span>
              <span className="font-medium">
                {record.purchaseLocation || <span className="text-muted-foreground/50">–</span>}
              </span>
            </div>
          </div>
        )}
        
        {/* Discogs Marketplace Prices */}
        <div className="pt-4 border-t border-border/50 mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              Discogs Marktpreise
            </span>
            {marketplaceData && (
              <a
                href={marketplaceData.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Auf Discogs ansehen
                <ExternalLinkIcon className="w-3 h-3" />
              </a>
            )}
          </div>
          
          {marketplaceLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Lade Preise...</span>
            </div>
          ) : marketplaceError ? (
            <p className="text-sm text-muted-foreground/60 text-center py-2">{marketplaceError}</p>
          ) : marketplaceData ? (
            <>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">Günstigster</span>
                  <span className="font-semibold text-green-500">
                    {marketplaceData.lowestPrice 
                      ? `CHF ${marketplaceData.lowestPrice.toFixed(2)}`
                      : '–'
                    }
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">Median</span>
                  <span className="font-medium">
                    {marketplaceData.medianPrice 
                      ? `CHF ${marketplaceData.medianPrice.toFixed(2)}`
                      : '–'
                    }
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">Höchster</span>
                  <span className="font-semibold text-red-400">
                    {marketplaceData.highestPrice 
                      ? `CHF ${marketplaceData.highestPrice.toFixed(2)}`
                      : '–'
                    }
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">Angebote</span>
                  <span className="font-medium">{marketplaceData.numForSale}</span>
                </div>
              </div>
              
              {/* Deal Analysis */}
              {record.purchasePrice && marketplaceData.medianPrice && (
                <DealAnalysis 
                  purchasePrice={record.purchasePrice} 
                  lowestPrice={marketplaceData.lowestPrice}
                  medianPrice={marketplaceData.medianPrice} 
                />
              )}
            </>
          ) : null}
        </div>
        
        <div className="flex justify-center pt-4 border-t border-border/50 mt-4">
          <span className="text-sm text-muted-foreground">
            Hinzugefügt am {new Date(record.dateAdded).toLocaleDateString("de-CH")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// Deal Analysis Component
interface DealAnalysisProps {
  purchasePrice: number;
  lowestPrice?: number;
  medianPrice: number;
}

function DealAnalysis({ purchasePrice, lowestPrice, medianPrice }: DealAnalysisProps) {
  const comparePrice = medianPrice;
  const difference = purchasePrice - comparePrice;
  const percentDiff = ((difference / comparePrice) * 100);
  
  // Determine deal quality
  const getDealInfo = () => {
    if (percentDiff <= -20) {
      return {
        label: "Schnäppchen!",
        description: `${Math.abs(percentDiff).toFixed(0)}% unter dem Median`,
        icon: ThumbsUp,
        colorClass: "text-green-500",
        bgClass: "bg-green-500/10",
        borderClass: "border-green-500/30"
      };
    } else if (percentDiff <= -5) {
      return {
        label: "Guter Deal",
        description: `${Math.abs(percentDiff).toFixed(0)}% unter dem Median`,
        icon: ThumbsUp,
        colorClass: "text-green-400",
        bgClass: "bg-green-500/5",
        borderClass: "border-green-500/20"
      };
    } else if (percentDiff <= 5) {
      return {
        label: "Fairer Preis",
        description: "Im Bereich des Medianpreises",
        icon: Minus,
        colorClass: "text-muted-foreground",
        bgClass: "bg-muted/50",
        borderClass: "border-border"
      };
    } else if (percentDiff <= 20) {
      return {
        label: "Etwas teurer",
        description: `${percentDiff.toFixed(0)}% über dem Median`,
        icon: TrendingUp,
        colorClass: "text-amber-500",
        bgClass: "bg-amber-500/10",
        borderClass: "border-amber-500/30"
      };
    } else {
      return {
        label: "Premium-Preis",
        description: `${percentDiff.toFixed(0)}% über dem Median`,
        icon: TrendingUp,
        colorClass: "text-red-400",
        bgClass: "bg-red-500/10",
        borderClass: "border-red-500/30"
      };
    }
  };
  
  const dealInfo = getDealInfo();
  const Icon = dealInfo.icon;
  
  return (
    <div className={cn(
      "mt-4 p-3 rounded-lg border",
      dealInfo.bgClass,
      dealInfo.borderClass
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-5 h-5", dealInfo.colorClass)} />
          <div>
            <p className={cn("font-medium", dealInfo.colorClass)}>{dealInfo.label}</p>
            <p className="text-xs text-muted-foreground">{dealInfo.description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Dein Preis</p>
          <p className={cn("font-semibold", dealInfo.colorClass)}>
            CHF {purchasePrice.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
