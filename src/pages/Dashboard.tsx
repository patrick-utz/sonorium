import { useRecords } from "@/context/RecordContext";
import { RecordCard } from "@/components/RecordCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Disc3, Disc, Music, TrendingUp, Calendar, Star, Tag, Sparkles, Heart, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(160, 55%, 45%)",
  "hsl(45, 75%, 50%)",
  "hsl(190, 60%, 50%)",
];

export default function Dashboard() {
  const { records, getOwnedRecords, getWishlistRecords, getFavoriteRecords, toggleFavorite } = useRecords();
  const navigate = useNavigate();

  const ownedRecords = getOwnedRecords();
  const wishlistRecords = getWishlistRecords();
  const favoriteRecords = getFavoriteRecords();
  const vinylCount = records.filter((r) => r.format === "vinyl").length;
  const cdCount = records.filter((r) => r.format === "cd").length;

  // Format data for pie chart
  const formatData = [
    { name: "Vinyl", value: vinylCount, color: "hsl(var(--primary))" },
    { name: "CD", value: cdCount, color: "hsl(var(--accent))" },
  ].filter(d => d.value > 0);

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

  // Genre data for bar chart
  const genreChartData = topGenres.map(([name, value]) => ({ name, value }));

  // Calculate decade distribution
  const decadeCount = records.reduce((acc, record) => {
    const decade = Math.floor(record.year / 10) * 10;
    const decadeLabel = `${decade}er`;
    acc[decadeLabel] = (acc[decadeLabel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const decadeChartData = Object.entries(decadeCount)
    .sort((a, b) => {
      const decadeA = parseInt(a[0]);
      const decadeB = parseInt(b[0]);
      return decadeA - decadeB;
    })
    .map(([name, value]) => ({ name, value }));

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

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-muted">
                <Music className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-semibold text-foreground">
                  {records.length}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">Gesamt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-muted">
                <Disc3 className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-semibold text-foreground">
                  {vinylCount}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">Vinyl</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-muted">
                <Disc className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-semibold text-foreground">
                  {cdCount}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">CDs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-muted">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-semibold text-foreground">
                  {wishlistRecords.length}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">Wunschliste</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Genres */}
      {topGenres.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium flex items-center gap-2 text-foreground">
                <Music className="w-5 h-5 text-muted-foreground" />
                Genres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {topGenres.map(([genre, count]) => (
                  <button
                    key={genre}
                    onClick={() => handleGenreClick(genre)}
                    className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium border border-transparent hover:bg-primary/10 hover:text-foreground hover:border-primary/30 hover:scale-105 transition-all duration-200"
                  >
                    {genre} <span className="opacity-60">({count})</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tags */}
      {topTags.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium flex items-center gap-2 text-foreground">
                <Tag className="w-5 h-5 text-muted-foreground" />
                Stichworte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {topTags.map(([tag, count]) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium border border-transparent hover:bg-primary/10 hover:text-foreground hover:border-primary/30 hover:scale-105 transition-all duration-200"
                  >
                    {tag} <span className="opacity-60">({count})</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Moods */}
      {topMoods.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium flex items-center gap-2 text-foreground">
                <Sparkles className="w-5 h-5 text-muted-foreground" />
                Stimmungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {topMoods.map(([mood, count]) => (
                  <button
                    key={mood}
                    onClick={() => handleMoodClick(mood)}
                    className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium border border-transparent hover:bg-primary/10 hover:text-foreground hover:border-primary/30 hover:scale-105 transition-all duration-200"
                  >
                    {mood} <span className="opacity-60">({count})</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Favorites */}
      {favoriteRecords.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium flex items-center gap-2 text-foreground">
              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
              Deine Favoriten
            </h2>
            <button
              onClick={() => navigate("/sammlung?favorites=true")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Alle anzeigen →
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {favoriteRecords.slice(0, 4).map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onClick={() => navigate(`/sammlung/${record.id}`)}
                onToggleFavorite={() => toggleFavorite(record.id)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Recently Added */}
      {recentlyAdded.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium flex items-center gap-2 text-foreground">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              Zuletzt hinzugefügt
            </h2>
            <button
              onClick={() => navigate("/sammlung")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
                onToggleFavorite={() => toggleFavorite(record.id)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Top Rated */}
      {topRated.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium flex items-center gap-2 text-foreground">
              <Star className="w-5 h-5 text-accent" />
              Top Bewertet
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {topRated.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onClick={() => navigate(`/sammlung/${record.id}`)}
                onToggleFavorite={() => toggleFavorite(record.id)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Statistics Charts */}
      {records.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-medium text-foreground">Statistiken</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Format Distribution - Pie Chart */}
            {formatData.length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Formate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={formatData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {formatData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Genre Distribution - Bar Chart */}
            {genreChartData.length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Top Genres</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={genreChartData.slice(0, 5)} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={80} 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Decade Distribution - Bar Chart */}
            {decadeChartData.length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Jahrzehnte</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={decadeChartData}>
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {decadeChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}