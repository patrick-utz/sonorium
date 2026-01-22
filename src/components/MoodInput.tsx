import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Sparkles } from "lucide-react";
import { useAudiophileProfile } from "@/context/AudiophileProfileContext";
import { DEFAULT_MOODS } from "@/types/audiophileProfile";

interface MoodInputProps {
  moods: string[];
  onChange: (moods: string[]) => void;
  placeholder?: string;
}

// Fallback suggestions for free-form input
const MOOD_SUGGESTIONS = [
  // Emotionen
  "entspannend", "energiegeladen", "melancholisch", "fröhlich", "euphorisch",
  "nachdenklich", "romantisch", "düster", "verträumt", "aufwühlend",
  "beruhigend", "nostalgisch", "ekstatisch", "sehnsüchtig", "tröstend",
  // Atmosphäre
  "atmosphärisch", "intim", "episch", "minimalistisch", "hypnotisch",
  "groovend", "tanzbar", "meditativ", "kraftvoll", "sanft",
  // Anlässe
  "Nachtmusik", "Morgenmusik", "zum Arbeiten", "zum Entspannen", "zum Feiern",
  "zum Nachdenken", "für lange Fahrten", "Dinner-Musik", "Hintergrundmusik"
];

export function MoodInput({ moods, onChange, placeholder = "Weitere Stimmung hinzufügen..." }: MoodInputProps) {
  const { profile } = useAudiophileProfile();
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Get configured moods from profile, fallback to defaults
  const configuredMoods = (profile?.moods || DEFAULT_MOODS)
    .filter(m => m.enabled)
    .sort((a, b) => a.priority - b.priority);

  const addMood = (mood: string) => {
    const trimmedMood = mood.trim();
    // Check case-insensitive but preserve case
    if (trimmedMood && !moods.some(m => m.toLowerCase() === trimmedMood.toLowerCase())) {
      onChange([...moods, trimmedMood]);
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeMood = (moodToRemove: string) => {
    onChange(moods.filter((mood) => mood !== moodToRemove));
  };

  const toggleMood = (moodName: string) => {
    if (moods.some(m => m.toLowerCase() === moodName.toLowerCase())) {
      onChange(moods.filter(m => m.toLowerCase() !== moodName.toLowerCase()));
    } else {
      addMood(moodName);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addMood(inputValue);
    } else if (e.key === "Backspace" && !inputValue && moods.length > 0) {
      removeMood(moods[moods.length - 1]);
    }
  };

  const filteredSuggestions = MOOD_SUGGESTIONS.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !moods.some(m => m.toLowerCase() === s.toLowerCase())
  );

  // Check if a mood is selected
  const isMoodSelected = (moodName: string) => 
    moods.some(m => m.toLowerCase() === moodName.toLowerCase());

  // Get color for a configured mood
  const getMoodColor = (moodName: string) => {
    const configuredMood = configuredMoods.find(
      m => m.name.toLowerCase() === moodName.toLowerCase()
    );
    return configuredMood?.color;
  };

  return (
    <div className="space-y-3">
      {/* Configured Mood Quick-Select Buttons */}
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground">Haupt-Stimmungen:</span>
        <div className="flex flex-wrap gap-2">
          {configuredMoods.map((mood) => {
            const isSelected = isMoodSelected(mood.name);
            return (
              <button
                key={mood.id}
                type="button"
                onClick={() => toggleMood(mood.name)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border
                  ${isSelected 
                    ? "bg-muted text-foreground shadow-sm" 
                    : "bg-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground border-transparent"
                  }
                `}
                style={mood.color ? {
                  borderColor: isSelected ? `hsl(${mood.color})` : 'transparent',
                  ...(isSelected && { boxShadow: `0 0 0 1px hsl(${mood.color} / 0.3)` })
                } : undefined}
              >
                <span className="text-base">{mood.icon}</span>
                {mood.name}
                {isSelected && <X className="w-3 h-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom moods that are not in the configured list */}
      {moods.filter(m => !configuredMoods.some(cm => cm.name.toLowerCase() === m.toLowerCase())).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {moods
            .filter(m => !configuredMoods.some(cm => cm.name.toLowerCase() === m.toLowerCase()))
            .map((mood) => (
              <Badge
                key={mood}
                variant="secondary"
                className="gap-1 pr-1 bg-accent text-accent-foreground hover:bg-accent/80"
              >
                <Sparkles className="w-3 h-3" />
                {mood}
                <button
                  type="button"
                  onClick={() => removeMood(mood)}
                  className="ml-1 hover:bg-accent/50 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
        </div>
      )}

      {/* Free-form Input */}
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bg-card border-border/50"
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
            {filteredSuggestions.slice(0, 8).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => addMood(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { MOOD_SUGGESTIONS };

