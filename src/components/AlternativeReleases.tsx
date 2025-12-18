import { AlternativeRelease } from "@/types/record";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Star, Award, Disc3, RefreshCw, Music } from "lucide-react";

interface AlternativeReleasesProps {
  releases: AlternativeRelease[];
  onSelect: (release: AlternativeRelease) => void;
  selectedMbid?: string;
}

const qualityConfig = {
  original: {
    label: "Original",
    icon: Award,
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  audiophile: {
    label: "Audiophile",
    icon: Star,
    className: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  },
  remaster: {
    label: "Remaster",
    icon: RefreshCw,
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  reissue: {
    label: "Reissue",
    icon: Disc3,
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  unknown: {
    label: "Unbekannt",
    icon: Music,
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function AlternativeReleases({ releases, onSelect, selectedMbid }: AlternativeReleasesProps) {
  if (!releases || releases.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">
        Alternative Pressungen ({releases.length})
      </h4>
      <ScrollArea className="h-64 rounded-md border border-border/50 bg-card/50">
        <div className="p-2 space-y-1">
          {releases.map((release) => {
            const config = qualityConfig[release.qualityType || "unknown"];
            const Icon = config.icon;
            const isSelected = selectedMbid === release.mbid;

            return (
              <button
                key={release.mbid}
                onClick={() => onSelect(release)}
                className={`w-full text-left p-3 rounded-lg transition-all hover:bg-accent/50 ${
                  isSelected ? "bg-primary/10 ring-1 ring-primary" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-xs ${config.className}`}>
                        <Icon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                      {release.qualityRating && (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < release.qualityRating!
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      {release.year && (
                        <span className="font-medium text-sm">{release.year}</span>
                      )}
                      {release.label && (
                        <span className="text-xs text-muted-foreground">{release.label}</span>
                      )}
                      {release.catalogNumber && (
                        <span className="text-xs font-mono text-primary/80">
                          [{release.catalogNumber}]
                        </span>
                      )}
                    </div>
                    {(release.country || release.format) && (
                      <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                        {release.country && <span>{release.country}</span>}
                        {release.format && <span>• {release.format}</span>}
                      </div>
                    )}
                    {release.qualityNotes && (
                      <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">
                        {release.qualityNotes}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
