import { useRecords } from "@/context/RecordContext";
import { Disc3, Disc, Music, TrendingUp, Tag, Sparkles, Heart, Star, Calendar, Wallet } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { ComposedChart, Bar, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, Legend, PieChart, Pie } from "recharts";
import { useMemo } from "react";

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

  // Genre data for donut chart (top 6 + others)
  const genreChartData = useMemo(() => {
    const sorted = Object.entries(genreCount).sort((a, b) => b[1] - a[1]);
    const top6 = sorted.slice(0, 6);
    const othersCount = sorted.slice(6).reduce((sum, [, count]) => sum + count, 0);
    
    const data = top6.map(([name, value]) => ({ name, value }));
    if (othersCount > 0) {
      data.push({ name: "Andere", value: othersCount });
    }
    return data;
  }, [genreCount]);

  const GENRE_COLORS = [
    "#E63946", // Vibrant Red
    "#F4A261", // Orange
    "#E9C46A", // Golden Yellow
    "#2A9D8F", // Teal
    "#457B9D", // Steel Blue
    "#8338EC", // Purple
    "#6B7280", // Gray for "Andere"
  ];

  const handleGenreChartClick = (data: { name: string }) => {
    if (data.name !== "Andere") {
      navigate(`/sammlung?genre=${encodeURIComponent(data.name)}`);
    }
  };

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

  // Calculate purchases and expenses per month (last 12 months)
  const monthlyData = useMemo(() => {
    const months: { month: string; shortMonth: string; count: number; expenses: number; isCurrentMonth: boolean }[] = [];
    const now = new Date();
    
    // Generate last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString("de-DE", { month: "long" });
      const shortMonth = date.toLocaleDateString("de-DE", { month: "short" });
      
      // Filter records purchased in this month
      const monthRecords = records.filter((r) => {
        if (!r.purchaseDate) return false;
        const purchaseDate = new Date(r.purchaseDate);
        return (
          purchaseDate.getFullYear() === date.getFullYear() &&
          purchaseDate.getMonth() === date.getMonth()
        );
      });
      
      const count = monthRecords.length;
      const expenses = monthRecords.reduce((sum, r) => sum + (r.purchasePrice || 0), 0);
      
      months.push({ 
        month: monthName, 
        shortMonth: shortMonth.replace(".", ""),
        count,
        expenses,
        isCurrentMonth: i === 0
      });
    }
    
    return months;
  }, [records]);

  const totalPurchasesLast12Months = monthlyData.reduce((sum, m) => sum + m.count, 0);
  const totalExpensesLast12Months = monthlyData.reduce((sum, m) => sum + m.expenses, 0);

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
      className="flex flex-col h-[calc(100vh-6rem)] min-w-0 w-full overflow-hidden"
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-8 pt-4">
        {/* Statistics Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Format Distribution Card */}
          <Card className="bg-card border-border">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Music className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Formate</h3>
              </div>
              <div className="flex items-center justify-around gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 border-4 border-primary flex items-center justify-center">
                    <div className="text-center">
                      <Disc3 className="w-6 h-6 md:w-8 md:h-8 text-primary mx-auto mb-1" />
                      <span className="text-2xl md:text-3xl font-bold text-foreground">{vinylCount}</span>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">Vinyl</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-secondary/30 border-4 border-secondary flex items-center justify-center">
                    <div className="text-center">
                      <Disc className="w-6 h-6 md:w-8 md:h-8 text-secondary-foreground mx-auto mb-1" />
                      <span className="text-2xl md:text-3xl font-bold text-foreground">{cdCount}</span>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">CDs</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Genre Distribution Donut Chart */}
          <Card className="bg-card border-border min-w-0 overflow-hidden">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Music className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Genres</h3>
              </div>
              {genreChartData.length > 0 ? (
                <div className="h-40 md:h-48 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" debounce={50}>
                    <PieChart>
                      <Pie
                        data={genreChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius="50%"
                        outerRadius="80%"
                        paddingAngle={2}
                        dataKey="value"
                        onClick={(_, index) => handleGenreChartClick(genreChartData[index])}
                        style={{ cursor: "pointer" }}
                      >
                        {genreChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={GENRE_COLORS[index % GENRE_COLORS.length]}
                            className="transition-opacity hover:opacity-80"
                            style={{ cursor: entry.name !== "Andere" ? "pointer" : "default" }}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, name: string) => [`${value} Alben`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                  Keine Genre-Daten
                </div>
              )}
              {genreChartData.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  {genreChartData.slice(0, 4).map((genre, index) => (
                    <button
                      key={genre.name}
                      onClick={() => genre.name !== "Andere" && handleGenreChartClick(genre)}
                      className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
                      style={{ cursor: genre.name !== "Andere" ? "pointer" : "default" }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: GENRE_COLORS[index] }}
                      />
                      <span className="text-muted-foreground">{genre.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Combined Purchases & Expenses Timeline Card */}
          <Card className="bg-card border-border min-w-0 overflow-hidden">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Käufe & Ausgaben (12 Monate)</h3>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{totalPurchasesLast12Months} Käufe</span>
                  <span>•</span>
                  <span>{totalExpensesLast12Months.toFixed(0)} CHF</span>
                </div>
              </div>
              <div className="h-40 md:h-48 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <XAxis 
                      dataKey="shortMonth" 
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      orientation="left"
                    />
                    <YAxis 
                      yAxisId="right"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      orientation="right"
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip 
                      cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px"
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === "count") return [`${value} Käufe`, "Käufe"];
                        return [`${value.toFixed(2)} CHF`, "Ausgaben"];
                      }}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.month;
                        }
                        return label;
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={24}
                      formatter={(value) => value === "count" ? "Käufe" : "Ausgaben (CHF)"}
                      wrapperStyle={{ fontSize: "11px" }}
                    />
                    <Bar yAxisId="left" dataKey="count" radius={[4, 4, 0, 0]} name="count">
                      {monthlyData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={entry.isCurrentMonth ? "hsl(var(--primary))" : "hsl(var(--primary)/0.5)"}
                        />
                      ))}
                    </Bar>
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="expenses" 
                      name="expenses"
                      stroke="hsl(var(--destructive))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--destructive))", strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, fill: "hsl(var(--destructive))" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
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