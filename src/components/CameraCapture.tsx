import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, Check, SwitchCamera, Upload, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { compressCoverImage } from "@/lib/imageUtils";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [mode, setMode] = useState<"camera" | "upload">("upload"); // Default to upload for mobile

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

  const capturePhoto = useCallback(async () => {
    if (videoRef.current && canvasRef.current) {
      setIsProcessing(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const rawImage = canvas.toDataURL("image/jpeg", 0.95);
        try {
          const compressed = await compressCoverImage(rawImage);
          setCapturedImage(compressed);
        } catch {
          setCapturedImage(rawImage);
        }
        stopCamera();
      }
      setIsProcessing(false);
    }
  }, [stopCamera]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        try {
          const compressed = await compressCoverImage(result);
          setCapturedImage(compressed);
        } catch {
          setCapturedImage(result);
        }
        stopCamera();
        setIsProcessing(false);
      };
      reader.onerror = () => {
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
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
          {mode === "camera" ? "Foto aufnehmen" : "Cover auswählen"}
        </h2>
        <Button variant="ghost" size="icon" onClick={handleClose} className="h-11 w-11">
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Mode Toggle */}
      {!capturedImage && !isProcessing && (
        <div className="flex justify-center gap-3 p-4 border-b border-border/50">
          <Button
            variant={mode === "upload" ? "default" : "outline"}
            size="lg"
            onClick={switchToUpload}
            className="gap-2 h-12 px-6"
          >
            <Upload className="w-5 h-5" />
            Foto/Datei
          </Button>
          <Button
            variant={mode === "camera" ? "default" : "outline"}
            size="lg"
            onClick={switchToCamera}
            className="gap-2 h-12 px-6"
          >
            <Camera className="w-5 h-5" />
            Live-Kamera
          </Button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex items-center justify-center p-4 bg-black/90">
        {isProcessing ? (
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-white">Bild wird optimiert...</p>
          </div>
        ) : capturedImage ? (
          <div className="relative max-w-full max-h-full">
            <img
              src={capturedImage}
              alt="Aufgenommenes Foto"
              className="max-w-full max-h-[60vh] rounded-lg shadow-elegant"
            />
          </div>
        ) : mode === "upload" ? (
          <div className="text-center space-y-6 p-6 bg-card rounded-xl max-w-sm w-full">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Cover fotografieren</h3>
              <p className="text-sm text-muted-foreground">
                Fotografiere das Album-Cover oder wähle ein Bild aus der Galerie
              </p>
            </div>
            
            {/* Hidden inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="space-y-3 w-full">
              <Button 
                onClick={() => cameraInputRef.current?.click()}
                size="lg"
                className="w-full gap-3 h-14 text-base"
              >
                <Camera className="w-6 h-6" />
                Foto aufnehmen
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                className="w-full gap-3 h-14 text-base"
              >
                <Upload className="w-6 h-6" />
                Aus Galerie wählen
              </Button>
            </div>
          </div>
        ) : error ? (
          <div className="text-center space-y-4 p-6 bg-card rounded-lg max-w-sm">
            <p className="text-destructive whitespace-pre-line text-sm">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => startCamera()} variant="outline" className="flex-1 h-12">
                Erneut versuchen
              </Button>
              <Button onClick={switchToUpload} className="flex-1 gap-2 h-12">
                <Upload className="w-4 h-4" />
                Datei wählen
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative w-full max-w-lg aspect-[4/3] bg-muted rounded-lg overflow-hidden">
            {!stream ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                {isStarting ? (
                  <>
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Kamera wird gestartet...</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Tippe auf „Kamera starten"
                    </p>
                    <div className="flex w-full gap-2">
                      <Button onClick={() => startCamera()} className="flex-1 gap-2 h-12">
                        <Camera className="w-5 h-5" />
                        Kamera starten
                      </Button>
                      <Button onClick={switchToUpload} variant="outline" className="flex-1 gap-2 h-12">
                        <Upload className="w-5 h-5" />
                        Datei
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : isStarting ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
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
      <div className="p-4 border-t border-border/50 bg-background safe-area-bottom">
        {capturedImage ? (
          <div className="flex gap-3 justify-center">
            <Button
              onClick={retake}
              variant="outline"
              size="lg"
              className="gap-2 h-14 px-6"
            >
              <RotateCcw className="w-5 h-5" />
              Neu aufnehmen
            </Button>
            <Button
              onClick={confirmCapture}
              size="lg"
              className="gap-2 bg-gradient-vinyl h-14 px-8"
            >
              <Check className="w-5 h-5" />
              Verwenden
            </Button>
          </div>
        ) : mode === "camera" && !error && stream && !isStarting ? (
          <div className="flex justify-center items-center gap-6">
            <Button
              onClick={switchCamera}
              variant="outline"
              size="icon"
              className="w-14 h-14 rounded-full"
              disabled={!stream || isStarting}
            >
              <SwitchCamera className="w-6 h-6" />
            </Button>
            
            <Button
              onClick={capturePhoto}
              size="lg"
              className="w-20 h-20 rounded-full bg-gradient-vinyl hover:opacity-90"
              disabled={!stream || isStarting}
            >
              <Camera className="w-8 h-8" />
            </Button>
            
            <div className="w-14 h-14" />
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
