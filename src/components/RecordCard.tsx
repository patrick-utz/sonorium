import { Record } from "@/types/record";
import { FormatBadge } from "./FormatBadge";
import { StarRating } from "./StarRating";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/imageUtils";
import { motion } from "framer-motion";
import { Camera, Trash2 } from "lucide-react";
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
}

export function RecordCard({ record, onClick, onCoverUpdate, onDelete, className }: RecordCardProps) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group relative cursor-pointer rounded-xl overflow-hidden",
        "bg-card shadow-card hover:shadow-hover transition-shadow duration-300",
        isDragOver && "ring-2 ring-primary ring-offset-2",
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
      <div className="aspect-square relative overflow-hidden">
        {record.coverArt ? (
          <img
            src={record.coverArt}
            alt={`${record.artist} - ${record.album}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-vinyl flex items-center justify-center">
            <div className="w-1/2 h-1/2 vinyl-disc" />
          </div>
        )}
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Upload Button */}
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
        
        {/* Info on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-primary-foreground/80 text-sm">{record.year}</p>
          <p className="text-primary-foreground/60 text-xs truncate">{record.label}</p>
          <div className="mt-2">
            <StarRating rating={record.myRating} size="sm" />
          </div>
        </div>
      </div>
      
      {/* Card Footer */}
      <div className="p-4 space-y-2">
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
        <div className="flex items-center justify-between pt-1">
          <StarRating rating={record.myRating} size="sm" />
          {record.recordingQuality && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="text-primary">♪</span>
              {record.recordingQuality}/5
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}