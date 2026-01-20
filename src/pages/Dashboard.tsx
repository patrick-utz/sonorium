import { useRecords } from "@/context/RecordContext";
import { Disc3, Disc, Music, TrendingUp, Tag, Sparkles, Heart, Star } from "lucide-react";
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

  // Calculate tag distribution
  const tagCount = records.reduce((acc, record) => {
    (record.tags || []).forEach((t) => {
      acc[t] = (acc[t] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const topTags = Object.entries(tagCount)
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

  const handleTagSelect = (tag: string) => {
    navigate(`/sammlung?tag=${encodeURIComponent(tag)}`);
  };

  const handleMoodSelect = (mood: string) => {
    navigate(`/sammlung?mood=${encodeURIComponent(mood)}`);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col h-[calc(100vh-6rem)]"
    >
      {/* Sticky Header Area with shadow */}
      <div className="sticky top-0 z-30 bg-background pb-3 md:pb-4 space-y-2 md:space-y-4 shadow-[0_4px_12px_-4px_hsl(var(--foreground)/0.1)] border-b border-border/30">
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="text-center py-3 md:py-6">
          <h1 className="text-2xl md:text-5xl font-semibold text-foreground mb-1 md:mb-3">
            SONORIUM
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">
            Deine persönliche Tonträger-Sammlung
          </p>
        </motion.div>

        {/* Compact Stats Row */}
        <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-3 md:gap-6 text-xs md:text-sm">
          <div className="flex items-center gap-1 md:gap-2">
            <Music className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{records.length}</span>
            <span className="text-muted-foreground hidden sm:inline">Gesamt</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Disc3 className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{vinylCount}</span>
            <span className="text-muted-foreground hidden sm:inline">Vinyl</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Disc className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{cdCount}</span>
            <span className="text-muted-foreground hidden sm:inline">CDs</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{wishlistRecords.length}</span>
            <span className="text-muted-foreground hidden sm:inline">Wunschliste</span>
          </div>
        </motion.div>

        {/* Filter Dropdowns - Grid Layout */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-1.5 md:gap-3 max-w-xl mx-auto px-1">
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

        {/* Tags Dropdown */}
        {topTags.length > 0 && (
          <Select onValueChange={handleTagSelect}>
            <SelectTrigger className="w-full bg-card border-border">
              <Tag className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
              <SelectValue placeholder="Stichwort" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50 max-h-[300px]">
              {topTags.map(([tag, count]) => (
                <SelectItem key={tag} value={tag}>
                  {tag} ({count})
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
      <div className="flex-1 overflow-y-auto space-y-8 pt-4">
        {/* Favorites - Horizontal Scroll */}
        <motion.div variants={itemVariants}>
        <button
          onClick={() => navigate("/sammlung?favorites=true")}
          className="flex items-center gap-3 mb-4 hover:text-primary transition-colors"
        >
          <Heart className="w-8 h-8 text-red-500 fill-red-500" />
          <h2 className="text-3xl md:text-4xl font-bold gradient-text">Favoriten</h2>
          <span className="text-base md:text-lg text-muted-foreground font-normal">({favoriteRecords.length})</span>
          <span className="text-base md:text-lg text-muted-foreground">→</span>
        </button>

        {favoriteRecords.length > 0 ? (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {favoriteRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex-shrink-0 w-56 sm:w-60 md:w-64 cursor-pointer group"
                  onClick={() => navigate(`/sammlung/${record.id}`)}
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={record.coverArt || "/placeholder.svg"}
                      alt={record.album}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm cursor-pointer hover:bg-background transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(record.id);
                      }}
                    >
                      <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-medium text-foreground truncate">{record.album}</p>
                  <p className="text-xs text-muted-foreground truncate">{record.artist}</p>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Noch keine Favoriten – gehe in die Sammlung und tippe auf ein Cover, um es als Favorit zu markieren.
          </div>
        )}
      </motion.div>

      {/* Wishlist - Horizontal Scroll */}
      <motion.div variants={itemVariants}>
        <button
          onClick={() => navigate("/wunschliste")}
          className="flex items-center gap-3 mb-4 hover:text-primary transition-colors"
        >
          <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
          <h2 className="text-3xl md:text-4xl font-bold gradient-text">Wunschliste</h2>
          <span className="text-base md:text-lg text-muted-foreground font-normal">({wishlistRecords.length})</span>
          <span className="text-base md:text-lg text-muted-foreground">→</span>
        </button>

        {wishlistRecords.length > 0 ? (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {wishlistRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex-shrink-0 w-56 sm:w-60 md:w-64 cursor-pointer group"
                  onClick={() => navigate(`/sammlung/${record.id}`)}
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={record.coverArt || "/placeholder.svg"}
                      alt={record.album}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-medium text-foreground truncate">{record.album}</p>
                  <p className="text-xs text-muted-foreground truncate">{record.artist}</p>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Noch keine Einträge auf der Wunschliste.
          </div>
        )}
      </motion.div>
      </div>
    </motion.div>
  );
}