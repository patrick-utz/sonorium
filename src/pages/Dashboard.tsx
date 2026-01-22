import { useRecords } from "@/context/RecordContext";
import { Disc3, Disc, Music, Heart, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star } from "lucide-react";

export default function Dashboard() {
  const { records, getWishlistRecords, getFavoriteRecords, toggleFavorite } = useRecords();
  const navigate = useNavigate();

  const wishlistRecords = getWishlistRecords();
  const favoriteRecords = getFavoriteRecords();
  const vinylCount = records.filter((r) => r.format === "vinyl").length;
  const cdCount = records.filter((r) => r.format === "cd").length;

  // Calculate genre distribution
  const genreCount = records.reduce((acc, record) => {
    record.genre.forEach((g) => {
      acc[g] = (acc[g] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  // Calculate mood distribution
  const moodCount = records.reduce((acc, record) => {
    (record.moods || []).forEach((m) => {
      acc[m] = (acc[m] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const topMoods = Object.entries(moodCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

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

  const handleGenreSelect = (genre: string) => {
    navigate(`/sammlung?genre=${encodeURIComponent(genre)}`);
  };

  const handleMoodSelect = (mood: string) => {
    navigate(`/sammlung?mood=${encodeURIComponent(mood)}`);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col h-[calc(100vh-6rem)] min-w-0 w-full overflow-hidden"
    >
      {/* Sticky Header Area */}
      <div className="sticky top-0 z-30 bg-background pb-6 md:pb-8 space-y-6 md:space-y-8">
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="text-center py-4 md:py-8">
          <h1 className="text-3xl md:text-5xl font-semibold text-foreground mb-2 md:mb-3">
            SONORIUM
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">
            Deine persönliche Tonträger-Sammlung
          </p>
        </motion.div>

        {/* Typographic Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-2xl mx-auto">
          <div 
            className="text-center cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => navigate("/sammlung")}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Music className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </div>
            <div className="text-3xl md:text-5xl font-bold text-foreground">{records.length}</div>
            <div className="text-xs md:text-sm text-muted-foreground mt-1">Gesamt</div>
          </div>

          <div 
            className="text-center cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => navigate("/sammlung?format=vinyl")}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Disc3 className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </div>
            <div className="text-3xl md:text-5xl font-bold text-foreground">{vinylCount}</div>
            <div className="text-xs md:text-sm text-muted-foreground mt-1">Vinyl</div>
          </div>

          <div 
            className="text-center cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => navigate("/sammlung?format=cd")}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Disc className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </div>
            <div className="text-3xl md:text-5xl font-bold text-foreground">{cdCount}</div>
            <div className="text-xs md:text-sm text-muted-foreground mt-1">CDs</div>
          </div>

          <div 
            className="text-center cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => navigate("/wunschliste")}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Heart className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </div>
            <div className="text-3xl md:text-5xl font-bold text-foreground">{wishlistRecords.length}</div>
            <div className="text-xs md:text-sm text-muted-foreground mt-1">Wunschliste</div>
          </div>
        </motion.div>

        {/* Filter Dropdowns */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 max-w-md mx-auto px-1">
          {/* Genres Dropdown */}
          {topGenres.length > 0 && (
            <Select onValueChange={handleGenreSelect}>
              <SelectTrigger className="w-full bg-card border-border">
                <Music className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50 max-h-[300px]">
                {topGenres.map(([genre, count]) => (
                  <SelectItem key={genre} value={genre}>
                    {genre} ({count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Moods Dropdown */}
          {topMoods.length > 0 && (
            <Select onValueChange={handleMoodSelect}>
              <SelectTrigger className="w-full bg-card border-border">
                <Sparkles className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                <SelectValue placeholder="Stimmung" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50 max-h-[300px]">
                {topMoods.map(([mood, count]) => (
                  <SelectItem key={mood} value={mood}>
                    {mood} ({count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </motion.div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-8 pt-4">
        {/* Favorites Section */}
        {favoriteRecords.length > 0 && (
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => navigate("/sammlung?favorites=true")}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
              >
                <Star className="w-5 h-5 text-primary fill-primary" />
                <h2 className="text-lg font-semibold text-foreground">Favoriten</h2>
              </button>
              <button 
                onClick={() => navigate("/sammlung?favorites=true")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Alle anzeigen →
              </button>
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-4 pb-4">
                {favoriteRecords.slice(0, 10).map((record) => (
                  <div
                    key={record.id}
                    className="relative group cursor-pointer flex-shrink-0 w-36 md:w-44"
                    onClick={() => navigate(`/sammlung/${record.id}`)}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      {record.coverArt ? (
                        <img
                          src={record.coverArt}
                          alt={record.album}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Disc3 className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(record.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Star className="w-4 h-4 text-primary fill-primary" />
                    </button>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-foreground truncate">{record.album}</p>
                      <p className="text-xs text-muted-foreground truncate">{record.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </motion.section>
        )}

        {/* Wishlist Preview Section */}
        {wishlistRecords.length > 0 && (
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => navigate("/wunschliste")}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
              >
                <Heart className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Wunschliste</h2>
              </button>
              <button 
                onClick={() => navigate("/wunschliste")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Alle anzeigen →
              </button>
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-4 pb-4">
                {wishlistRecords.slice(0, 10).map((record) => (
                  <div
                    key={record.id}
                    className="relative group cursor-pointer flex-shrink-0 w-36 md:w-44"
                    onClick={() => navigate(`/sammlung/${record.id}`)}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      {record.coverArt ? (
                        <img
                          src={record.coverArt}
                          alt={record.album}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Disc3 className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-foreground truncate">{record.album}</p>
                      <p className="text-xs text-muted-foreground truncate">{record.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </motion.section>
        )}
      </div>
    </motion.div>
  );
}
