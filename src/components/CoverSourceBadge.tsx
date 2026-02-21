import { Record } from "@/types/record";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Disc3,
  Music,
  Database,
  Upload,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CoverSourceBadgeProps {
  coverSource?: Record["coverArtSource"];
  coverArtVerified?: boolean;
  coverArtVerifiedAt?: string;
  aiConfidence?: Record["aiConfidence"];
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

const SOURCE_CONFIG = {
  discogs: {
    label: "Discogs",
    icon: Database,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    description: "Official Discogs database",
  },
  musicbrainz: {
    label: "MusicBrainz",
    icon: Music,
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    description: "MusicBrainz database",
  },
  itunes: {
    label: "iTunes",
    icon: Music,
    color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    description: "iTunes Store",
  },
  deezer: {
    label: "Deezer",
    icon: Music,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    description: "Deezer Music Service",
  },
  "user-upload": {
    label: "User Upload",
    icon: Upload,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    description: "Uploaded by user",
  },
  "user-url": {
    label: "User URL",
    icon: LinkIcon,
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    description: "URL provided by user",
  },
  "ai-extracted": {
    label: "AI Extracted",
    icon: Sparkles,
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    description: "Extracted from label photo via AI",
  },
  simplified: {
    label: "Simplified",
    icon: Music,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    description: "Generic cover art",
  },
};

const CONFIDENCE_CONFIG = {
  high: {
    label: "High",
    icon: CheckCircle2,
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    description: "High confidence in this data",
  },
  medium: {
    label: "Medium",
    icon: HelpCircle,
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    description: "Medium confidence in this data",
  },
  low: {
    label: "Low",
    icon: AlertCircle,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    description: "Low confidence in this data",
  },
};

export function CoverSourceBadge({
  coverSource,
  coverArtVerified,
  coverArtVerifiedAt,
  aiConfidence,
  size = "md",
  showTooltip = true,
}: CoverSourceBadgeProps) {
  // Don't show badge if no data
  if (!coverSource && !coverArtVerified && !aiConfidence) {
    return null;
  }

  const sourceConfig = coverSource ? SOURCE_CONFIG[coverSource] : null;
  const confidenceConfig = aiConfidence ? CONFIDENCE_CONFIG[aiConfidence] : null;

  // Determine primary display
  let primaryIcon = null;
  let primaryLabel = "";
  let primaryColor = "";
  let primaryDescription = "";

  if (coverArtVerified) {
    // Verified takes priority
    primaryIcon = CheckCircle2;
    primaryLabel = `✓ Verified from ${sourceConfig?.label || "source"}`;
    primaryColor =
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    primaryDescription = `Verified to match pressing${
      coverArtVerifiedAt
        ? ` on ${new Date(coverArtVerifiedAt).toLocaleDateString("de-DE")}`
        : ""
    }`;
  } else if (sourceConfig) {
    // Source display
    const Icon = sourceConfig.icon;
    primaryIcon = Icon;
    primaryLabel = sourceConfig.label;
    primaryColor = sourceConfig.color;
    primaryDescription = sourceConfig.description;
  } else if (confidenceConfig) {
    // Fallback to confidence
    const Icon = confidenceConfig.icon;
    primaryIcon = Icon;
    primaryLabel = confidenceConfig.label;
    primaryColor = confidenceConfig.color;
    primaryDescription = confidenceConfig.description;
  }

  if (!primaryIcon) {
    return null;
  }

  const Icon = primaryIcon;

  const badgeContent = (
    <Badge
      variant="secondary"
      className={`gap-1 ${primaryColor} cursor-help ${
        size === "sm" ? "text-xs px-2 py-0.5" : size === "lg" ? "text-sm" : ""
      }`}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
      <span>{primaryLabel}</span>
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">{primaryDescription}</p>
            {!coverArtVerified && sourceConfig && (
              <div className="text-xs">
                <p className="font-medium">Source:</p>
                <p>{sourceConfig.description}</p>
              </div>
            )}
            {confidenceConfig && !coverArtVerified && (
              <div className="text-xs">
                <p className="font-medium">AI Confidence:</p>
                <p>{confidenceConfig.description}</p>
              </div>
            )}
            {!coverArtVerified && (
              <p className="text-xs italic text-gray-400">
                💡 Consider verifying this cover matches your pressing
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default CoverSourceBadge;
