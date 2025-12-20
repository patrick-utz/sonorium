import { useRecords } from "@/context/RecordContext";
import { Disc3, Disc, Music, TrendingUp, Tag, Sparkles, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function Dashboard() {
  const { records, getWishlistRecords, getFavoriteRecords, toggleFavorite, updateRecord } = useRecords();
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
    .slice(0, 8);

  // Calculate tag distribution
  const tagCount = records.reduce((acc, record) => {
    (record.tags || []).forEach((t) => {
      acc[t] = (acc[t] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Calculate mood distribution
  const moodCount = records.reduce((acc, record) => {
    (record.moods || []).forEach((m) => {
      acc[m] = (acc[m] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const topMoods = Object.entries(moodCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

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

  const handleGenreClick = (genre: string) => {
    navigate(`/sammlung?genre=${encodeURIComponent(genre)}`);
  };

  const handleTagClick = (tag: string) => {
    navigate(`/sammlung?tag=${encodeURIComponent(tag)}`);
  };

  const handleMoodClick = (mood: string) => {
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

      {/* Filter Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        {/* Genres */}
        {topGenres.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Music className="w-4 h-4" />
              <span>Genres</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {topGenres.map(([genre, count]) => (
                <button
                  key={genre}
                  onClick={() => handleGenreClick(genre)}
                  className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-transparent hover:bg-primary/10 hover:text-foreground hover:border-primary/30 transition-all duration-200"
                >
                  {genre} <span className="opacity-60">({count})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {topTags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="w-4 h-4" />
              <span>Stichworte</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {topTags.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-transparent hover:bg-primary/10 hover:text-foreground hover:border-primary/30 transition-all duration-200"
                >
                  {tag} <span className="opacity-60">({count})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Moods */}
        {topMoods.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span>Stimmungen</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {topMoods.map(([mood, count]) => (
                <button
                  key={mood}
                  onClick={() => handleMoodClick(mood)}
                  className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-transparent hover:bg-primary/10 hover:text-foreground hover:border-primary/30 transition-all duration-200"
                >
                  {mood} <span className="opacity-60">({count})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Favorites - Horizontal Scroll */}
      {favoriteRecords.length > 0 && (
        <motion.div variants={itemVariants}>
          <button
            onClick={() => navigate("/sammlung?favorites=true")}
            className="flex items-center gap-2 mb-4 text-lg font-medium text-foreground hover:text-primary transition-colors"
          >
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            Favoriten
            <span className="text-sm text-muted-foreground">→</span>
          </button>
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
        </motion.div>
      )}
    </motion.div>
  );
}