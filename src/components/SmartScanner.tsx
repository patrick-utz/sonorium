import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ScanBarcode, Loader2, Camera, ImagePlus, Monitor, Smartphone, Keyboard, Hash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { compressCoverImage } from "@/lib/imageUtils";

interface SmartScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  onImageCaptured: (imageBase64: string) => void;
  onClose: () => void;
}

export function SmartScanner({ onBarcodeDetected, onImageCaptured, onClose }: SmartScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"select" | "live" | "photo" | "processing" | "manual">("select");
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

  // Live Camera Scan (Desktop/Notebook)
  const startLiveScanning = useCallback(async () => {
    setMode("live");
    setIsLoading(true);
    setError(null);

    try {
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }
      const reader = readerRef.current;

      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!videoRef.current) {
        throw new Error("Video element not ready");
      }

      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        throw new Error("Keine Kamera gefunden");
      }

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

  // Handle photo capture
  const handlePhotoCapture = useCallback(async (file: File) => {
    setMode("processing");
    setIsLoading(true);
    setError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Compress image for faster processing
      let compressedImage: string;
      try {
        compressedImage = await compressCoverImage(base64);
      } catch {
        compressedImage = base64;
      }

      setCapturedImage(compressedImage);

      // Try barcode detection
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }
      const zxingReader = readerRef.current;

      try {
        const result = await zxingReader.decodeFromImageUrl(compressedImage);
        if (result) {
          const barcodeText = result.getText();
          setScanResult({ type: "barcode", value: barcodeText });
          setIsLoading(false);
          return;
        }
      } catch {
        console.log("No barcode detected, treating as label");
      }

      // No barcode - treat as label
      setScanResult({ type: "label", value: compressedImage });
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
            {mode === "select" && "Album scannen"}
            {mode === "live" && "Live-Scanner"}
            {mode === "photo" && "Foto aufnehmen"}
            {mode === "processing" && "Wird analysiert..."}
            {mode === "manual" && "Manuelle Eingabe"}
          </h2>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose} className="h-11 w-11">
          <X className="w-6 h-6" />
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
          <div className="max-w-md w-full space-y-4">
            {/* Photo Capture - Primary for mobile */}
            <button
              onClick={() => photoInputRef.current?.click()}
              className="w-full p-5 bg-primary/10 border-2 border-primary rounded-xl hover:bg-primary/20 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 transition-colors">
                  <Smartphone className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">📷 Foto aufnehmen</h3>
                  <p className="text-sm text-muted-foreground">
                    Fotografiere <strong>Barcode</strong> oder <strong>Plattenlabel</strong> – wird automatisch erkannt
                  </p>
                </div>
              </div>
            </button>

            {/* Gallery */}
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="w-full p-4 bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-card/80 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <ImagePlus className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Aus Galerie wählen</h3>
                  <p className="text-sm text-muted-foreground">Vorhandenes Foto verwenden</p>
                </div>
              </div>
            </button>

            {/* Live Scanner */}
            <button
              onClick={startLiveScanning}
              className="w-full p-4 bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-card/80 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Monitor className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Live-Scanner</h3>
                  <p className="text-sm text-muted-foreground">Für Notebook/PC mit Webcam</p>
                </div>
              </div>
            </button>

            {/* Manual Input */}
            <button
              onClick={() => setMode("manual")}
              className="w-full p-4 bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-card/80 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Keyboard className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Manuell eingeben</h3>
                  <p className="text-sm text-muted-foreground">EAN, Katalognummer oder Matrix</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {mode === "manual" && (
          <div className="max-w-md w-full space-y-6 p-6 bg-card rounded-xl border border-border">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Hash className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Code eingeben</h3>
              <p className="text-sm text-muted-foreground">
                EAN-Barcode, Katalognummer oder Matrix-Nummer
              </p>
            </div>

            <div className="space-y-4">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="z.B. 4006408126850 oder ECM 1064"
                className="h-14 text-lg text-center font-mono"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
              />
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => setMode("select")}
                  className="flex-1 h-12"
                >
                  Zurück
                </Button>
                <Button 
                  size="lg"
                  onClick={handleManualSubmit} 
                  disabled={!manualCode.trim()}
                  className="flex-1 h-12"
                >
                  Suchen
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Tipp: Die Katalognummer findest du auf dem Plattenrücken oder dem Label
            </p>
          </div>
        )}

        {mode === "live" && (
          <div className="relative w-full max-w-md aspect-[4/3] bg-muted rounded-lg overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Kamera wird gestartet...</p>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center gap-4">
                <p className="text-destructive text-sm">{error}</p>
                <div className="flex gap-2">
                  <Button onClick={startLiveScanning} variant="outline" size="lg" className="h-12">
                    Erneut versuchen
                  </Button>
                  <Button onClick={() => setMode("select")} size="lg" className="h-12">
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
                <Loader2 className="w-14 h-14 animate-spin text-primary mx-auto" />
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

                <div className="p-5 bg-card rounded-xl border border-border">
                  {scanResult.type === "barcode" ? (
                    <>
                      <div className="flex items-center justify-center gap-2 text-primary mb-3">
                        <ScanBarcode className="w-6 h-6" />
                        <span className="font-semibold text-lg">Barcode erkannt!</span>
                      </div>
                      <p className="text-2xl font-mono">{scanResult.value}</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2 text-accent-foreground mb-3">
                        <Camera className="w-6 h-6" />
                        <span className="font-semibold text-lg">Label-Foto erkannt</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Kein Barcode gefunden. Das Bild wird per KI analysiert, um Album-Informationen zu extrahieren.
                      </p>
                    </>
                  )}
                </div>

                <div className="flex gap-3 justify-center">
                  <Button onClick={handleRetry} variant="outline" size="lg" className="gap-2 h-12">
                    <Camera className="w-5 h-5" />
                    Neues Foto
                  </Button>
                  <Button onClick={handleConfirmResult} size="lg" className="gap-2 h-12 px-8">
                    Weiter
                  </Button>
                </div>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <p className="text-destructive">{error}</p>
                <Button onClick={handleRetry} size="lg" className="h-12">Erneut versuchen</Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Footer */}
      {mode === "live" && !error && (
        <div className="p-4 text-center border-t border-border safe-area-bottom">
          <p className="text-muted-foreground text-sm mb-3">
            Halte den Barcode in den Scanbereich
          </p>
          <Button variant="outline" size="lg" onClick={() => { stopScanning(); setMode("select"); }} className="h-12">
            Zurück zur Auswahl
          </Button>
        </div>
      )}
    </motion.div>
  );
}
