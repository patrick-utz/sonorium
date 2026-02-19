import { AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  confidence?: "high" | "medium" | "low";
  source?: "discogs" | "musicbrainz" | "itunes" | "deezer" | "user-upload" | "user-url" | "ai-extracted" | "simplified";
  verified?: boolean;
  className?: string;
}

export function ConfidenceBadge({
  confidence = "medium",
  source,
  verified,
  className,
}: ConfidenceBadgeProps) {
  const getSourceLabel = (src?: string) => {
    const sourceMap: Record<string, { label: string; color: string }> = {
      "discogs": { label: "Discogs", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
      "musicbrainz": { label: "MusicBrainz", color: "bg-orange-500/10 text-orange-700 border-orange-200" },
      "itunes": { label: "iTunes", color: "bg-pink-500/10 text-pink-700 border-pink-200" },
      "deezer": { label: "Deezer", color: "bg-purple-500/10 text-purple-700 border-purple-200" },
      "user-upload": { label: "Benutzer hochgeladen", color: "bg-green-500/10 text-green-700 border-green-200" },
      "user-url": { label: "Benutzer URL", color: "bg-cyan-500/10 text-cyan-700 border-cyan-200" },
      "ai-extracted": { label: "KI extrahiert", color: "bg-indigo-500/10 text-indigo-700 border-indigo-200" },
      "simplified": { label: "Vereinfacht", color: "bg-gray-500/10 text-gray-700 border-gray-200" },
    };
    return sourceMap[src || ""] || { label: "Unbekannt", color: "bg-gray-500/10 text-gray-700 border-gray-200" };
  };

  const getConfidenceInfo = (conf: string) => {
    const confidenceMap: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
      "high": {
        label: "Hohe Konfidenz",
        icon: <CheckCircle2 className="w-4 h-4" />,
        color: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
      },
      "medium": {
        label: "Mittlere Konfidenz",
        icon: <HelpCircle className="w-4 h-4" />,
        color: "bg-amber-500/10 text-amber-700 border-amber-200",
      },
      "low": {
        label: "Niedrige Konfidenz",
        icon: <AlertCircle className="w-4 h-4" />,
        color: "bg-red-500/10 text-red-700 border-red-200",
      },
    };
    return confidenceMap[conf] || confidenceMap["medium"];
  };

  const sourceInfo = getSourceLabel(source);
  const confidenceInfo = getConfidenceInfo(confidence);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Verified Badge */}
      {verified && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-200 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" />
          Verifiziert
        </div>
      )}

      {/* Confidence Badge */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium",
          confidenceInfo.color
        )}
        title={`Konfidenzlevel: ${confidenceInfo.label}`}
      >
        {confidenceInfo.icon}
        {confidenceInfo.label}
      </div>

      {/* Source Badge */}
      {source && (
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium",
            sourceInfo.color
          )}
          title={`Datenquelle: ${sourceInfo.label}`}
        >
          {sourceInfo.label}
        </div>
      )}
    </div>
  );
}
