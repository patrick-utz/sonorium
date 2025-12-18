import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const startCamera = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("Kamera-Zugriff nicht möglich. Bitte erlaube den Zugriff in den Browser-Einstellungen.");
    } finally {
      setIsStarting(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.9);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmCapture = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  }, [capturedImage, onCapture, onClose]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  // Start camera on mount
  useState(() => {
    startCamera();
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <h2 className="font-display text-lg font-semibold">Foto aufnehmen</h2>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Camera View */}
      <div className="flex-1 flex items-center justify-center p-4">
        {error ? (
          <div className="text-center space-y-4">
            <p className="text-destructive">{error}</p>
            <Button onClick={startCamera} variant="outline">
              Erneut versuchen
            </Button>
          </div>
        ) : capturedImage ? (
          <div className="relative max-w-full max-h-full">
            <img
              src={capturedImage}
              alt="Aufgenommenes Foto"
              className="max-w-full max-h-[60vh] rounded-lg shadow-elegant"
            />
          </div>
        ) : (
          <div className="relative w-full max-w-lg aspect-[4/3] bg-muted rounded-lg overflow-hidden">
            {isStarting ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            {/* Capture guide overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-8 border-2 border-primary/50 rounded-lg" />
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-border/50">
        {capturedImage ? (
          <div className="flex gap-3 justify-center">
            <Button
              onClick={retake}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Neu aufnehmen
            </Button>
            <Button
              onClick={confirmCapture}
              size="lg"
              className="gap-2 bg-gradient-vinyl"
            >
              <Check className="w-5 h-5" />
              Verwenden
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <Button
              onClick={capturePhoto}
              size="lg"
              className="w-16 h-16 rounded-full bg-gradient-vinyl hover:opacity-90"
              disabled={!stream || isStarting}
            >
              <Camera className="w-6 h-6" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
