import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Save, Settings2 } from "lucide-react";
import { AudiophileProfile } from "@/types/audiophileProfile";
import { useAudiophileProfile, defaultProfile } from "@/context/AudiophileProfileContext";
import { toast } from "@/hooks/use-toast";

interface AudiophileProfileEditorProps {
  onClose?: () => void;
  compact?: boolean;
}

export function AudiophileProfileEditor({ onClose, compact = false }: AudiophileProfileEditorProps) {
  const { profile, updateProfile } = useAudiophileProfile();
  const [formData, setFormData] = useState<AudiophileProfile>(profile || defaultProfile);
  const [genreInput, setGenreInput] = useState("");
  const [favLabelInput, setFavLabelInput] = useState("");
  const [avoidLabelInput, setAvoidLabelInput] = useState("");

  const handleSave = () => {
    updateProfile(formData);
    toast({
      title: "Profil gespeichert",
      description: "Deine audiophilen Einstellungen wurden aktualisiert.",
    });
    onClose?.();
  };

  const addToList = (field: 'genres' | 'favoriteLabels' | 'avoidLabels', value: string, setValue: (v: string) => void) => {
    if (value.trim() && !formData.preferences[field].includes(value.trim())) {
      setFormData({
        ...formData,
        preferences: {
          ...formData.preferences,
          [field]: [...formData.preferences[field], value.trim()],
        },
      });
      setValue("");
    }
  };

  const removeFromList = (field: 'genres' | 'favoriteLabels' | 'avoidLabels', value: string) => {
    setFormData({
      ...formData,
      preferences: {
        ...formData.preferences,
        [field]: formData.preferences[field].filter((v) => v !== value),
      },
    });
  };

  return (
    <Card className={compact ? "border-0 shadow-none" : ""}>
      {!compact && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Audiophiles Profil
          </CardTitle>
          <CardDescription>
            Dein Equipment und Vorlieben für personalisierte Empfehlungen
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className={compact ? "p-0" : ""}>
        <div className="space-y-6">
          {/* Equipment */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Equipment</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="turntable">Plattenspieler</Label>
                <Input
                  id="turntable"
                  placeholder="z.B. Rega Planar 3"
                  value={formData.equipment.turntable}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipment: { ...formData.equipment, turntable: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amplifier">Verstärker</Label>
                <Input
                  id="amplifier"
                  placeholder="z.B. Primare I25"
                  value={formData.equipment.amplifier}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipment: { ...formData.equipment, amplifier: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="speakers">Lautsprecher</Label>
                <Input
                  id="speakers"
                  placeholder="z.B. Genelec 8030"
                  value={formData.equipment.speakers}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipment: { ...formData.equipment, speakers: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cdPlayer">CD-Player</Label>
                <Input
                  id="cdPlayer"
                  placeholder="z.B. Marantz CD6007"
                  value={formData.equipment.cdPlayer || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipment: { ...formData.equipment, cdPlayer: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dac">DAC / Digitalvorstufe</Label>
                <Input
                  id="dac"
                  placeholder="z.B. Chord Qutest, RME ADI-2"
                  value={formData.equipment.dac || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipment: { ...formData.equipment, dac: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="other">Sonstiges</Label>
                <Input
                  id="other"
                  placeholder="z.B. Phono-Vorstufe, Kabel"
                  value={formData.equipment.other || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    equipment: { ...formData.equipment, other: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>

          {/* Media Format */}
          <div className="space-y-3">
            <Label>Bevorzugter Tonträger</Label>
            <RadioGroup
              value={formData.mediaFormat}
              onValueChange={(value) => setFormData({
                ...formData,
                mediaFormat: value as 'vinyl' | 'cd' | 'both'
              })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="vinyl" id="vinyl" />
                <Label htmlFor="vinyl" className="cursor-pointer">Vinyl (LP)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cd" id="cd" />
                <Label htmlFor="cd" className="cursor-pointer">CD</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="cursor-pointer">Beide</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Sound Preference */}
          <div className="space-y-3">
            <Label>Klangvorliebe</Label>
            <RadioGroup
              value={formData.preferences.soundPreference}
              onValueChange={(value) => setFormData({
                ...formData,
                preferences: { ...formData.preferences, soundPreference: value as any }
              })}
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="warm" id="warm" />
                <Label htmlFor="warm" className="cursor-pointer">Warm & voll</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="neutral" id="neutral" />
                <Label htmlFor="neutral" className="cursor-pointer">Neutral</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="analytical" id="analytical" />
                <Label htmlFor="analytical" className="cursor-pointer">Analytisch</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dynamic" id="dynamic" />
                <Label htmlFor="dynamic" className="cursor-pointer">Dynamisch</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Listening Style */}
          <div className="space-y-3">
            <Label>Hörstil</Label>
            <RadioGroup
              value={formData.preferences.listeningStyle}
              onValueChange={(value) => setFormData({
                ...formData,
                preferences: { ...formData.preferences, listeningStyle: value as any }
              })}
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="critical" id="critical" />
                <Label htmlFor="critical" className="cursor-pointer">Kritisch / Audiophil</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="relaxed" id="relaxed" />
                <Label htmlFor="relaxed" className="cursor-pointer">Entspannt</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="background" id="background" />
                <Label htmlFor="background" className="cursor-pointer">Hintergrund</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mixed" id="mixed" />
                <Label htmlFor="mixed" className="cursor-pointer">Gemischt</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Genres */}
          <div className="space-y-3">
            <Label>Bevorzugte Genres</Label>
            <div className="flex gap-2">
              <Input
                placeholder="z.B. Jazz, Klassik..."
                value={genreInput}
                onChange={(e) => setGenreInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToList('genres', genreInput, setGenreInput))}
              />
              <Button type="button" variant="secondary" onClick={() => addToList('genres', genreInput, setGenreInput)}>
                +
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.preferences.genres.map((genre) => (
                <Badge key={genre} variant="secondary" className="gap-1">
                  {genre}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromList('genres', genre)} />
                </Badge>
              ))}
            </div>
          </div>

          {/* Favorite Labels */}
          <div className="space-y-3">
            <Label>Bevorzugte Labels</Label>
            <div className="flex gap-2">
              <Input
                placeholder="z.B. Analogue Productions, Blue Note..."
                value={favLabelInput}
                onChange={(e) => setFavLabelInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToList('favoriteLabels', favLabelInput, setFavLabelInput))}
              />
              <Button type="button" variant="secondary" onClick={() => addToList('favoriteLabels', favLabelInput, setFavLabelInput)}>
                +
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.preferences.favoriteLabels.map((label) => (
                <Badge key={label} variant="outline" className="gap-1 border-accent/50 text-accent">
                  {label}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromList('favoriteLabels', label)} />
                </Badge>
              ))}
            </div>
          </div>

          {/* Avoid Labels */}
          <div className="space-y-3">
            <Label>Zu vermeidende Labels</Label>
            <div className="flex gap-2">
              <Input
                placeholder="z.B. DOL, WaxTime..."
                value={avoidLabelInput}
                onChange={(e) => setAvoidLabelInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToList('avoidLabels', avoidLabelInput, setAvoidLabelInput))}
              />
              <Button type="button" variant="secondary" onClick={() => addToList('avoidLabels', avoidLabelInput, setAvoidLabelInput)}>
                +
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.preferences.avoidLabels.map((label) => (
                <Badge key={label} variant="outline" className="gap-1 border-destructive/50 text-destructive">
                  {label}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromList('avoidLabels', label)} />
                </Badge>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-2 pt-4">
            {onClose && (
              <Button type="button" variant="ghost" onClick={onClose}>
                Abbrechen
              </Button>
            )}
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Profil speichern
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
