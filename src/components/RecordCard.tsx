import { Record } from "@/types/record";
import { FormatBadge } from "./FormatBadge";
import { StarRating } from "./StarRating";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

interface RecordCardProps {
  record: Record;
  onClick?: () => void;
  onCoverUpdate?: (coverArt: string) => void;
  className?: string;
}

export function RecordCard({ record, onClick, onCoverUpdate, className }: RecordCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte wähle eine Bilddatei");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      onCoverUpdate?.(result);
      toast.success("Cover aktualisiert");
    };
    reader.readAsDataURL(file);
    
    // Reset input
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
      className={cn(
        "group relative cursor-pointer rounded-xl overflow-hidden",
        "bg-card shadow-card hover:shadow-hover transition-shadow duration-300",
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
      <div className="p-4">
        <h3 className="font-display font-semibold text-foreground truncate">
          {record.album}
        </h3>
        <p className="text-muted-foreground text-sm truncate mt-1">
          {record.artist}
        </p>
      </div>
    </motion.div>
  );
}
