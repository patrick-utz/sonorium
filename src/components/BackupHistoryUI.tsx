import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  BackupMetadata,
  deleteBackupFromHistory,
  formatBackupDate,
  formatBackupSize,
} from "@/lib/backupScheduler";
import {
  MoreVertical,
  Download,
  Trash2,
  Upload,
  Calendar,
  HardDrive,
} from "lucide-react";

interface BackupHistoryUIProps {
  backups: BackupMetadata[];
  onDelete: (backupId: string) => void;
  onRestore: (backup: BackupMetadata) => void;
}

export function BackupHistoryUI({
  backups,
  onDelete,
  onRestore,
}: BackupHistoryUIProps) {
  const { toast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (backups.length === 0) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="p-6 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            Keine Sicherungen vorhanden. Erstelle eine Sicherung, um sie hier zu
            sehen.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedBackups = [...backups].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Sicherungsverlauf</CardTitle>
        <CardDescription>
          {backups.length} Sicherung{backups.length !== 1 ? "en" : ""} verfügbar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedBackups.map((backup, index) => (
            <div
              key={backup.id}
              className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30 hover:border-border/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">
                    {backup.filename}
                  </span>
                  {index === 0 && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                      Neueste
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatBackupDate(backup.timestamp)}
                  </div>
                  <div className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    {formatBackupSize(backup.size)}
                  </div>
                  <div>
                    {backup.recordCount} Tonträger
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRestore(backup)}
                  title="Diese Sicherung wiederherstellen"
                >
                  <Upload className="w-4 h-4" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setDeleteConfirm(backup.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => {
        if (!open) setDeleteConfirm(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sicherung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die Sicherung
              wird permanent gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  onDelete(deleteConfirm);
                  setDeleteConfirm(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
