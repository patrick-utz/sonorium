import { Badge } from "@/components/ui/badge";
import { Check, Heart, X } from "lucide-react";
import { RecordStatus } from "@/types/record";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: RecordStatus;
  className?: string;
}

const statusConfig: Record<RecordStatus, { label: string; icon: typeof Check; className: string }> = {
  owned: {
    label: "In Sammlung",
    icon: Check,
    className: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20",
  },
  wishlist: {
    label: "Wunschliste",
    icon: Heart,
    className: "bg-accent/10 text-accent border-accent/20 hover:bg-accent/20",
  },
  "checked-not-bought": {
    label: "Geprüft",
    icon: X,
    className: "bg-muted text-muted-foreground border-border hover:bg-muted/80",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium", config.className, className)}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}
