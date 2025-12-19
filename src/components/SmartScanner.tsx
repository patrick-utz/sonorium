import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ScanBarcode, Loader2, Camera, ImagePlus, Monitor, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SmartScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  onImageCaptured: (imageBase64: string) => void;
  onClose: () => void;
}

export function SmartScanner({ onBarcodeDetected, onImageCaptured, onClose }: SmartScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"select" | "live" | "photo" | "processing">("select");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{ type: "barcode" | "label"; value: string } | null>(null);

  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const stopScanning = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
  }, []);

  // Live Camera Scan (Notebook/Desktop)
  const startLiveScanning = useCallback(async () => {
    setMode("live");
    setIsLoading(true);
    setError(null);

    try {
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }
      const reader = readerRef.current;

      // Wait a bit for the video element to mount
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!videoRef.current) {
        throw new Error("Video element not ready");
      }

      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        throw new Error("Keine Kamera gefunden");
      }

      // Prefer back camera on mobile, otherwise use first available
      const backCamera = videoInputDevices.find(
        (device) =>
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("rear") ||
          device.label.toLowerCase().includes("rück")
      );
      const deviceId = backCamera?.deviceId || videoInputDevices[0].deviceId;

      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result) => {
          if (result) {
            const barcodeText = result.getText();
            onBarcodeDetected(barcodeText);
            onClose();
          }
        }
      );

      controlsRef.current = controls;
      setIsLoading(false);
    } catch (err) {
      console.error("Live scanner error:", err);
      setError("Kamerazugriff nicht möglich. Nutze stattdessen 'Foto aufnehmen'.");
      setIsLoading(false);
    }
  }, [onBarcodeDetected, onClose]);

  // Handle photo capture (mobile camera or file)
  const handlePhotoCapture = useCallback(async (file: File) => {
    setMode("processing");
    setIsLoading(true);
    setError(null);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setCapturedImage(base64);

      // Try to detect barcode first
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }
      const zxingReader = readerRef.current;

      try {
        const result = await zxingReader.decodeFromImageUrl(base64);
        if (result) {
          const barcodeText = result.getText();
          setScanResult({ type: "barcode", value: barcodeText });
          setIsLoading(false);
          return;
        }
      } catch {
        // No barcode found - that's okay, treat as label
        console.log("No barcode detected in image, treating as label");
      }

      // No barcode found - treat as label image
      setScanResult({ type: "label", value: base64 });
      setIsLoading(false);
    } catch (err) {
      console.error("Photo processing error:", err);
      setError("Bild konnte nicht verarbeitet werden.");
      setIsLoading(false);
      setMode("select");
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoCapture(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  }, [handlePhotoCapture]);

  const handleConfirmResult = useCallback(() => {
    if (!scanResult) return;

    if (scanResult.type === "barcode") {
      onBarcodeDetected(scanResult.value);
    } else {
      onImageCaptured(scanResult.value);
    }
    onClose();
  }, [scanResult, onBarcodeDetected, onImageCaptured, onClose]);

  const handleRetry = useCallback(() => {
    setCapturedImage(null);
    setScanResult(null);
    setError(null);
    setMode("select");
  }, []);

  const handleManualSubmit = useCallback(() => {
    if (manualCode.trim()) {
      onBarcodeDetected(manualCode.trim());
      onClose();
    }
  }, [manualCode, onBarcodeDetected, onClose]);

  const handleClose = useCallback(() => {
    stopScanning();
    onClose();
  }, [stopScanning, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

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
          <h2 className="text-lg font-semibold">
            {mode === "select" && "Scanmethode wählen"}
            {mode === "live" && "Live-Scan (Kamera)"}
            {mode === "photo" && "Foto aufnehmen"}
            {mode === "processing" && "Wird analysiert..."}
          </h2>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Content Area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        {mode === "select" && (
          <div className="max-w-md w-full space-y-6">
            {/* Live Scanner Option */}
            <button
              onClick={startLiveScanning}
              className="w-full p-6 bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-card/80 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Monitor className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">Live-Scanner</h3>
                  <p className="text-sm text-muted-foreground">
                    Nutzt die eingebaute Kamera (Notebook/PC). Halte den Barcode direkt vor die Kamera.
                  </p>
                </div>
              </div>
            </button>

            {/* Photo Capture Option */}
            <button
              onClick={() => photoInputRef.current?.click()}
              className="w-full p-6 bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-card/80 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                  <Smartphone className="w-7 h-7 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">Foto aufnehmen</h3>
                  <p className="text-sm text-muted-foreground">
                    Öffnet die Kamera-App auf dem Handy. Fotografiere den <strong>Barcode</strong> oder das <strong>Label</strong> – wird automatisch erkannt.
                  </p>
                </div>
              </div>
            </button>

            {/* Gallery Option */}
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="w-full p-4 bg-muted/50 border border-border/50 rounded-xl hover:border-border hover:bg-muted transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <ImagePlus className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Aus Galerie wählen</span>
              </div>
            </button>

            {/* Manual Input */}
            <div className="pt-4 border-t border-border space-y-3">
              <p className="text-sm text-muted-foreground text-center">
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
        )}

        {mode === "live" && (
          <div className="relative w-full max-w-md aspect-[4/3] bg-muted rounded-lg overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Kamera wird gestartet...</p>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center gap-4">
                <p className="text-destructive text-sm">{error}</p>
                <div className="flex gap-2">
                  <Button onClick={startLiveScanning} variant="outline" size="sm">
                    Erneut versuchen
                  </Button>
                  <Button onClick={() => setMode("select")} size="sm">
                    Zurück
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

        {mode === "processing" && (
          <div className="max-w-md w-full space-y-6 text-center">
            {isLoading ? (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Bild wird analysiert...</p>
              </>
            ) : scanResult ? (
              <div className="space-y-6">
                {capturedImage && (
                  <div className="relative mx-auto max-w-xs">
                    <img
                      src={capturedImage}
                      alt="Aufgenommenes Bild"
                      className="w-full rounded-lg shadow-lg"
                    />
                  </div>
                )}

                <div className="p-4 bg-card rounded-lg border border-border">
                  {scanResult.type === "barcode" ? (
                    <>
                      <div className="flex items-center justify-center gap-2 text-green-500 mb-2">
                        <ScanBarcode className="w-5 h-5" />
                        <span className="font-semibold">Barcode erkannt</span>
                      </div>
                      <p className="text-2xl font-mono">{scanResult.value}</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2 text-blue-500 mb-2">
                        <Camera className="w-5 h-5" />
                        <span className="font-semibold">Label-Foto erkannt</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Kein Barcode gefunden. Das Bild wird zur KI-Analyse gesendet um Album-Informationen zu extrahieren.
                      </p>
                    </>
                  )}
                </div>

                <div className="flex gap-3 justify-center">
                  <Button onClick={handleRetry} variant="outline" className="gap-2">
                    <Camera className="w-4 h-4" />
                    Neues Foto
                  </Button>
                  <Button onClick={handleConfirmResult} className="gap-2">
                    Weiter
                  </Button>
                </div>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <p className="text-destructive">{error}</p>
                <Button onClick={handleRetry}>Erneut versuchen</Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Footer */}
      {mode === "live" && !error && (
        <div className="p-4 text-center border-t border-border">
          <p className="text-muted-foreground text-sm mb-3">
            Halte den Barcode (EAN) der CD oder Schallplatte in den Scanbereich
          </p>
          <Button variant="outline" onClick={() => { stopScanning(); setMode("select"); }}>
            Zurück zur Auswahl
          </Button>
        </div>
      )}
    </motion.div>
  );
}
