import { useRef, useState, useEffect, useCallback } from "react";
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
import { SmartScanner } from "@/components/SmartScanner";
import { AlternativeReleases } from "@/components/AlternativeReleases";
import { MoodInput } from "@/components/MoodInput";
import { ArrowLeft, Save, Camera, ImagePlus, Disc3, Disc, Sparkles, Loader2, Headphones, Palette, Music, Star, ScanBarcode, Search, Heart, Library, ShoppingCart, ExternalLink, Plus, Trash2, SaveIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DRAFT_STORAGE_KEY = "sonorium-draft-record";
const AUTOSAVE_DELAY = 1500; // 1.5 seconds debounce

const GENRE_SUGGESTIONS = [
  "Jazz", "Rock", "Pop", "Klassik", "Electronic", "Hip-Hop", "R&B", "Soul",
  "Blues", "Folk", "Country", "Reggae", "Metal", "Punk", "Indie", "Alternative",
  "Funk", "Disco", "House", "Techno", "Ambient", "World Music", "Latin"
];

export default function AddRecord() {
  const { id } = useParams<{ id: string }>();
  const { addRecord, updateRecord, getRecordById, records } = useRecords();
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
      moods: [],
    }
  );

  const [showCamera, setShowCamera] = useState(false);
  const [showSmartScanner, setShowSmartScanner] = useState(false);
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
  
  // Autosave states
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // Format relative time for display
  const formatRelativeTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "gerade eben";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `vor ${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    return `vor ${hours} Std.`;
  };

  // Clear draft from storage
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraft(false);
    setLastSaved(null);
    toast({
      title: "Entwurf verworfen",
      description: "Der gespeicherte Entwurf wurde gelöscht.",
    });
  }, [toast]);

  // Restore draft on mount (only for new records)
  useEffect(() => {
    if (isEditing || draftRestored) return;
    
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && typeof parsed === 'object') {
          setFormData(parsed);
          setHasDraft(true);
          setDraftRestored(true);
          toast({
            title: "Entwurf wiederhergestellt",
            description: "Dein letzter Entwurf wurde geladen.",
          });
        }
      }
    } catch (e) {
      console.error("Failed to restore draft:", e);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [isEditing, draftRestored, toast]);

  // Autosave with debounce (only for new records)
  useEffect(() => {
    if (isEditing) return;
    
    // Don't save if form is essentially empty
    const hasContent = formData.artist || formData.album || formData.coverArt;
    if (!hasContent) return;

    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
        setLastSaved(new Date());
        setHasDraft(true);
      } catch (e) {
        console.error("Failed to save draft:", e);
      }
    }, AUTOSAVE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [formData, isEditing]);

  // Update relative time display every minute
  useEffect(() => {
    if (!lastSaved) return;
    
    const intervalId = setInterval(() => {
      setLastSaved(prev => prev ? new Date(prev.getTime()) : null);
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, [lastSaved]);

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const hasContent = formData.artist || formData.album || formData.coverArt;
    if (!hasContent || isEditing) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData.artist, formData.album, formData.coverArt, isEditing]);

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
      // First API call to get metadata (including label and catalogNumber)
      const { data, error } = await supabase.functions.invoke('complete-record', {
        body: {
          artist: formData.artist,
          album: formData.album,
          year: formData.year,
          genre: formData.genre,
          label: formData.label,
          catalogNumber: formData.catalogNumber,
          coverArt: formData.coverArt
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        const aiData = data.data;
        
        // Get the new label and catalogNumber for potential second cover lookup
        const newLabel = aiData.label || formData.label;
        const newCatalogNumber = aiData.catalogNumber || formData.catalogNumber;
        const newArtist = aiData.artist || formData.artist;
        const newAlbum = aiData.album || formData.album;
        
        let finalCoverArt = formData.coverArt || aiData.coverArtBase64 || aiData.coverArtUrl;
        
        // If we got new label/catalogNumber info and still no cover, try a second lookup
        if (!finalCoverArt && (newLabel || newCatalogNumber)) {
          console.log('No cover found, trying again with new metadata:', { newLabel, newCatalogNumber });
          try {
            const { data: retryData } = await supabase.functions.invoke('complete-record', {
              body: {
                artist: newArtist,
                album: newAlbum,
                label: newLabel,
                catalogNumber: newCatalogNumber,
              }
            });
            if (retryData?.data?.coverArtBase64 || retryData?.data?.coverArtUrl) {
              finalCoverArt = retryData.data.coverArtBase64 || retryData.data.coverArtUrl;
              console.log('Found cover on retry with metadata');
            }
          } catch (retryError) {
            console.log('Retry cover lookup failed:', retryError);
          }
        }
        
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
          moods: prev.moods?.length ? prev.moods : (aiData.moods || prev.moods),
          personalNotes: prev.personalNotes || aiData.personalNotes || prev.personalNotes,
          coverArt: finalCoverArt || prev.coverArt,
          // KI-Bewertungen - always update these from AI
          audiophileAssessment: aiData.audiophileAssessment || prev.audiophileAssessment,
          artisticAssessment: aiData.artisticAssessment || prev.artisticAssessment,
          recordingQuality: aiData.recordingQuality || prev.recordingQuality,
          masteringQuality: aiData.masteringQuality || prev.masteringQuality,
          artisticRating: aiData.artisticRating || prev.artisticRating,
          criticScore: aiData.criticScore || prev.criticScore,
          criticReviews: aiData.criticReviews || prev.criticReviews,
          vinylRecommendation: aiData.vinylRecommendation || prev.vinylRecommendation,
          recommendationReason: aiData.recommendationReason || prev.recommendationReason,
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
          criticScore: aiData.criticScore,
          criticReviews: aiData.criticReviews,
          vinylRecommendation: aiData.vinylRecommendation,
          recommendationReason: aiData.recommendationReason,
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

  // Handle image analysis (when no barcode was found in photo)
  const handleImageAnalysis = async (imageBase64: string) => {
    setIsBarcodeLoading(true);
    
    toast({
      title: "Label-Foto erkannt",
      description: "KI analysiert das Bild...",
    });

    try {
      const { data, error } = await supabase.functions.invoke('complete-record', {
        body: {
          labelImage: imageBase64,
          artist: formData.artist,
          album: formData.album,
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        const aiData = data.data;
        
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
          moods: aiData.moods,
          personalNotes: aiData.personalNotes,
          coverArt: aiData.coverArtBase64 || aiData.coverArtUrl || imageBase64,
          audiophileAssessment: aiData.audiophileAssessment,
          artisticAssessment: aiData.artisticAssessment,
          recordingQuality: aiData.recordingQuality,
          masteringQuality: aiData.masteringQuality,
          artisticRating: aiData.artisticRating,
          criticScore: aiData.criticScore,
          criticReviews: aiData.criticReviews,
          vinylRecommendation: aiData.vinylRecommendation,
          recommendationReason: aiData.recommendationReason,
          recommendations: aiData.recommendations,
        });
        
        setAlternativeReleases(aiData.alternativeReleases || []);
        setSelectedAlternative(null);
        setShowStatusDialog(true);
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        toast({
          title: "Kein Album erkannt",
          description: "Die KI konnte keine Album-Informationen aus dem Bild extrahieren.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Image analysis error:', error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Bildanalyse fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setIsBarcodeLoading(false);
    }
  };

  const handleStatusSelection = async (status: RecordStatus) => {
    if (pendingBarcodeData) {
      let finalCoverArt = pendingBarcodeData.coverArt;
      
      // If no cover was found, try to fetch it with the new metadata
      if (!finalCoverArt && (pendingBarcodeData.label || pendingBarcodeData.catalogNumber)) {
        console.log('No cover found, retrying with new metadata:', {
          label: pendingBarcodeData.label,
          catalogNumber: pendingBarcodeData.catalogNumber
        });
        
        try {
          const { data: retryData } = await supabase.functions.invoke('complete-record', {
            body: {
              artist: pendingBarcodeData.artist,
              album: pendingBarcodeData.album,
              label: pendingBarcodeData.label,
              catalogNumber: pendingBarcodeData.catalogNumber,
            }
          });
          
          if (retryData?.data?.coverArtBase64 || retryData?.data?.coverArtUrl) {
            finalCoverArt = retryData.data.coverArtBase64 || retryData.data.coverArtUrl;
            console.log('Found cover on retry with metadata');
          }
        } catch (retryError) {
          console.log('Retry cover lookup failed:', retryError);
        }
      }
      
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
        coverArt: finalCoverArt || prev.coverArt,
        audiophileAssessment: pendingBarcodeData.audiophileAssessment || prev.audiophileAssessment,
        artisticAssessment: pendingBarcodeData.artisticAssessment || prev.artisticAssessment,
        recordingQuality: pendingBarcodeData.recordingQuality || prev.recordingQuality,
        masteringQuality: pendingBarcodeData.masteringQuality || prev.masteringQuality,
        artisticRating: pendingBarcodeData.artisticRating || prev.artisticRating,
        criticScore: pendingBarcodeData.criticScore || prev.criticScore,
        criticReviews: pendingBarcodeData.criticReviews || prev.criticReviews,
        vinylRecommendation: pendingBarcodeData.vinylRecommendation || prev.vinylRecommendation,
        recommendationReason: pendingBarcodeData.recommendationReason || prev.recommendationReason,
        recommendations: pendingBarcodeData.recommendations || prev.recommendations,
        moods: pendingBarcodeData.moods?.length ? pendingBarcodeData.moods : prev.moods,
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
      // Clear draft after successful save
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasDraft(false);
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
        {showSmartScanner && (
          <SmartScanner
            onBarcodeDetected={handleBarcodeScan}
            onImageCaptured={handleImageAnalysis}
            onClose={() => setShowSmartScanner(false)}
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
            <h1 className="text-3xl md:text-4xl font-bold gradient-text">
              {isEditing ? "Tonträger bearbeiten" : "Neuer Tonträger"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditing
                ? "Aktualisiere die Informationen"
                : "Füge einen neuen Tonträger zu deiner Sammlung hinzu"}
            </p>
            {/* Autosave Status */}
            {!isEditing && (lastSaved || hasDraft) && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <SaveIcon className="w-3 h-3" />
                  {lastSaved ? `Entwurf gespeichert ${formatRelativeTime(lastSaved)}` : "Entwurf vorhanden"}
                </span>
                {hasDraft && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearDraft}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Verwerfen
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSmartScanner(true)}
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
              <CardTitle className="text-lg flex items-center gap-2">
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
              <CardTitle className="text-lg">Grundinformationen</CardTitle>
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
              <CardTitle className="text-lg">Format & Status</CardTitle>
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

          {/* Kaufinformationen */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Kaufinformationen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Kaufpreis (CHF)</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    step="0.05"
                    min="0"
                    placeholder="z.B. 29.90"
                    value={formData.purchasePrice || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ 
                        ...prev, 
                        purchasePrice: e.target.value ? parseFloat(e.target.value) : undefined 
                      }))
                    }
                    className="bg-card border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Kaufdatum</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, purchaseDate: e.target.value }))
                    }
                    className="bg-card border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseLocation">Kaufort</Label>
                  <Input
                    id="purchaseLocation"
                    placeholder="z.B. Recordshop Zürich"
                    value={formData.purchaseLocation || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, purchaseLocation: e.target.value }))
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
              <CardTitle className="text-lg">Bewertungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Deine Bewertung</Label>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="criticScore">Kritiker-Score (0-100)</Label>
                <Input
                  id="criticScore"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="z.B. 85"
                  value={formData.criticScore ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ 
                      ...prev, 
                      criticScore: e.target.value ? parseInt(e.target.value) : undefined 
                    }))
                  }
                  className="bg-card border-border/50 max-w-[150px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Vinyl-Empfehlung */}
          {formData.format === "vinyl" && (
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Disc3 className="w-5 h-5 text-primary" />
                  Vinyl-Empfehlung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Empfehlung</Label>
                  <Select
                    value={formData.vinylRecommendation || ""}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ 
                        ...prev, 
                        vinylRecommendation: v as "must-have" | "nice-to-have" | "stream-instead" | undefined 
                      }))
                    }
                  >
                    <SelectTrigger className="bg-card border-border/50">
                      <SelectValue placeholder="Auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="must-have">Must-Have</SelectItem>
                      <SelectItem value="nice-to-have">Nice-to-Have</SelectItem>
                      <SelectItem value="stream-instead">Streamen reicht</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recommendationReason">Begründung</Label>
                  <Textarea
                    id="recommendationReason"
                    placeholder="Warum lohnt sich diese Vinyl-Ausgabe?"
                    value={formData.recommendationReason || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, recommendationReason: e.target.value }))
                    }
                    className="bg-card border-border/50 min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* KI-Bewertungen */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
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
                <CardTitle className="text-lg flex items-center gap-2">
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
                    <div key={index} className="bg-muted/50 rounded-lg p-4 space-y-3">
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
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const searchQuery = encodeURIComponent(`${rec.artist} ${rec.album}`);
                            window.open(`https://tidal.com/search?q=${searchQuery}`, '_blank');
                          }}
                          className="gap-1.5 text-xs"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Tidal
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const searchQuery = encodeURIComponent(`${rec.artist} ${rec.album}`);
                            window.open(`https://open.spotify.com/search/${searchQuery}`, '_blank');
                          }}
                          className="gap-1.5 text-xs"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Spotify
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Check if album already exists in collection or wishlist
                            const existingRecord = records.find(
                              r => r.artist.toLowerCase() === rec.artist.toLowerCase() && 
                                   r.album.toLowerCase() === rec.album.toLowerCase()
                            );
                            
                            if (existingRecord) {
                              const location = existingRecord.status === 'owned' ? 'Sammlung' : 'Wunschliste';
                              toast({
                                title: "Album bereits vorhanden",
                                description: `${rec.artist} – ${rec.album} ist bereits in deiner ${location}.`,
                                variant: "destructive",
                              });
                              return;
                            }
                            
                            addRecord({
                              artist: rec.artist,
                              album: rec.album,
                              year: rec.year || new Date().getFullYear(),
                              genre: formData.genre || [],
                              label: '',
                              format: 'vinyl',
                              status: 'wishlist',
                              myRating: 0,
                              coverArt: rec.coverArt,
                            });
                            toast({
                              title: "Zur Wunschliste hinzugefügt",
                              description: `${rec.artist} – ${rec.album}`,
                            });
                          }}
                          className="gap-1.5 text-xs"
                        >
                          <Plus className="w-3 h-3" />
                          Wunschliste
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Moods / Stimmungen */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Stimmungen
              </CardTitle>
              <CardDescription>
                Beschreibe die emotionale Atmosphäre des Albums
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MoodInput
                moods={formData.moods || []}
                onChange={(moods) => setFormData((prev) => ({ ...prev, moods }))}
                placeholder="Stimmung hinzufügen (z.B. entspannend, energiegeladen)..."
              />
            </CardContent>
          </Card>

          {/* Tags / Keywords */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Stichworte</CardTitle>
              <CardDescription>
                Füge Stichworte für Instrumente, Anlässe, Stile hinzu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TagInput
                tags={formData.tags || []}
                onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))}
                placeholder="Stichwort hinzufügen (z.B. Klavier, Live, Sommer)..."
              />
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Persönliche Notizen</CardTitle>
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
