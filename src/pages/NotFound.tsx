import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
    >
      {/* Vinyl Animation */}
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 vinyl-disc animate-spin-slow" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-vinyl-cream" />
        </div>
      </div>

      <h1 className="font-display text-6xl font-bold gradient-text mb-4">404</h1>
      <h2 className="font-display text-2xl font-semibold text-foreground mb-2">
        Seite nicht gefunden
      </h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        Diese Platte scheint nicht in unserer Sammlung zu sein. Vielleicht wurde sie
        falsch einsortiert?
      </p>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Button>
        <Button
          onClick={() => navigate("/")}
          className="gap-2 bg-gradient-vinyl text-primary-foreground"
        >
          <Home className="w-4 h-4" />
          Zur Startseite
        </Button>
      </div>
    </motion.div>
  );
}
