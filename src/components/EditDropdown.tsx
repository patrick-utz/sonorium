import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckSquare, Eye, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditDropdownProps {
  isSelectMode: boolean;
  onSelectModeChange: (enabled: boolean) => void;
  onVerifyCovers: () => void;
}

export function EditDropdown({
  isSelectMode,
  onSelectModeChange,
  onVerifyCovers,
}: EditDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <MoreVertical className="w-4 h-4" />
          <span className="hidden sm:inline">Bearbeiten</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => onSelectModeChange(!isSelectMode)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <CheckSquare className="w-4 h-4" />
          <span>{isSelectMode ? "Auswahl beenden" : "Batch-Bearbeitung"}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={onVerifyCovers}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          <span>Covers überprüfen</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
