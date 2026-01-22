import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Sparkles } from "lucide-react";

interface MoodInputProps {
  moods: string[];
  onChange: (moods: string[]) => void;
  placeholder?: string;
}

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

export function MoodInput({ moods, onChange, placeholder = "Stimmung hinzufügen..." }: MoodInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addMood = (mood: string) => {
    const trimmedMood = mood.trim().toLowerCase();
    if (trimmedMood && !moods.includes(trimmedMood)) {
      onChange([...moods, trimmedMood]);
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeMood = (moodToRemove: string) => {
    onChange(moods.filter((mood) => mood !== moodToRemove));
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
      !moods.includes(s.toLowerCase())
  );

  return (
    <div className="space-y-2">
      {moods.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {moods.map((mood) => (
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

      {/* Input */}
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

      {moods.length === 0 && !inputValue && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground mr-1">Vorschläge:</span>
          {MOOD_SUGGESTIONS.slice(0, 6).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addMood(suggestion)}
              className="text-xs px-2 py-0.5 rounded-full bg-accent hover:bg-accent/80 text-accent-foreground transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { MOOD_SUGGESTIONS };
