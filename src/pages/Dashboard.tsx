import { useRecords } from "@/context/RecordContext";
import { RecordCard } from "@/components/RecordCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Disc3, Disc, Music, TrendingUp, Calendar, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { records, getOwnedRecords, getWishlistRecords } = useRecords();
  const navigate = useNavigate();

  const ownedRecords = getOwnedRecords();
  const wishlistRecords = getWishlistRecords();
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
    .slice(0, 5);

  // Recently added
  const recentlyAdded = [...records]
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
    .slice(0, 4);

  // Top rated
  const topRated = [...ownedRecords]
    .filter((r) => r.myRating === 5)
    .slice(0, 4);

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
      className="space-y-8"
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} className="text-center py-6 md:py-10">
        <h1 className="font-display text-4xl md:text-5xl font-bold gradient-text mb-3">
          Willkommen bei VinylVault
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Deine persönliche Tonträger-Sammlung, liebevoll kuratiert.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border/50 shadow-card hover:shadow-vinyl transition-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-xl bg-primary/10">
                <Music className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-display font-bold text-foreground">
                  {records.length}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">Gesamt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 shadow-card hover:shadow-vinyl transition-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-xl bg-primary/10">
                <Disc3 className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-display font-bold text-foreground">
                  {vinylCount}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">Vinyl</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 shadow-card hover:shadow-vinyl transition-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-xl bg-secondary">
                <Disc className="w-5 h-5 md:w-6 md:h-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-display font-bold text-foreground">
                  {cdCount}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">CDs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 shadow-card hover:shadow-vinyl transition-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-xl bg-accent/10">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-display font-bold text-foreground">
                  {wishlistRecords.length}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">Wunschliste</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Genres */}
      {topGenres.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-card border-border/50 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-xl flex items-center gap-2">
                <Music className="w-5 h-5 text-primary" />
                Top Genres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {topGenres.map(([genre, count]) => (
                  <div
                    key={genre}
                    className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
                  >
                    {genre} ({count})
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recently Added */}
      {recentlyAdded.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-semibold flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary" />
              Zuletzt hinzugefügt
            </h2>
            <button
              onClick={() => navigate("/sammlung")}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Alle anzeigen →
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recentlyAdded.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onClick={() => navigate(`/sammlung/${record.id}`)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Top Rated */}
      {topRated.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-semibold flex items-center gap-2">
              <Star className="w-6 h-6 text-vinyl-gold" />
              Deine Favoriten
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {topRated.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onClick={() => navigate(`/sammlung/${record.id}`)}
              />
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
