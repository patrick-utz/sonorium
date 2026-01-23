import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { 
  Settings2, 
  Disc3, 
  Sparkles, 
  Store, 
  Save, 
  X, 
  User,
  LogOut
} from "lucide-react";
import { AudiophileProfile, DEFAULT_SHOPS, DEFAULT_MOODS } from "@/types/audiophileProfile";
import { useAudiophileProfile, defaultProfile } from "@/context/AudiophileProfileContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { MoodsConfig } from "@/components/MoodsConfig";
import { ShopsConfig } from "@/components/research/ShopsConfig";

export default function Profile() {
  const [searchParams] = useSearchParams();
  const { profile, updateProfile, hasProfile } = useAudiophileProfile();
  const { user, signOut } = useAuth();
  
  // Get initial tab from URL params
  const initialTab = searchParams.get("tab") || "equipment";
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const [formData, setFormData] = useState<AudiophileProfile>({
    ...(profile || defaultProfile),
    shops: profile?.shops || DEFAULT_SHOPS,
    moods: profile?.moods || DEFAULT_MOODS,
  });
  
  const [genreInput, setGenreInput] = useState("");
  const [favLabelInput, setFavLabelInput] = useState("");
  const [avoidLabelInput, setAvoidLabelInput] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Sync tab with URL params
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["equipment", "preferences", "moods", "shops"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Update form when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        ...profile,
        shops: profile.shops || DEFAULT_SHOPS,
        moods: profile.moods || DEFAULT_MOODS,
      });
    }
  }, [profile]);

  const handleSave = async () => {
    await updateProfile(formData);
    setHasChanges(false);
    toast.success("Profil gespeichert", {
      description: "Deine Einstellungen wurden aktualisiert.",
    });
  };

  const updateFormField = (updates: Partial<AudiophileProfile>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const addToList = (field: 'genres' | 'favoriteLabels' | 'avoidLabels', value: string, setValue: (v: string) => void) => {
    if (value.trim() && !formData.preferences[field].includes(value.trim())) {
      updateFormField({
        preferences: {
          ...formData.preferences,
          [field]: [...formData.preferences[field], value.trim()],
        },
      });
      setValue("");
    }
  };

  const removeFromList = (field: 'genres' | 'favoriteLabels' | 'avoidLabels', value: string) => {
    updateFormField({
      preferences: {
        ...formData.preferences,
        [field]: formData.preferences[field].filter((v) => v !== value),
      },
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-24"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground flex items-center gap-3">
            <User className="w-7 h-7 text-primary" />
            Profil & Einstellungen
          </h1>
          <p className="text-muted-foreground mt-1">
            Verwalte dein Equipment, Vorlieben, Stimmungen und Shops
          </p>
        </div>
        {user && (
          <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Abmelden</span>
          </Button>
        )}
      </motion.div>

      {/* User Info Card */}
      {user && (
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {hasProfile ? "Audiophiles Profil konfiguriert" : "Noch kein Profil eingerichtet"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Settings Tabs */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              Audiophile Einstellungen
            </CardTitle>
            <CardDescription>
              Konfiguriere dein Equipment und Vorlieben für personalisierte Empfehlungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6 h-auto">
                <TabsTrigger value="equipment" className="gap-2">
                  <Disc3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Equipment</span>
                  <span className="sm:hidden">Gear</span>
                </TabsTrigger>
                <TabsTrigger value="preferences" className="gap-2">
                  <Settings2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Vorlieben</span>
                  <span className="sm:hidden">Prefs</span>
                </TabsTrigger>
                <TabsTrigger value="moods" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Stimmungen</span>
                </TabsTrigger>
                <TabsTrigger value="shops" className="gap-2">
                  <Store className="w-4 h-4" />
                  <span>Shops</span>
                </TabsTrigger>
              </TabsList>

              {/* Equipment Tab */}
              <TabsContent value="equipment" className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="turntable">Plattenspieler</Label>
                    <Input
                      id="turntable"
                      placeholder="z.B. Rega Planar 3"
                      value={formData.equipment.turntable}
                      onChange={(e) => updateFormField({
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
                      onChange={(e) => updateFormField({
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
                      onChange={(e) => updateFormField({
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
                      onChange={(e) => updateFormField({
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
                      onChange={(e) => updateFormField({
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
                      onChange={(e) => updateFormField({
                        equipment: { ...formData.equipment, other: e.target.value }
                      })}
                    />
                  </div>
                </div>

                {/* Media Format */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <Label>Bevorzugter Tonträger</Label>
                  <RadioGroup
                    value={formData.mediaFormat}
                    onValueChange={(value) => updateFormField({
                      mediaFormat: value as 'vinyl' | 'cd' | 'both'
                    })}
                    className="flex gap-6"
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

                {/* Save Button for Equipment */}
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
                    <Save className="w-4 h-4" />
                    Speichern
                  </Button>
                </div>
              </TabsContent>

              {/* Preferences Tab */}
              <TabsContent value="preferences" className="space-y-6">
                {/* Sound Preference */}
                <div className="space-y-3">
                  <Label>Klangvorliebe</Label>
                  <RadioGroup
                    value={formData.preferences.soundPreference}
                    onValueChange={(value) => updateFormField({
                      preferences: { ...formData.preferences, soundPreference: value as any }
                    })}
                    className="grid grid-cols-2 gap-3"
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
                    onValueChange={(value) => updateFormField({
                      preferences: { ...formData.preferences, listeningStyle: value as any }
                    })}
                    className="grid grid-cols-2 gap-3"
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
                <div className="space-y-3 pt-4 border-t border-border">
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
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
                    <Save className="w-4 h-4" />
                    Speichern
                  </Button>
                </div>
              </TabsContent>

              {/* Moods Tab - Uses existing MoodsConfig component */}
              <TabsContent value="moods">
                <MoodsConfig />
              </TabsContent>

              {/* Shops Tab - Uses existing ShopsConfig component */}
              <TabsContent value="shops">
                <Card className="border-0 shadow-none bg-transparent">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="flex items-center gap-2">
                      <Store className="w-5 h-5 text-primary" />
                      Shops für Preisvergleich
                    </CardTitle>
                    <CardDescription>
                      Konfiguriere deine bevorzugten Shops für die Recherche und den Preisvergleich
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0">
                    <ShopsConfig />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
