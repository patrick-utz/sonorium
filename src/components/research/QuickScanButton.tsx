import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScanBarcode, Camera, Hash, Loader2 } from "lucide-react";
import { SmartScanner } from "@/components/SmartScanner";
import { AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QuickScanButtonProps {
  onBarcodeDetected: (barcode: string) => void;
  onImageCaptured: (imageBase64: string) => void;
  isLoading?: boolean;
  variant?: "default" | "compact";
}

export function QuickScanButton({
  onBarcodeDetected,
  onImageCaptured,
  isLoading,
  variant = "default",
}: QuickScanButtonProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const handleManualSubmit = useCallback(() => {
    if (manualCode.trim()) {
      onBarcodeDetected(manualCode.trim());
      setManualCode("");
      setShowManualInput(false);
    }
  }, [manualCode, onBarcodeDetected]);

  if (variant === "compact") {
    return (
      <>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={() => setShowScanner(true)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ScanBarcode className="w-5 h-5" />
          )}
        </Button>

        <AnimatePresence>
          {showScanner && (
            <SmartScanner
              onBarcodeDetected={onBarcodeDetected}
              onImageCaptured={onImageCaptured}
              onClose={() => setShowScanner(false)}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="gap-2 h-12"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ScanBarcode className="w-5 h-5" />
            )}
            <span className="hidden sm:inline">Scannen</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => setShowScanner(true)}
            className="gap-3 py-3"
          >
            <Camera className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">Foto aufnehmen</p>
              <p className="text-xs text-muted-foreground">
                Barcode, Label oder Cover
              </p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowManualInput(true)}
            className="gap-3 py-3"
          >
            <Hash className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Manuell eingeben</p>
              <p className="text-xs text-muted-foreground">
                EAN oder Katalognummer
              </p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <SmartScanner
            onBarcodeDetected={onBarcodeDetected}
            onImageCaptured={onImageCaptured}
            onClose={() => setShowScanner(false)}
          />
        )}
      </AnimatePresence>

      {/* Manual Input Dialog */}
      <Dialog open={showManualInput} onOpenChange={setShowManualInput}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" />
              Code eingeben
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="EAN oder Katalognummer"
              className="h-12 text-lg text-center font-mono"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
            />
            <p className="text-xs text-muted-foreground text-center">
              z.B. 4006408126850 oder ECM 1064
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowManualInput(false)}
              >
                Abbrechen
              </Button>
              <Button
                className="flex-1"
                onClick={handleManualSubmit}
                disabled={!manualCode.trim()}
              >
                Suchen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
