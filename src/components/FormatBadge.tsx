import { Badge } from "@/components/ui/badge";
import { Disc3, Disc } from "lucide-react";
import { RecordFormat } from "@/types/record";
import { cn } from "@/lib/utils";

interface FormatBadgeProps {
  format: RecordFormat;
  showIcon?: boolean;
  className?: string;
}

export function FormatBadge({ format, showIcon = true, className }: FormatBadgeProps) {
  const isVinyl = format === "vinyl";
  
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 font-medium",
        isVinyl
          ? "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        className
      )}
    >
      {showIcon && (isVinyl ? <Disc3 className="w-3 h-3" /> : <Disc className="w-3 h-3" />)}
      {isVinyl ? "Vinyl" : "CD"}
    </Badge>
  );
}
