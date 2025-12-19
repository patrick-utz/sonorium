import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ScanBarcode, Loader2, Camera, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"camera" | "file">("camera");
  const [manualCode, setManualCode] = useState("");
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const stopScanning = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
  }, []);

  const startScanning = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }
      const reader = readerRef.current;

      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        setError("Keine Kamera gefunden. Nutze den Datei-Upload oder manuelle Eingabe.");
        setIsLoading(false);
        return;
      }

      // Prefer back camera
      const backCamera = videoInputDevices.find(
        (device) => device.label.toLowerCase().includes("back") || 
                    device.label.toLowerCase().includes("rear") ||
                    device.label.toLowerCase().includes("rück")
      );
      const deviceId = backCamera?.deviceId || videoInputDevices[0].deviceId;

      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current!,
        (result, err) => {
          if (result) {
            const barcodeText = result.getText();
            onScan(barcodeText);
            onClose();
          }
        }
      );
      
      controlsRef.current = controls;
      setIsLoading(false);
    } catch (err) {
      console.error("Barcode scanner error:", err);
      setError("Kamerazugriff nicht möglich. Nutze den Datei-Upload oder manuelle Eingabe.");
      setIsLoading(false);
    }
  }, [onScan, onClose]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }
      const reader = readerRef.current;

      const imageUrl = URL.createObjectURL(file);
      const result = await reader.decodeFromImageUrl(imageUrl);
      URL.revokeObjectURL(imageUrl);
      
      if (result) {
        onScan(result.getText());
        onClose();
      }
    } catch (err) {
      console.error("Image scan error:", err);
      setError("Kein Barcode im Bild gefunden. Versuche es erneut oder gib den Code manuell ein.");
      setIsLoading(false);
    }
  }, [onScan, onClose]);

  const handleManualSubmit = useCallback(() => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      onClose();
    }
  }, [manualCode, onScan, onClose]);

  const switchToFile = useCallback(() => {
    stopScanning();
    setMode("file");
    setError(null);
    setIsLoading(false);
  }, [stopScanning]);

  const switchToCamera = useCallback(() => {
    setMode("camera");
    startScanning();
  }, [startScanning]);

  useEffect(() => {
    if (mode === "camera") {
      startScanning();
    }

    return () => {
      stopScanning();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ScanBarcode className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Barcode scannen</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center gap-2 p-3 border-b border-border/50">
        <Button
          variant={mode === "camera" ? "default" : "outline"}
          size="sm"
          onClick={switchToCamera}
          className="gap-2"
        >
          <Camera className="w-4 h-4" />
          Kamera
        </Button>
        <Button
          variant={mode === "file" ? "default" : "outline"}
          size="sm"
          onClick={switchToFile}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          Foto/Datei
        </Button>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        {mode === "file" ? (
          <div className="text-center space-y-6 p-8 bg-card rounded-lg max-w-sm w-full">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <ScanBarcode className="w-10 h-10 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Barcode-Bild scannen</h3>
              <p className="text-sm text-muted-foreground">
                Fotografiere den Barcode oder wähle ein Bild
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="space-y-2 w-full">
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full gap-2"
              >
                <Camera className="w-4 h-4" />
                Barcode fotografieren
              </Button>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="barcode-gallery-input"
              />
              <Button 
                variant="outline"
                onClick={() => document.getElementById('barcode-gallery-input')?.click()}
                className="w-full gap-2"
              >
                <Upload className="w-4 h-4" />
                Aus Galerie wählen
              </Button>
            </div>

            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}

            {/* Manual Input */}
            <div className="pt-4 border-t border-border space-y-3">
              <p className="text-sm text-muted-foreground">
                Oder gib den Code manuell ein:
              </p>
              <div className="flex gap-2">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="EAN / Katalognummer"
                  onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                />
                <Button onClick={handleManualSubmit} disabled={!manualCode.trim()}>
                  OK
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full max-w-md aspect-[4/3] bg-muted rounded-lg overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center gap-4">
                <p className="text-destructive text-sm">{error}</p>
                <div className="flex gap-2">
                  <Button onClick={startScanning} variant="outline" size="sm">
                    Erneut versuchen
                  </Button>
                  <Button onClick={switchToFile} size="sm">
                    Foto/Datei
                  </Button>
                </div>
              </div>
            )}

            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Scan overlay */}
            {!isLoading && !error && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-primary rounded-lg">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                </div>
                <motion.div
                  className="absolute left-8 right-8 h-0.5 bg-primary"
                  initial={{ top: "2rem" }}
                  animate={{ top: ["2rem", "calc(100% - 2rem)", "2rem"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 text-center border-t border-border">
        {mode === "camera" ? (
          <p className="text-muted-foreground text-sm">
            Halte den Barcode (EAN) der CD oder Schallplatte in den Scanbereich
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Der Barcode wird automatisch aus dem Bild erkannt
          </p>
        )}
      </div>
    </motion.div>
  );
}
