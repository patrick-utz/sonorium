import { useRecords } from "@/context/RecordContext";
import { RecordCard } from "@/components/RecordCard";
import { Disc3, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { records, getOwnedRecords, getWishlistRecords } = useRecords();
  const navigate = useNavigate();

  const ownedRecords = getOwnedRecords();
  const wishlistRecords = getWishlistRecords();

  // Recently added
  const recentlyAdded = [...ownedRecords]
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
    .slice(0, 4);

  // Featured record (most recent or highest rated)
  const featuredRecord = [...ownedRecords]
    .sort((a, b) => b.myRating - a.myRating || new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
    [0];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header Greeting */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-foreground">
          Hallo, <span className="text-muted-foreground">Sammler</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Deine Sammlung wächst.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
        <div 
          className="stat-card cursor-pointer hover:bg-card/80 transition-colors"
          onClick={() => navigate("/sammlung")}
        >
          <div className="flex-1">
            <p className="text-3xl font-bold text-foreground">{ownedRecords.length}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Alben</p>
          </div>
          <Disc3 className="w-6 h-6 text-muted-foreground" />
        </div>

        <div 
          className="stat-card cursor-pointer hover:bg-card/80 transition-colors"
          onClick={() => navigate("/wunschliste")}
        >
          <div className="flex-1">
            <p className="text-3xl font-bold text-foreground">{wishlistRecords.length}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Wunschliste</p>
          </div>
          <Heart className="w-6 h-6 text-muted-foreground" />
        </div>
      </motion.div>

      {/* Featured Record - Aktuelle Rotation */}
      {featuredRecord && (
        <motion.div variants={itemVariants}>
          <h2 className="section-title mb-3">Aktuelle Rotation</h2>
          <div 
            className="feature-card cursor-pointer"
            onClick={() => navigate(`/sammlung/${featuredRecord.id}`)}
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              {featuredRecord.coverArt ? (
                <img
                  src={featuredRecord.coverArt}
                  alt={featuredRecord.album}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="album-placeholder">
                  <Disc3 className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
              
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="now-playing-badge mb-2 w-fit">
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  NOW PLAYING
                </div>
                <h3 className="text-xl font-bold text-foreground">{featuredRecord.album}</h3>
                <p className="text-muted-foreground">{featuredRecord.artist}</p>
              </div>

              {/* Play button */}
              <div className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                <div className="w-0 h-0 border-l-[12px] border-l-foreground border-y-[8px] border-y-transparent ml-1" />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Format Filter Tabs */}
      <motion.div variants={itemVariants} className="flex gap-2 overflow-x-auto scrollbar-hidden py-1">
        <button className="filter-tab active whitespace-nowrap">Alle</button>
        <button className="filter-tab whitespace-nowrap" onClick={() => navigate("/sammlung?format=vinyl")}>Vinyl</button>
        <button className="filter-tab whitespace-nowrap" onClick={() => navigate("/sammlung?format=cd")}>CD</button>
        <button className="filter-tab whitespace-nowrap">Digital</button>
        <button className="filter-tab whitespace-nowrap">Kassette</button>
      </motion.div>

      {/* Recently Added - Neuzugänge */}
      {recentlyAdded.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="section-header">
            <h2 className="section-title">Neuzugänge</h2>
            <button
              onClick={() => navigate("/sammlung")}
              className="section-link"
            >
              ALLE ANZEIGEN
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {recentlyAdded.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onClick={() => navigate(`/sammlung/${record.id}`)}
                variant="compact"
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {ownedRecords.length === 0 && (
        <motion.div variants={itemVariants} className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-card flex items-center justify-center">
            <Disc3 className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            Starte deine Sammlung
          </h3>
          <p className="text-muted-foreground">
            Füge deinen ersten Tonträger hinzu!
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}