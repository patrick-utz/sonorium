import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ScanBarcode, Loader2 } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();

    const startScanning = async () => {
      try {
        const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        
        if (videoInputDevices.length === 0) {
          setError("Keine Kamera gefunden");
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
            // Ignore errors during scanning as they're expected when no barcode is visible
          }
        );
        
        controlsRef.current = controls;
        setIsLoading(false);
      } catch (err) {
        console.error("Barcode scanner error:", err);
        setError("Kamerazugriff fehlgeschlagen. Bitte erlaube den Kamerazugriff.");
        setIsLoading(false);
      }
    };

    startScanning();

    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, [onScan, onClose]);

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
          <h2 className="font-display text-lg font-semibold">Barcode scannen</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md aspect-[4/3] bg-muted rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
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
      </div>

      {/* Instructions */}
      <div className="p-4 text-center">
        <p className="text-muted-foreground text-sm">
          Halte den Barcode (EAN) der CD oder Schallplatte in den Scanbereich
        </p>
      </div>
    </motion.div>
  );
}
