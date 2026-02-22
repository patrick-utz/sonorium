import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CheckSquare, Eye, MoreVertical, Music, Zap, Trash2, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditDropdownProps {
  isSelectMode: boolean;
  onSelectModeChange: (enabled: boolean) => void;
  onVerifyCovers: () => void;
  onAssignMoods?: () => void;
  onStandardizeGenres?: () => void;
  onDeleteTags?: () => void;
  onFixFavorites?: () => void;
}

export function EditDropdown({
  isSelectMode,
  onSelectModeChange,
  onVerifyCovers,
  onAssignMoods,
  onStandardizeGenres,
  onDeleteTags,
  onFixFavorites,
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
      <DropdownMenuContent align="end" className="w-56">
        {/* Selection Mode */}
        <DropdownMenuItem
          onClick={() => onSelectModeChange(!isSelectMode)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <CheckSquare className="w-4 h-4" />
          <span>{isSelectMode ? "Auswahl beenden" : "Batch-Bearbeitung"}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Batch Operations */}
        {onAssignMoods && (
          <DropdownMenuItem
            onClick={onAssignMoods}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Music className="w-4 h-4" />
            <span>Stimmungen zuweisen</span>
          </DropdownMenuItem>
        )}

        {onStandardizeGenres && (
          <DropdownMenuItem
            onClick={onStandardizeGenres}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Genres standardisieren</span>
          </DropdownMenuItem>
        )}

        {onDeleteTags && (
          <DropdownMenuItem
            onClick={onDeleteTags}
            className="flex items-center gap-2 cursor-pointer text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            <span>Stichworte löschen</span>
          </DropdownMenuItem>
        )}

        {onFixFavorites && (
          <DropdownMenuItem
            onClick={onFixFavorites}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Heart className="w-4 h-4" />
            <span>Favoriten überprüfen</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Cover Verification */}
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
