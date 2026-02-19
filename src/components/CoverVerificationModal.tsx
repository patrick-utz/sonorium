import { Record, AlternativeRelease } from "@/types/record";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, RefreshCw, Upload } from "lucide-react";
import { useState } from "react";
import { compressImage } from "@/lib/imageUtils";
import { toast } from "sonner";

interface CoverVerificationModalProps {
  open: boolean;
  onClose: () => void;
  selectedRelease: AlternativeRelease | null;
  autoFetchedCover: string | null;
  onConfirm: (verified: boolean, coverImage?: string) => void;
  onReloadCover: () => Promise<void>;
  isLoading?: boolean;
}

export function CoverVerificationModal({
  open,
  onClose,
  selectedRelease,
  autoFetchedCover,
  onConfirm,
  onReloadCover,
  isLoading = false,
}: CoverVerificationModalProps) {
  const [reloadingCover, setReloadingCover] = useState(false);
  const [showUploadPrompt, setShowUploadPrompt] = useState(false);

  const handleReloadCover = async () => {
    setReloadingCover(true);
    try {
      await onReloadCover();
      toast.success("Cover neu geladen - bitte überprüfen");
    } catch (error) {
      toast.error("Fehler beim Neuladen des Covers");
    } finally {
      setReloadingCover(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      onConfirm(true, compressed);
    } catch (error) {
      toast.error("Fehler beim Hochladen des Covers");
    }
  };

  if (!selectedRelease) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Cover überprüfen
          </DialogTitle>
          <DialogDescription>
            Überprüfe, ob das automatisch geladene Cover zur ausgewählten Pressung passt
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Left: Pressing Info */}
          <div className="space-y-3 p-4 bg-card rounded-lg border border-border">
            <div>
              <h4 className="font-semibold text-sm mb-3">Ausgewählte Pressung</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>
                  <span className="text-foreground font-medium">{selectedRelease.artist}</span>
                  <br />
                  <span className="text-foreground font-medium">{selectedRelease.album}</span>
                </div>
                {selectedRelease.year && (
                  <div>
                    <span className="text-xs">Jahr:</span> {selectedRelease.year}
                  </div>
                )}
                {selectedRelease.label && (
                  <div>
                    <span className="text-xs">Label:</span> {selectedRelease.label}
                  </div>
                )}
                {selectedRelease.catalogNumber && (
                  <div>
                    <span className="text-xs">Katalog:</span> {selectedRelease.catalogNumber}
                  </div>
                )}
                {selectedRelease.country && (
                  <div>
                    <span className="text-xs">Land:</span> {selectedRelease.country}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Cover Image */}
          <div className="flex items-center justify-center p-4 bg-card rounded-lg border border-border">
            {autoFetchedCover ? (
              <img
                src={autoFetchedCover}
                alt={`${selectedRelease.artist} - ${selectedRelease.album}`}
                className="w-full h-full object-cover rounded max-h-64"
              />
            ) : (
              <div className="w-full h-64 bg-muted flex items-center justify-center rounded">
                <p className="text-sm text-muted-foreground">Kein Cover geladen</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={() => onConfirm(true)}
              disabled={!autoFetchedCover || isLoading || reloadingCover}
              className="flex-1 gap-2"
              variant="default"
            >
              <CheckCircle2 className="w-4 h-4" />
              Ja, stimmt überein
            </Button>
            <Button
              onClick={handleReloadCover}
              disabled={isLoading || reloadingCover}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${reloadingCover ? 'animate-spin' : ''}`} />
              Neu laden
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowUploadPrompt(true)}
              disabled={isLoading || reloadingCover}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Upload className="w-4 h-4" />
              Eigenes hochladen
            </Button>
            <Button
              onClick={onClose}
              disabled={isLoading || reloadingCover}
              variant="outline"
              className="flex-1"
            >
              Abbrechen
            </Button>
          </div>
        </div>

        {/* Hidden file input for upload */}
        {showUploadPrompt && (
          <div className="mt-4 pt-4 border-t">
            <label className="block">
              <span className="text-sm font-medium mb-2 block">Cover-Bild wählen</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90"
              />
            </label>
          </div>
        )}

        <DialogFooter>
          <p className="text-xs text-muted-foreground w-full">
            💡 Tipp: Überprüfe, dass das Cover zur ausgewählten Label-Nummer und zum Jahr passt. Unterschiedliche Pressungen haben oft unterschiedliche Covers.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
