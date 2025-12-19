import { Record } from "@/types/record";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/imageUtils";
import { motion } from "framer-motion";
import { Camera, Trash2, Disc3 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
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

interface RecordCardProps {
  record: Record;
  onClick?: () => void;
  onCoverUpdate?: (coverArt: string) => void;
  onDelete?: () => void;
  className?: string;
  variant?: "default" | "compact";
}

export function RecordCard({ 
  record, 
  onClick, 
  onCoverUpdate, 
  onDelete, 
  className,
  variant = "default" 
}: RecordCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte wähle eine Bilddatei");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      try {
        const compressed = await compressImage(result);
        onCoverUpdate?.(compressed);
        toast.success("Cover aktualisiert");
      } catch {
        toast.error("Fehler beim Komprimieren");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCoverUpdate) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!onCoverUpdate) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  // Calculate combined rating for badge
  const ratingScore = record.myRating ? (record.myRating * 2).toFixed(1) : null;

  // Format label for badge
  const formatLabel = record.format?.toUpperCase() || "VINYL";

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={onClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "cover-card cursor-pointer",
          isDragOver && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          className
        )}
      >
        {/* Hidden file input */}
        {onCoverUpdate && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        )}

        {/* Cover Image */}
        <div className="aspect-square relative overflow-hidden rounded-xl">
          {record.coverArt ? (
            <img
              src={record.coverArt}
              alt={`${record.artist} - ${record.album}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="album-placeholder rounded-xl">
              <Disc3 className="w-12 h-12 text-muted-foreground" />
            </div>
          )}

          {/* Rating Badge - Top Right */}
          {ratingScore && (
            <div className="rating-badge">
              {ratingScore}
            </div>
          )}
          
          {/* Format Badge - Bottom Left */}
          <div className="format-badge">
            {formatLabel}
          </div>
        </div>
        
        {/* Card Footer */}
        <div className="py-3 space-y-0.5">
          <h3 className="font-semibold text-foreground truncate text-sm">
            {record.album}
          </h3>
          <p className="text-muted-foreground text-xs truncate">
            {record.artist}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group cover-card cursor-pointer",
        isDragOver && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        className
      )}
    >
      {/* Hidden file input */}
      {onCoverUpdate && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      )}

      {/* Cover Image */}
      <div className="aspect-square relative overflow-hidden rounded-xl">
        {record.coverArt ? (
          <img
            src={record.coverArt}
            alt={`${record.artist} - ${record.album}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="album-placeholder rounded-xl">
            <Disc3 className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        {/* Rating Badge - Top Right */}
        {ratingScore && (
          <div className="rating-badge">
            {ratingScore}
          </div>
        )}
        
        {/* Format Badge - Bottom Left */}
        <div className="format-badge">
          {formatLabel}
        </div>
        
        {/* Upload Button - shows on hover */}
        {onCoverUpdate && (
          <button
            onClick={handleUploadClick}
            className="absolute top-3 left-3 p-2 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-background hover:scale-110"
            title="Cover hochladen"
          >
            <Camera className="w-4 h-4 text-foreground" />
          </button>
        )}

        {/* Delete Button */}
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-3 right-3 p-2 rounded-full bg-destructive/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-destructive hover:scale-110"
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
      </div>
      
      {/* Card Footer */}
      <div className="p-3 space-y-1">
        <h3 className="font-semibold text-foreground truncate">
          {record.album}
        </h3>
        <p className="text-muted-foreground text-sm truncate">
          {record.artist}
        </p>
      </div>
    </motion.div>
  );
}