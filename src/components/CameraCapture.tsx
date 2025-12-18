import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, Check, SwitchCamera } from "lucide-react";
import { motion } from "framer-motion";

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
  const [isStarting, setIsStarting] = useState(true);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(async (mode: "environment" | "user" = facingMode) => {
    // Stop any existing stream first
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    
    setIsStarting(true);
    setError(null);
    
    try {
      // First try with the preferred facing mode
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      
      setStream(mediaStream);
      setFacingMode(mode);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Ensure video plays
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.log("Video play error (usually auto-handled):", playErr);
        }
      }
    } catch (err) {
      console.error("Camera error:", err);
      
      // If environment camera fails, try user camera
      if (mode === "environment") {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
          
          setStream(fallbackStream);
          setFacingMode("user");
          
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            try {
              await videoRef.current.play();
            } catch (playErr) {
              console.log("Video play error:", playErr);
            }
          }
          setIsStarting(false);
          return;
        } catch (fallbackErr) {
          console.error("Fallback camera error:", fallbackErr);
        }
      }
      
      setError(
        "Kamera-Zugriff nicht möglich. Bitte prüfe:\n" +
        "• Browser-Berechtigung für Kamera erteilen\n" +
        "• HTTPS-Verbindung verwenden\n" +
        "• Andere Apps schliessen, die die Kamera nutzen"
      );
    } finally {
      setIsStarting(false);
    }
  }, [stream, facingMode]);

  const switchCamera = useCallback(() => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    startCamera(newMode);
  }, [facingMode, startCamera]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
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
  useEffect(() => {
    startCamera();
    
    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background">
        <h2 className="font-display text-lg font-semibold">Foto aufnehmen</h2>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Camera View */}
      <div className="flex-1 flex items-center justify-center p-4 bg-black/90">
        {error ? (
          <div className="text-center space-y-4 p-6 bg-card rounded-lg max-w-sm">
            <p className="text-destructive whitespace-pre-line text-sm">{error}</p>
            <Button onClick={() => startCamera()} variant="outline">
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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                <p className="text-sm text-muted-foreground">Kamera wird gestartet...</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
            {/* Capture guide overlay */}
            {!isStarting && stream && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-primary/50 rounded-lg" />
              </div>
            )}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-border/50 bg-background">
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
          <div className="flex justify-center items-center gap-6">
            {/* Switch camera button */}
            <Button
              onClick={switchCamera}
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full"
              disabled={!stream || isStarting}
            >
              <SwitchCamera className="w-5 h-5" />
            </Button>
            
            {/* Capture button */}
            <Button
              onClick={capturePhoto}
              size="lg"
              className="w-16 h-16 rounded-full bg-gradient-vinyl hover:opacity-90"
              disabled={!stream || isStarting}
            >
              <Camera className="w-6 h-6" />
            </Button>
            
            {/* Spacer for centering */}
            <div className="w-12 h-12" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
