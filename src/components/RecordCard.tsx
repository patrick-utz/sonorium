import { Record, VinylRecommendation } from "@/types/record";
import { FormatBadge } from "./FormatBadge";
import { StarRating } from "./StarRating";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Trash2, Music, Heart, Star, ThumbsUp, Radio, RefreshCw } from "lucide-react";
import { useState, memo } from "react";
import { useAudiophileProfile } from "@/context/AudiophileProfileContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RecordCardProps {
  record: Record;
  onClick?: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
  onRatingChange?: (rating: number) => void;
  onReloadCover?: () => Promise<void>;
  className?: string;
}

const getVinylRecommendationLabel = (rec: VinylRecommendation | undefined) => {
  switch (rec) {
    case "must-have":
      return { label: "MUST-HAVE", icon: Star, colorClass: "text-amber-500" };
    case "nice-to-have":
      return { label: "NICE TO HAVE", icon: ThumbsUp, colorClass: "text-emerald-500" };
    case "stream-instead":
      return { label: "STREAM", icon: Radio, colorClass: "text-blue-400" };
    default:
      return null;
  }
};

function RecordCardComponent({ record, onClick, onDelete, onToggleFavorite, onRatingChange, onReloadCover, className }: RecordCardProps) {
  const [isReloadingCover, setIsReloadingCover] = useState(false);
  const { profile } = useAudiophileProfile();

  // Get configured moods that match this record's moods (with colors)
  const recordMoodsWithColors = (record.moods || [])
    .map(moodName => {
      const configured = (profile?.moods || []).find(m => m.name === moodName && m.enabled);
      return configured ? { name: moodName, color: configured.color, icon: configured.icon } : null;
    })
    .filter(Boolean)
    .slice(0, 3); // Show max 3 mood indicators

  const handleReloadCover = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onReloadCover || isReloadingCover) return;
    
    setIsReloadingCover(true);
    try {
      await onReloadCover();
    } finally {
      setIsReloadingCover(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer rounded-xl overflow-hidden",
        "bg-card shadow-card hover:shadow-hover transition-shadow duration-300",
        "max-w-xs", // Limit max width to 320px for better overview (like Tidal)
        className
      )}
    >
      {/* Cover Image - Click to open detail */}
      <div className="aspect-square relative overflow-hidden">
        {record.coverArt ? (
          <img
            src={record.coverArt}
            alt={`${record.artist} - ${record.album}`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-vinyl flex items-center justify-center">
            <div className="w-1/2 h-1/2 vinyl-disc" />
          </div>
        )}
        
        {/* Favorite toggle button - click heart to toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.();
          }}
          className={cn(
            "absolute top-3 left-3 p-2 rounded-full backdrop-blur-sm transition-all duration-300",
            record.isFavorite 
              ? "bg-background/90" 
              : "bg-background/60 opacity-0 group-hover:opacity-100 hover:bg-background/90"
          )}
          title={record.isFavorite ? "Von Favoriten entfernen" : "Zu Favoriten hinzufügen"}
        >
          <Heart className={cn(
            "w-4 h-4 transition-colors",
            record.isFavorite ? "heart-favorite fill-current" : "text-foreground/70 hover:text-foreground"
          )} />
        </button>
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Reload Cover Button */}
        {onReloadCover && (
          <button
            onClick={handleReloadCover}
            disabled={isReloadingCover}
            className="absolute top-3 left-14 p-2 rounded-full bg-primary/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-primary hover:scale-110"
            title="Cover nachladen"
          >
            <RefreshCw className={cn("w-4 h-4 text-primary-foreground", isReloadingCover && "animate-spin")} />
          </button>
        )}

        {/* Delete Button */}
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-3 left-3 p-2 rounded-full bg-destructive/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-destructive hover:scale-110"
                title="Löschen"
              >
                <Trash2 className="w-4 h-4 text-destructive-foreground" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Tonträger löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Möchtest du "{record.album}" von {record.artist} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        
        {/* Format Badge */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <FormatBadge format={record.format} />
        </div>
        
        {/* Info on hover - only year and label, no stars */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none">
          <p className="text-primary-foreground/80 text-sm">{record.year}</p>
          <p className="text-primary-foreground/60 text-xs truncate">{record.label}</p>
        </div>
      </div>
      
      {/* Card Footer - Click to open detail */}
      <div className="p-4 space-y-2">
        {/* Mood color indicators */}
        {recordMoodsWithColors.length > 0 && (
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-1.5 mb-1">
              {recordMoodsWithColors.map((mood, idx) => (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <div
                      className="w-2 h-2 rounded-full cursor-default"
                      style={{ backgroundColor: mood?.color ? `hsl(${mood.color})` : 'hsl(var(--muted-foreground))' }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="flex items-center gap-1.5">
                    <span>{mood?.icon}</span>
                    <span>{mood?.name}</span>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        )}
        <h3 className="font-semibold text-foreground truncate">
          {record.album}
        </h3>
        <p className="text-muted-foreground text-sm truncate">
          {record.artist}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{record.year}</span>
          {record.label && (
            <>
              <span>•</span>
              <span className="truncate">{record.label}</span>
            </>
          )}
        </div>
        
        {/* Vinyl Recommendation + Rating Row */}
        <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            {/* Star Rating - always show */}
            <StarRating 
              rating={record.myRating} 
              size="sm" 
              interactive={!!onRatingChange}
              onChange={onRatingChange}
            />
            {/* Vinyl Recommendation - show if available */}
            {record.vinylRecommendation && (() => {
              const recInfo = getVinylRecommendationLabel(record.vinylRecommendation);
              if (!recInfo) return null;
              const Icon = recInfo.icon;
              return (
                <span className={cn("text-xs font-medium flex items-center gap-1", recInfo.colorClass)}>
                  <Icon className="w-3.5 h-3.5" />
                  {recInfo.label}
                </span>
              );
            })()}
          </div>
          {record.recordingQuality && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="text-primary">♪</span>
              {record.recordingQuality}/5
            </span>
          )}
        </div>
        
        {/* Streaming Links */}
        <div className="flex items-center gap-2 pt-2 flex-wrap">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const query = encodeURIComponent(`${record.artist} ${record.album}`);
              window.open(`https://open.spotify.com/search/${query}`, '_blank');
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[#1DB954]/10 text-[#1DB954] hover:bg-[#1DB954]/20 transition-colors"
            title="Auf Spotify suchen"
          >
            <Music className="w-3 h-3" />
            Spotify
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const query = encodeURIComponent(`${record.artist} ${record.album}`);
              window.open(`https://tidal.com/search?q=${query}`, '_blank');
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[#00FFFF]/10 text-[#00BFBF] hover:bg-[#00FFFF]/20 transition-colors"
            title="Auf Tidal suchen"
          >
            <Music className="w-3 h-3" />
            Tidal
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const query = encodeURIComponent(`${record.artist} ${record.album}`);
              window.open(`https://music.apple.com/search?term=${query}`, '_blank');
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[#FA2D48]/10 text-[#FA2D48] hover:bg-[#FA2D48]/20 transition-colors"
            title="Auf Apple Music suchen"
          >
            <Music className="w-3 h-3" />
            Apple
          </button>
        </div>
      </div>
    </motion.div>
  );
}

RecordCardComponent.displayName = "RecordCard";

export const RecordCard = memo(RecordCardComponent);