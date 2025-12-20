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
      className="space-y-8"
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} className="text-center py-6 md:py-10">
        <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-3">
          Willkommen bei SONORIUM
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Deine persönliche Tonträger-Sammlung
        </p>
      </motion.div>

      {/* Compact Stats Row */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{records.length}</span>
          <span className="text-muted-foreground">Gesamt</span>
        </div>
        <div className="flex items-center gap-2">
          <Disc3 className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{vinylCount}</span>
          <span className="text-muted-foreground">Vinyl</span>
        </div>
        <div className="flex items-center gap-2">
          <Disc className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{cdCount}</span>
          <span className="text-muted-foreground">CDs</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{wishlistRecords.length}</span>
          <span className="text-muted-foreground">Wunschliste</span>
        </div>
      </motion.div>

      {/* Filter Dropdowns */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
        {/* Genres Dropdown */}
        {topGenres.length > 0 && (
          <Select onValueChange={handleGenreSelect}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <Music className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Genre wählen" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
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
            <SelectTrigger className="w-[180px] bg-card border-border">
              <Tag className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Stichwort wählen" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
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
            <SelectTrigger className="w-[180px] bg-card border-border">
              <Sparkles className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Stimmung wählen" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              {topMoods.map(([mood, count]) => (
                <SelectItem key={mood} value={mood}>
                  {mood} ({count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </motion.div>

      {/* Favorites - Horizontal Scroll */}
      <motion.div variants={itemVariants}>
        <button
          onClick={() => navigate("/sammlung?favorites=true")}
          className="flex items-center gap-2 mb-4 text-lg font-medium text-foreground hover:text-primary transition-colors"
        >
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          Favoriten
          <span className="text-sm text-muted-foreground">({favoriteRecords.length})</span>
          <span className="text-sm text-muted-foreground">→</span>
        </button>

        {favoriteRecords.length > 0 ? (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {favoriteRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex-shrink-0 w-32 cursor-pointer group"
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
          className="flex items-center gap-2 mb-4 text-lg font-medium text-foreground hover:text-primary transition-colors"
        >
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          Wunschliste
          <span className="text-sm text-muted-foreground">({wishlistRecords.length})</span>
          <span className="text-sm text-muted-foreground">→</span>
        </button>

        {wishlistRecords.length > 0 ? (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {wishlistRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex-shrink-0 w-32 cursor-pointer group"
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
    </motion.div>
  );
}