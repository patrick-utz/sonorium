import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, Check, SwitchCamera, Upload } from "lucide-react";
import { motion } from "framer-motion";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [mode, setMode] = useState<"camera" | "upload">("camera");

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(async (cameraMode: "environment" | "user" = facingMode) => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    
    setIsStarting(true);
    setError(null);
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: cameraMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      
      setStream(mediaStream);
      setFacingMode(cameraMode);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.log("Video play error:", playErr);
        }
      }
      setIsStarting(false);
    } catch (err) {
      console.error("Camera error:", err);
      
      if (cameraMode === "environment") {
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
        "Kamera nicht verfügbar. Nutze stattdessen den Datei-Upload."
      );
      setMode("upload");
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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCapturedImage(result);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    if (mode === "camera") {
      startCamera();
    }
  }, [startCamera, mode]);

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

  const switchToUpload = useCallback(() => {
    stopCamera();
    setMode("upload");
    setError(null);
    setIsStarting(false);
  }, [stopCamera]);

  const switchToCamera = useCallback(() => {
    setMode("camera");
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background">
        <h2 className="text-lg font-semibold">
          {mode === "camera" ? "Foto aufnehmen" : "Bild auswählen"}
        </h2>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Mode Toggle */}
      {!capturedImage && (
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
            variant={mode === "upload" ? "default" : "outline"}
            size="sm"
            onClick={switchToUpload}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Datei
          </Button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex items-center justify-center p-4 bg-black/90">
        {capturedImage ? (
          <div className="relative max-w-full max-h-full">
            <img
              src={capturedImage}
              alt="Aufgenommenes Foto"
              className="max-w-full max-h-[60vh] rounded-lg shadow-elegant"
            />
          </div>
        ) : mode === "upload" ? (
          <div className="text-center space-y-6 p-8 bg-card rounded-lg max-w-sm">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Bild hochladen</h3>
              <p className="text-sm text-muted-foreground">
                Wähle ein Bild von deinem Gerät
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full gap-2"
            >
              <Upload className="w-4 h-4" />
              Datei auswählen
            </Button>
          </div>
        ) : error ? (
          <div className="text-center space-y-4 p-6 bg-card rounded-lg max-w-sm">
            <p className="text-destructive whitespace-pre-line text-sm">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => startCamera()} variant="outline" className="flex-1">
                Erneut versuchen
              </Button>
              <Button onClick={switchToUpload} className="flex-1 gap-2">
                <Upload className="w-4 h-4" />
                Datei wählen
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative w-full max-w-lg aspect-[4/3] bg-muted rounded-lg overflow-hidden">
            {!stream ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Tippe auf „Kamera starten“. Wenn das im Vorschau-Fenster nicht klappt, nutze „Datei wählen“ (öffnet auf dem Handy auch die Kamera).
                </p>
                <div className="flex w-full gap-2">
                  <Button onClick={() => startCamera()} className="flex-1 gap-2">
                    <Camera className="w-4 h-4" />
                    Kamera starten
                  </Button>
                  <Button onClick={switchToUpload} variant="outline" className="flex-1 gap-2">
                    <Upload className="w-4 h-4" />
                    Datei wählen
                  </Button>
                </div>
              </div>
            ) : isStarting ? (
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
        ) : mode === "camera" && !error ? (
          <div className="flex justify-center items-center gap-6">
            <Button
              onClick={switchCamera}
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full"
              disabled={!stream || isStarting}
            >
              <SwitchCamera className="w-5 h-5" />
            </Button>
            
            <Button
              onClick={capturePhoto}
              size="lg"
              className="w-16 h-16 rounded-full bg-gradient-vinyl hover:opacity-90"
              disabled={!stream || isStarting}
            >
              <Camera className="w-6 h-6" />
            </Button>
            
            <div className="w-12 h-12" />
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
