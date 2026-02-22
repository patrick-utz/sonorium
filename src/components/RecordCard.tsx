import { Record } from "@/types/record";
import { FormatBadge } from "./FormatBadge";
import { StarRating } from "./StarRating";
import { CoverSourceBadge } from "./CoverSourceBadge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Trash2, Heart, RefreshCw, Eye, Package } from "lucide-react";
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
  onToggleOrdered?: () => void;
  onRatingChange?: (rating: number) => void;
  onReloadCover?: () => Promise<void>;
  className?: string;
}

function RecordCardComponent({ record, onClick, onDelete, onToggleFavorite, onToggleOrdered, onRatingChange, onReloadCover, className }: RecordCardProps) {
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
      whileHover={{ y: -8, scale: 1.05 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer rounded-xl overflow-hidden",
        "bg-card shadow-card hover:shadow-lg transition-all duration-300",
        "border border-border/30 hover:border-primary/50",
        "w-full", // Full width for responsive grid (Tidal-inspired larger covers)
        className
      )}
    >
      {/* Cover Image - Click to open detail */}
      <div className="aspect-square relative overflow-hidden bg-gradient-vinyl">
        {record.coverArt ? (
          <img
            src={record.coverArt}
            alt={`${record.artist} - ${record.album}`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-1/2 h-1/2 vinyl-disc" />
          </div>
        )}

        {/* Gradient overlay on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />

        {/* Center action button on hover */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          whileHover={{ scale: 1.1 }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0 }}
        >
          <div className="p-4 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all">
            <Eye className="w-6 h-6 text-white" />
          </div>
        </motion.button>

        {/* Top-left: Favorite button (always visible when favorited) */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.();
          }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "absolute top-3 left-3 p-2.5 rounded-full transition-all duration-300",
            "backdrop-blur-md z-10",
            record.isFavorite
              ? "bg-red-500/95 hover:bg-red-600 shadow-lg shadow-red-500/50"
              : "bg-white/10 opacity-0 group-hover:opacity-100 hover:bg-red-500/70"
          )}
          title={record.isFavorite ? "Von Favoriten entfernen" : "Zu Favoriten hinzufügen"}
        >
          <motion.div
            initial={false}
            animate={record.isFavorite ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Heart className={cn(
              "w-5 h-5 transition-colors",
              record.isFavorite ? "fill-white text-white" : "text-white"
            )} />
          </motion.div>
        </motion.button>

        {/* Bottom-left: Package button (visible when ordered) - in fallline with Favorite */}
        {onToggleOrdered && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onToggleOrdered();
            }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "absolute bottom-3 left-3 p-2.5 rounded-full transition-all duration-300",
              "backdrop-blur-md z-10",
              record.isOrdered
                ? "bg-amber-500/95 hover:bg-amber-600 shadow-lg shadow-amber-500/50"
                : "bg-white/10 opacity-0 group-hover:opacity-100 hover:bg-amber-500/70"
            )}
            title={record.isOrdered ? "Paketmark entfernen" : "Als Paket markieren"}
          >
            <motion.div
              initial={false}
              animate={record.isOrdered ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Package className={cn(
                "w-5 h-5 transition-colors",
                record.isOrdered ? "fill-white text-white" : "text-white"
              )} />
            </motion.div>
          </motion.button>
        )}

        {/* Top-right: Format badge */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <FormatBadge format={record.format} />
        </div>

        {/* Bottom-right: Reload cover button (left of Trash) */}
        {onReloadCover && (
          <motion.button
            onClick={handleReloadCover}
            disabled={isReloadingCover}
            className="absolute bottom-3 right-14 p-2.5 rounded-full bg-blue-500/90 backdrop-blur-md hover:bg-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 disabled:opacity-50"
            title="Cover nachladen"
            whileHover={{ scale: 1.1 }}
          >
            <RefreshCw className={cn("w-4 h-4 text-white", isReloadingCover && "animate-spin")} />
          </motion.button>
        )}

        {/* Bottom-right: Delete button (right of Reload) */}
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <motion.button
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-3 right-3 p-2.5 rounded-full bg-red-500/90 backdrop-blur-md hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
                title="Löschen"
                whileHover={{ scale: 1.1 }}
              >
                <Trash2 className="w-4 h-4 text-white" />
              </motion.button>
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

        {/* Info on hover - only year and label */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none bg-gradient-to-t from-black/90 to-transparent">
          <p className="text-white/90 text-xs font-medium">{record.year}</p>
          <p className="text-white/60 text-xs truncate">{record.label}</p>
        </div>
      </div>

      {/* Card Footer - Tidal-inspired minimal text info */}
      <div className="p-3 space-y-2">
        {/* Mood color indicators - discreet bottom-right positioning (Tidal-style) */}
        {recordMoodsWithColors.length > 0 && (
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-1 mb-1">
              {recordMoodsWithColors.map((mood, idx) => (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full cursor-default"
                      whileHover={{ scale: 1.3 }}
                      style={{ backgroundColor: mood?.color ? `hsl(${mood.color})` : 'hsl(var(--muted-foreground))' }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="flex items-center gap-1.5 text-xs">
                    <span>{mood?.icon}</span>
                    <span>{mood?.name}</span>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        )}

        {/* Minimal text info - like Tidal (just album + artist) */}
        <motion.div
          initial={{ opacity: 0.85 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <h3 className="font-medium text-sm text-foreground truncate leading-tight">
            {record.album}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {record.artist}
          </p>
        </motion.div>

        {/* Cover Source Badge - positioned bottom-right (Tidal-inspired) */}
        {(record.coverArtSource || record.coverArtVerified || record.aiConfidence) && (
          <div className="flex justify-end mt-1">
            <CoverSourceBadge
              coverSource={record.coverArtSource}
              coverArtVerified={record.coverArtVerified}
              coverArtVerifiedAt={record.coverArtVerifiedAt}
              aiConfidence={record.aiConfidence}
              size="xs"
              showTooltip={true}
            />
          </div>
        )}

        {/* Rating Display - Stars LEFT, Critic Score RIGHT */}
        <div className="flex items-center justify-between pt-2" onClick={(e) => e.stopPropagation()}>
          {/* Star Rating - LEFT side (user's rating) */}
          <StarRating
            rating={record.myRating}
            size="sm"
            interactive={!!onRatingChange}
            onChange={onRatingChange}
          />
          {/* Critic Score - RIGHT side (from Discogs/MusicBrainz) */}
          {record.criticScore !== undefined && (
            <span className="text-xs font-medium text-muted-foreground">
              {Math.round(record.criticScore)}/100
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

RecordCardComponent.displayName = "RecordCard";

export const RecordCard = memo(RecordCardComponent);
