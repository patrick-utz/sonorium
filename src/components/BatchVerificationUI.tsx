import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, RefreshCw, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Record } from "@/types/record";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { cn } from "@/lib/utils";

interface BatchVerificationUIProps {
  records: Record[];
  onVerifyRecord: (recordId: string, verified: boolean) => void;
  onReloadCover: (recordId: string) => Promise<void>;
  onDeleteRecord: (recordId: string) => void;
  onClose: () => void;
}

export function BatchVerificationUI({
  records,
  onVerifyRecord,
  onReloadCover,
  onDeleteRecord,
  onClose,
}: BatchVerificationUIProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReloading, setIsReloading] = useState(false);

  const currentRecord = records[currentIndex];
  const progress = Math.round(((currentIndex + 1) / records.length) * 100);

  if (!currentRecord) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Keine Datensätze zum Überprüfen</p>
      </div>
    );
  }

  const handleReload = async () => {
    setIsReloading(true);
    try {
      await onReloadCover(currentRecord.id);
    } finally {
      setIsReloading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < records.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleVerify = () => {
    onVerifyRecord(currentRecord.id, true);
    handleNext();
  };

  const handleDelete = () => {
    onDeleteRecord(currentRecord.id);
    if (currentIndex >= records.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <Card className="w-full border-border/50 bg-gradient-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Batch-Überprüfung</CardTitle>
            <CardDescription>
              Überprüfen Sie Datensätze mit niedriger Konfidenz oder unverifizierten Covern
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Datensatz {currentIndex + 1} von {records.length}
            </span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Cover Image */}
        {currentRecord.coverArt && (
          <div className="flex justify-center">
            <img
              src={currentRecord.coverArt}
              alt={`${currentRecord.artist} - ${currentRecord.album}`}
              className="max-h-64 rounded-lg shadow-lg"
            />
          </div>
        )}

        {/* Record Info */}
        <div className="space-y-3 p-4 bg-card rounded-lg border border-border/50">
          <h3 className="font-semibold text-lg">
            {currentRecord.artist} - {currentRecord.album}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Jahr</p>
              <p className="font-medium">{currentRecord.year || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Label</p>
              <p className="font-medium">{currentRecord.label || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Katalognummer</p>
              <p className="font-medium">{currentRecord.catalogNumber || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Format</p>
              <p className="font-medium capitalize">{currentRecord.format || "—"}</p>
            </div>
          </div>

          {/* Confidence Badge */}
          {(currentRecord.aiConfidence || currentRecord.coverArtSource) && (
            <div className="pt-2 border-t border-border/50">
              <ConfidenceBadge
                confidence={currentRecord.aiConfidence as any}
                source={currentRecord.coverArtSource as any}
                verified={currentRecord.coverArtVerified}
              />
            </div>
          )}

          {/* Quality Assessment */}
          {(currentRecord.recordingQuality || currentRecord.artisticRating) && (
            <div className="pt-2 space-y-1 text-sm">
              {currentRecord.recordingQuality && (
                <p>
                  <span className="text-muted-foreground">Aufnahmequalität:</span>{" "}
                  <span className="font-medium">{currentRecord.recordingQuality}/5</span>
                </p>
              )}
              {currentRecord.artisticRating && (
                <p>
                  <span className="text-muted-foreground">Künstlerisch:</span>{" "}
                  <span className="font-medium">{currentRecord.artisticRating}/5</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Flags/Warnings */}
        {(!currentRecord.coverArtVerified || currentRecord.aiConfidence === "low") && (
          <div className="p-3 bg-amber-500/10 border border-amber-200 rounded-lg flex gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 dark:text-amber-200">
              {!currentRecord.coverArtVerified && <p>• Cover wurde vom Benutzer nicht verifiziert</p>}
              {currentRecord.aiConfidence === "low" && <p>• Niedrige Konfidenz der KI-Extraktion</p>}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={handleReload}
              disabled={isReloading}
              variant="outline"
              className="flex-1 gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", isReloading && "animate-spin")} />
              Cover neu laden
            </Button>
            <Button
              onClick={handleDelete}
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Löschen
            </Button>
          </div>

          <Button onClick={handleVerify} variant="default" className="w-full gap-2 h-11">
            <CheckCircle2 className="w-5 h-5" />
            {currentIndex === records.length - 1 ? "Fertig" : "Überprüft, Weiter"}
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 justify-between pt-2">
          <Button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            variant="ghost"
            size="sm"
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Zurück
          </Button>
          <Button
            onClick={handleNext}
            disabled={currentIndex === records.length - 1}
            variant="ghost"
            size="sm"
            className="gap-1"
          >
            Weiter
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
