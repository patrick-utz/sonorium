import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRecords } from "@/context/RecordContext";
import { Record, RecordFormat, RecordStatus, VinylRecommendation } from "@/types/record";
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
import { StarRating } from "@/components/StarRating";
import { ArrowLeft, Save, Upload, Disc3, Disc, Camera } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

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
    }
  );

  const [genreInput, setGenreInput] = useState(existingRecord?.genre.join(", ") || "");

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

    const genres = genreInput
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);

    const recordData = {
      ...formData,
      genre: genres,
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

  return (
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cover Art Upload */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Cover-Bild
            </CardTitle>
            <CardDescription>
              Lade ein Foto des Covers oder Labels hoch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-start">
              <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {formData.coverArt ? (
                  <img
                    src={formData.coverArt}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Upload className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Cover-URL eingeben..."
                  value={formData.coverArt || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, coverArt: e.target.value }))
                  }
                  className="bg-card border-border/50"
                />
                <p className="text-xs text-muted-foreground">
                  Füge eine URL zu einem Bild ein oder lade später ein Foto hoch
                </p>
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

            <div className="space-y-2">
              <Label htmlFor="genre">Genres</Label>
              <Input
                id="genre"
                placeholder="z.B. Jazz, Modal Jazz"
                value={genreInput}
                onChange={(e) => setGenreInput(e.target.value)}
                className="bg-card border-border/50"
              />
              <p className="text-xs text-muted-foreground">
                Mehrere Genres mit Komma trennen
              </p>
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
  );
}
