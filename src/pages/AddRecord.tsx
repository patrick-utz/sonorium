import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRecords } from "@/context/RecordContext";
import { Record, RecordFormat, RecordStatus, AlternativeRelease } from "@/types/record";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/StarRating";
import { TagInput } from "@/components/TagInput";
import { CameraCapture } from "@/components/CameraCapture";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { AlternativeReleases } from "@/components/AlternativeReleases";
import { ArrowLeft, Save, Camera, ImagePlus, Disc3, Disc, Sparkles, Loader2, Headphones, Palette, Music, Star, ScanBarcode, Search, Heart, Library } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const GENRE_SUGGESTIONS = [
  "Jazz", "Rock", "Pop", "Klassik", "Electronic", "Hip-Hop", "R&B", "Soul",
  "Blues", "Folk", "Country", "Reggae", "Metal", "Punk", "Indie", "Alternative",
  "Funk", "Disco", "House", "Techno", "Ambient", "World Music", "Latin"
];

export default function AddRecord() {
  const { id } = useParams<{ id: string }>();
  const { addRecord, updateRecord, getRecordById } = useRecords();
  const navigate = useNavigate();
  const { toast } = useToast();

  const existingRecord = id ? getRecordById(id) : undefined;
  const isEditing = !!existingRecord;

  const [formData, setFormData] = useState<Partial<Record>>(
    existingRecord || {
      artist: "",
      album: "",
      year: new Date().getFullYear(),
      genre: [],
      label: "",
      catalogNumber: "",
      format: "vinyl",
      formatDetails: "",
      pressing: "",
      coverArt: "",
      myRating: 3,
      status: "owned",
      personalNotes: "",
      tags: [],
    }
  );

  const [showCamera, setShowCamera] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [isCoverDragActive, setIsCoverDragActive] = useState(false);
  const [genreInput, setGenreInput] = useState("");
  const [showGenreSuggestions, setShowGenreSuggestions] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pendingBarcodeData, setPendingBarcodeData] = useState<Partial<Record> | null>(null);
  const [alternativeReleases, setAlternativeReleases] = useState<AlternativeRelease[]>([]);
  const [selectedAlternative, setSelectedAlternative] = useState<AlternativeRelease | null>(null);

  const setCoverFromFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Ungültige Datei",
        description: "Bitte wähle ein Bild (JPG/PNG/WebP).",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFormData((prev) => ({ ...prev, coverArt: result }));
      toast({ title: "Cover gesetzt", description: "Bild wurde übernommen." });
    };
    reader.onerror = () => {
      toast({
        title: "Fehler",
        description: "Bild konnte nicht gelesen werden.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAiComplete = async () => {
    setIsAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('complete-record', {
        body: {
          artist: formData.artist,
          album: formData.album,
          year: formData.year,
          genre: formData.genre,
          label: formData.label,
          coverArt: formData.coverArt
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        const aiData = data.data;
        
        // Only update fields that are empty or not set
        setFormData((prev) => ({
          ...prev,
          artist: prev.artist || aiData.artist || prev.artist,
          album: prev.album || aiData.album || prev.album,
          year: prev.year || aiData.year || prev.year,
          genre: prev.genre?.length ? prev.genre : (aiData.genre || prev.genre),
          label: prev.label || aiData.label || prev.label,
          catalogNumber: prev.catalogNumber || aiData.catalogNumber || prev.catalogNumber,
          formatDetails: prev.formatDetails || aiData.formatDetails || prev.formatDetails,
          pressing: prev.pressing || aiData.pressing || prev.pressing,
          tags: prev.tags?.length ? prev.tags : (aiData.tags || prev.tags),
          personalNotes: prev.personalNotes || aiData.personalNotes || prev.personalNotes,
          coverArt: prev.coverArt || aiData.coverArtBase64 || aiData.coverArtUrl || prev.coverArt,
          // KI-Bewertungen - always update these from AI
          audiophileAssessment: aiData.audiophileAssessment || prev.audiophileAssessment,
          artisticAssessment: aiData.artisticAssessment || prev.artisticAssessment,
          recordingQuality: aiData.recordingQuality || prev.recordingQuality,
          masteringQuality: aiData.masteringQuality || prev.masteringQuality,
          artisticRating: aiData.artisticRating || prev.artisticRating,
          recommendations: aiData.recommendations || prev.recommendations,
        }));

        toast({
          title: "KI-Vervollständigung",
          description: `Daten wurden ergänzt (Konfidenz: ${aiData.confidence || 'mittel'})`,
        });
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('AI completion error:', error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "KI-Vervollständigung fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleBarcodeScan = async (code: string) => {
    setIsBarcodeLoading(true);
    
    // Check if it looks like a barcode (only numbers) or a catalog number
    const isBarcode = /^\d+$/.test(code);
    
    toast({
      title: isBarcode ? "Barcode erkannt" : "Katalognummer erkannt",
      description: `${code} - Suche Album-Informationen...`,
    });

    try {
      const { data, error } = await supabase.functions.invoke('complete-record', {
        body: {
          barcode: isBarcode ? code : undefined,
          catalogNumber: isBarcode ? undefined : code,
          artist: formData.artist,
          album: formData.album,
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        const aiData = data.data;
        
        // Store the data and show status selection dialog
        setPendingBarcodeData({
          artist: aiData.artist,
          album: aiData.album,
          year: aiData.year,
          genre: aiData.genre,
          label: aiData.label,
          catalogNumber: aiData.catalogNumber,
          formatDetails: aiData.formatDetails,
          pressing: aiData.pressing,
          tags: aiData.tags,
          personalNotes: aiData.personalNotes,
          coverArt: aiData.coverArtBase64 || aiData.coverArtUrl,
          audiophileAssessment: aiData.audiophileAssessment,
          artisticAssessment: aiData.artisticAssessment,
          recordingQuality: aiData.recordingQuality,
          masteringQuality: aiData.masteringQuality,
          artisticRating: aiData.artisticRating,
          recommendations: aiData.recommendations,
        });
        
        // Store alternative releases
        setAlternativeReleases(aiData.alternativeReleases || []);
        setSelectedAlternative(null);
        setShowStatusDialog(true);
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        toast({
          title: "Kein Album gefunden",
          description: "Für diesen Barcode wurde kein Album gefunden.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Album-Suche fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setIsBarcodeLoading(false);
    }
  };

  const handleStatusSelection = (status: RecordStatus) => {
    if (pendingBarcodeData) {
      setFormData((prev) => ({
        ...prev,
        artist: pendingBarcodeData.artist || prev.artist,
        album: pendingBarcodeData.album || prev.album,
        year: pendingBarcodeData.year || prev.year,
        genre: pendingBarcodeData.genre?.length ? pendingBarcodeData.genre : prev.genre,
        label: pendingBarcodeData.label || prev.label,
        catalogNumber: pendingBarcodeData.catalogNumber || prev.catalogNumber,
        formatDetails: pendingBarcodeData.formatDetails || prev.formatDetails,
        pressing: pendingBarcodeData.pressing || prev.pressing,
        tags: pendingBarcodeData.tags?.length ? pendingBarcodeData.tags : prev.tags,
        personalNotes: pendingBarcodeData.personalNotes || prev.personalNotes,
        coverArt: pendingBarcodeData.coverArt || prev.coverArt,
        audiophileAssessment: pendingBarcodeData.audiophileAssessment || prev.audiophileAssessment,
        artisticAssessment: pendingBarcodeData.artisticAssessment || prev.artisticAssessment,
        recordingQuality: pendingBarcodeData.recordingQuality || prev.recordingQuality,
        masteringQuality: pendingBarcodeData.masteringQuality || prev.masteringQuality,
        artisticRating: pendingBarcodeData.artisticRating || prev.artisticRating,
        recommendations: pendingBarcodeData.recommendations || prev.recommendations,
        status: status,
      }));

      toast({
        title: "Album gefunden",
        description: `${pendingBarcodeData.artist} - ${pendingBarcodeData.album} (${status === 'owned' ? 'Sammlung' : 'Wunschliste'})`,
      });
    }
    setPendingBarcodeData(null);
    setShowStatusDialog(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.artist || !formData.album) {
      toast({
        title: "Fehlende Angaben",
        description: "Bitte gib mindestens Künstler und Album an.",
        variant: "destructive",
      });
      return;
    }

    const recordData = {
      ...formData,
    } as Omit<Record, "id" | "dateAdded">;

    if (isEditing && existingRecord) {
      updateRecord(existingRecord.id, recordData);
      toast({
        title: "Gespeichert",
        description: `${formData.album} wurde aktualisiert.`,
      });
      navigate(`/sammlung/${existingRecord.id}`);
    } else {
      addRecord(recordData);
      toast({
        title: "Hinzugefügt",
        description: `${formData.album} wurde zur Sammlung hinzugefügt.`,
      });
      navigate("/sammlung");
    }
  };

  const handleCameraCapture = (imageData: string) => {
    setFormData((prev) => ({ ...prev, coverArt: imageData }));
  };

  const addGenre = (genre: string) => {
    const trimmedGenre = genre.trim();
    if (trimmedGenre && !formData.genre?.includes(trimmedGenre)) {
      setFormData((prev) => ({
        ...prev,
        genre: [...(prev.genre || []), trimmedGenre],
      }));
    }
    setGenreInput("");
    setShowGenreSuggestions(false);
  };

  const removeGenre = (genreToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      genre: prev.genre?.filter((g) => g !== genreToRemove) || [],
    }));
  };

  const filteredGenreSuggestions = GENRE_SUGGESTIONS.filter(
    (g) =>
      g.toLowerCase().includes(genreInput.toLowerCase()) &&
      !formData.genre?.includes(g)
  );

  return (
    <>
      <AnimatePresence>
        {showCamera && (
          <CameraCapture
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        )}
        {showBarcodeScanner && (
          <BarcodeScanner
            onScan={handleBarcodeScan}
            onClose={() => setShowBarcodeScanner(false)}
          />
        )}
      </AnimatePresence>

      {/* Status Selection Dialog after Barcode Scan */}
      <Dialog open={showStatusDialog} onOpenChange={(open) => {
        setShowStatusDialog(open);
        if (!open) {
          setAlternativeReleases([]);
          setSelectedAlternative(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">
              {pendingBarcodeData?.artist} - {pendingBarcodeData?.album}
            </DialogTitle>
            <DialogDescription className="text-center">
              {alternativeReleases.length > 0 
                ? "Wähle eine Pressung und füge den Tonträger hinzu"
                : "Wohin soll dieser Tonträger hinzugefügt werden?"}
            </DialogDescription>
          </DialogHeader>
          
          {/* Alternative Releases Section */}
          {alternativeReleases.length > 0 && (
            <AlternativeReleases
              releases={alternativeReleases}
              onSelect={(release) => {
                setSelectedAlternative(release);
                // Update pending data with selected release info
                setPendingBarcodeData(prev => ({
                  ...prev,
                  year: release.year || prev?.year,
                  label: release.label || prev?.label,
                  catalogNumber: release.catalogNumber || prev?.catalogNumber,
                  pressing: `${release.country || ''} ${release.year || ''} ${release.format || ''}`.trim() || prev?.pressing,
                }));
              }}
              selectedMbid={selectedAlternative?.mbid}
            />
          )}
          
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => handleStatusSelection("owned")}
              className="gap-2 h-14 text-lg"
              variant="default"
            >
              <Library className="w-5 h-5" />
              Zur Sammlung hinzufügen
            </Button>
            <Button
              onClick={() => handleStatusSelection("wishlist")}
              className="gap-2 h-14 text-lg"
              variant="outline"
            >
              <Heart className="w-5 h-5" />
              Auf die Wunschliste
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto space-y-6"
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

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold gradient-text">
              {isEditing ? "Tonträger bearbeiten" : "Neuer Tonträger"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditing
                ? "Aktualisiere die Informationen"
                : "Füge einen neuen Tonträger zu deiner Sammlung hinzu"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBarcodeScanner(true)}
                disabled={isBarcodeLoading}
                className="gap-2"
              >
                {isBarcodeLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ScanBarcode className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{isBarcodeLoading ? "Suche..." : "Scan"}</span>
              </Button>
              <div className="flex">
                <Input
                  placeholder="EAN oder Katalog-Nr..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-36 sm:w-44 rounded-r-none bg-card border-border/50"
                  maxLength={20}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (manualCode.length >= 3) {
                      handleBarcodeScan(manualCode);
                      setManualCode("");
                    } else {
                      toast({
                        title: "Ungültige Eingabe",
                        description: "Bitte gib mindestens 3 Zeichen ein.",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={isBarcodeLoading || manualCode.length < 3}
                  className="rounded-l-none border-l-0 px-2"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleAiComplete}
              disabled={isAiLoading}
              className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
            >
              {isAiLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isAiLoading ? "KI analysiert..." : "KI-Vervollständigung"}
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cover Art Upload */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Cover-Bild
              </CardTitle>
              <CardDescription>
                Fotografiere das Cover direkt oder gib eine URL ein
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-start">
                <div
                  className={`w-32 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative cursor-pointer ${
                    isCoverDragActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                  }`}
                  onClick={() => coverFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsCoverDragActive(true);
                  }}
                  onDragLeave={() => setIsCoverDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsCoverDragActive(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) setCoverFromFile(file);
                  }}
                  aria-label="Cover-Bild hochladen"
                >
                  {formData.coverArt ? (
                    <img
                      src={formData.coverArt}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImagePlus className="w-8 h-8" />
                    </div>
                  )}

                  {isCoverDragActive && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center text-sm font-medium text-foreground">
                      Bild ablegen
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/*"
                    capture
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setCoverFromFile(file);
                      e.currentTarget.value = "";
                    }}
                    className="hidden"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCamera(true)}
                    className="w-full gap-2 border-primary/50 text-primary hover:bg-primary/10"
                  >
                    <Camera className="w-4 h-4" />
                    Live-Kamera
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => coverFileInputRef.current?.click()}
                    className="w-full gap-2"
                  >
                    <ImagePlus className="w-4 h-4" />
                    Datei / Kamera auswählen
                  </Button>

                  <div className="relative">
                    <Input
                      placeholder="Oder Cover-URL eingeben..."
                      value={formData.coverArt?.startsWith("data:") ? "" : formData.coverArt || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, coverArt: e.target.value }))
                      }
                      className="bg-card border-border/50"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg">Grundinformationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="artist">Künstler *</Label>
                  <Input
                    id="artist"
                    placeholder="z.B. Miles Davis"
                    value={formData.artist || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, artist: e.target.value }))
                    }
                    className="bg-card border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="album">Album *</Label>
                  <Input
                    id="album"
                    placeholder="z.B. Kind of Blue"
                    value={formData.album || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, album: e.target.value }))
                    }
                    className="bg-card border-border/50"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Jahr</Label>
                  <Input
                    id="year"
                    type="number"
                    min={1900}
                    max={new Date().getFullYear()}
                    value={formData.year || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, year: parseInt(e.target.value) }))
                    }
                    className="bg-card border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label">Label</Label>
                  <Input
                    id="label"
                    placeholder="z.B. Columbia"
                    value={formData.label || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, label: e.target.value }))
                    }
                    className="bg-card border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catalogNumber">Katalognummer</Label>
                  <Input
                    id="catalogNumber"
                    placeholder="z.B. CL 1355"
                    value={formData.catalogNumber || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, catalogNumber: e.target.value }))
                    }
                    className="bg-card border-border/50"
                  />
                </div>
              </div>

              {/* Genre Selection */}
              <div className="space-y-2">
                <Label>Genres</Label>
                {formData.genre && formData.genre.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.genre.map((genre) => (
                      <span
                        key={genre}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                      >
                        {genre}
                        <button
                          type="button"
                          onClick={() => removeGenre(genre)}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Input
                    placeholder="Genre hinzufügen..."
                    value={genreInput}
                    onChange={(e) => {
                      setGenreInput(e.target.value);
                      setShowGenreSuggestions(true);
                    }}
                    onFocus={() => setShowGenreSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowGenreSuggestions(false), 200)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && genreInput.trim()) {
                        e.preventDefault();
                        addGenre(genreInput);
                      }
                    }}
                    className="bg-card border-border/50"
                  />
                  {showGenreSuggestions && filteredGenreSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                      {filteredGenreSuggestions.slice(0, 8).map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                          onClick={() => addGenre(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {formData.genre?.length === 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-xs text-muted-foreground mr-1">Vorschläge:</span>
                    {GENRE_SUGGESTIONS.slice(0, 6).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => addGenre(suggestion)}
                        className="text-xs px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Format & Status */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg">Format & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={formData.format === "vinyl" ? "default" : "outline"}
                      onClick={() => setFormData((prev) => ({ ...prev, format: "vinyl" }))}
                      className="flex-1 gap-2"
                    >
                      <Disc3 className="w-4 h-4" />
                      Vinyl
                    </Button>
                    <Button
                      type="button"
                      variant={formData.format === "cd" ? "default" : "outline"}
                      onClick={() => setFormData((prev) => ({ ...prev, format: "cd" }))}
                      className="flex-1 gap-2"
                    >
                      <Disc className="w-4 h-4" />
                      CD
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, status: v as RecordStatus }))
                    }
                  >
                    <SelectTrigger className="bg-card border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owned">In Sammlung</SelectItem>
                      <SelectItem value="wishlist">Wunschliste</SelectItem>
                      <SelectItem value="checked-not-bought">Geprüft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="formatDetails">Format-Details</Label>
                  <Input
                    id="formatDetails"
                    placeholder="z.B. 180g, 2LP, Gatefold"
                    value={formData.formatDetails || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, formatDetails: e.target.value }))
                    }
                    className="bg-card border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pressing">Pressung</Label>
                  <Input
                    id="pressing"
                    placeholder="z.B. EU 2015"
                    value={formData.pressing || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, pressing: e.target.value }))
                    }
                    className="bg-card border-border/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rating */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg">Deine Bewertung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <StarRating
                  rating={formData.myRating || 0}
                  size="lg"
                  interactive
                  onChange={(rating) => setFormData((prev) => ({ ...prev, myRating: rating }))}
                />
                <span className="text-lg font-semibold text-foreground">
                  {formData.myRating} / 5
                </span>
              </div>
            </CardContent>
          </Card>

          {/* KI-Bewertungen */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                KI-Bewertungen
              </CardTitle>
              <CardDescription>
                Ausführliche Bewertungen - klicke oben auf "KI-Vervollständigung" zum automatischen Generieren
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Audiophile Beurteilung */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Headphones className="w-5 h-5 text-primary" />
                    Audiophile Beurteilung
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Aufnahme:</span>
                      <StarRating
                        rating={formData.recordingQuality || 0}
                        size="sm"
                        interactive
                        onChange={(r) => setFormData((prev) => ({ ...prev, recordingQuality: r }))}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Mastering:</span>
                      <StarRating
                        rating={formData.masteringQuality || 0}
                        size="sm"
                        interactive
                        onChange={(r) => setFormData((prev) => ({ ...prev, masteringQuality: r }))}
                      />
                    </div>
                  </div>
                </div>
                <Textarea
                  placeholder="Beschreibe Aufnahmequalität, Räumlichkeit, Dynamik, beste Pressungen..."
                  value={formData.audiophileAssessment || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, audiophileAssessment: e.target.value }))
                  }
                  className="bg-card border-border/50 min-h-[120px] text-sm"
                />
              </div>

              {/* Künstlerische Beurteilung */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Palette className="w-5 h-5 text-primary" />
                    Künstlerische Beurteilung
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Bewertung:</span>
                    <StarRating
                      rating={formData.artisticRating || 0}
                      size="sm"
                      interactive
                      onChange={(r) => setFormData((prev) => ({ ...prev, artisticRating: r }))}
                    />
                  </div>
                </div>
                <Textarea
                  placeholder="Beschreibe historische Bedeutung, musikalische Innovation, Einfluss..."
                  value={formData.artisticAssessment || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, artisticAssessment: e.target.value }))
                  }
                  className="bg-card border-border/50 min-h-[120px] text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* KI-Empfehlungen */}
          {formData.recommendations && formData.recommendations.length > 0 && (
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Music className="w-5 h-5 text-primary" />
                  Ähnliche Alben
                </CardTitle>
                <CardDescription>
                  Empfehlungen basierend auf klanglicher und künstlerischer Ähnlichkeit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {formData.recommendations.map((rec, index) => (
                    <div key={index} className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-foreground">{rec.artist}</span>
                          <span className="text-muted-foreground"> – </span>
                          <span className="text-foreground">{rec.album}</span>
                          {rec.year && <span className="text-muted-foreground text-sm ml-2">({rec.year})</span>}
                        </div>
                        {rec.qualityScore && (
                          <span className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < rec.qualityScore! ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                            ))}
                          </span>
                        )}
                      </div>
                      {rec.reason && (
                        <p className="text-sm text-muted-foreground">{rec.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags / Keywords */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg">Stichworte</CardTitle>
              <CardDescription>
                Füge Stichworte für Stimmung, Instrumente, Anlässe hinzu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TagInput
                tags={formData.tags || []}
                onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))}
                placeholder="Stichwort hinzufügen (z.B. entspannt, Klavier, Sommer)..."
              />
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg">Persönliche Notizen</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Deine Gedanken zu diesem Tonträger..."
                value={formData.personalNotes || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, personalNotes: e.target.value }))
                }
                className="bg-card border-border/50 min-h-[100px]"
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="submit"
              size="lg"
              className="flex-1 gap-2 bg-gradient-vinyl hover:opacity-90 text-primary-foreground"
            >
              <Save className="w-4 h-4" />
              {isEditing ? "Änderungen speichern" : "Zur Sammlung hinzufügen"}
            </Button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
