import { useRecords } from "@/context/RecordContext";
import { RecordCard } from "@/components/RecordCard";
import { Card, CardContent } from "@/components/ui/card";
import { Disc3, Heart, Search, Library, QrCode, ChevronRight, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { records, getOwnedRecords, getWishlistRecords, getFavoriteRecords, toggleFavorite } = useRecords();
  const navigate = useNavigate();

  const ownedRecords = getOwnedRecords();
  const wishlistRecords = getWishlistRecords();

  // Recently added
  const recentlyAdded = [...records]
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
    .slice(0, 6);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 },
  };

  // Quick access items with background images
  const quickAccessItems = [
    {
      to: "/recherche",
      label: "Recherche",
      icon: Search,
      bgClass: "bg-gradient-to-br from-zinc-800 to-zinc-900",
    },
    {
      to: "/sammlung",
      label: "Sammlung",
      icon: Library,
      bgClass: "bg-gradient-to-br from-amber-900/50 to-stone-900",
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-2xl mx-auto"
    >
      {/* Greeting Section */}
      <motion.div variants={itemVariants} className="pt-2">
        <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">DASHBOARD</p>
        <h1 className="text-3xl md:text-4xl font-semibold text-foreground">
          Hallo, <span className="gradient-text-purple">Vinyl-Lover.</span>
        </h1>
        <p className="text-muted-foreground mt-1">Bereit für die nächste Session?</p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <div className="stats-card">
          <p className="text-3xl md:text-4xl font-bold text-foreground">{ownedRecords.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Alben in Sammlung</p>
          <div className="stats-card-icon">
            <Disc3 className="w-5 h-5" />
          </div>
        </div>
        <div className="stats-card">
          <p className="text-3xl md:text-4xl font-bold text-foreground">{wishlistRecords.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Auf Wunschliste</p>
          <div className="stats-card-icon">
            <Heart className="w-5 h-5" />
          </div>
        </div>
      </motion.div>

      {/* Quick Access Section */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Schnellzugriff</h2>
          <button 
            onClick={() => navigate("/sammlung")}
            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            Alle anzeigen
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Recherche Card */}
          <button
            onClick={() => navigate("/recherche")}
            className="quick-card bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 text-left group"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Search className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">Recherche</span>
            </div>
          </button>
          
          {/* Sammlung Card */}
          <button
            onClick={() => navigate("/sammlung")}
            className="quick-card bg-gradient-to-br from-amber-800/40 via-stone-800 to-stone-900 text-left group"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-4">
              <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Library className="w-5 h-5 text-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">Sammlung</span>
            </div>
          </button>
        </div>

        {/* Wunschliste - Larger Card */}
        <button
          onClick={() => navigate("/wunschliste")}
          className="quick-card w-full mt-3 bg-gradient-to-br from-stone-700/50 via-stone-800 to-stone-900 text-left group"
          style={{ minHeight: '180px' }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="relative h-full flex flex-col justify-end p-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-semibold text-foreground">Wunschliste</span>
          </div>
        </button>
      </motion.div>

      {/* Quick Add CTA */}
      <motion.div variants={itemVariants}>
        <button
          onClick={() => navigate("/hinzufuegen")}
          className="cta-banner w-full text-left flex items-center justify-between"
        >
          <div>
            <h3 className="font-semibold text-primary-foreground text-lg">Schnell hinzufügen</h3>
            <p className="text-primary-foreground/80 text-sm mt-0.5">
              Scanne den Barcode deines neuen Albums.
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
            <QrCode className="w-6 h-6 text-primary-foreground" />
          </div>
        </button>
      </motion.div>

      {/* Recently Added Section */}
      {recentlyAdded.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Neuzugänge</h2>
            <button
              onClick={() => navigate("/sammlung")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          {/* Horizontal Scroll for Albums */}
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-warm">
            {recentlyAdded.map((record) => (
              <button
                key={record.id}
                onClick={() => navigate(`/sammlung/${record.id}`)}
                className="flex-shrink-0 w-32 group text-left"
              >
                <div className="aspect-square rounded-xl overflow-hidden mb-2 shadow-card group-hover:shadow-hover transition-shadow">
                  {record.coverArt ? (
                    <img
                      src={record.coverArt}
                      alt={`${record.artist} - ${record.album}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-card flex items-center justify-center">
                      <Disc3 className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground truncate">{record.album}</p>
                <p className="text-xs text-muted-foreground truncate">{record.artist}</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}