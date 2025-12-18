import { useState } from "react";
import { useRecords } from "@/context/RecordContext";
import { RecordCard } from "@/components/RecordCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Heart, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function Wishlist() {
  const { getWishlistRecords, updateRecord } = useRecords();
  const navigate = useNavigate();
  const records = getWishlistRecords();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredRecords = records.filter(
    (record) =>
      record.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.album.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMarkAsOwned = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateRecord(id, { status: "owned" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold gradient-text flex items-center gap-3">
            <Heart className="w-8 h-8 text-accent fill-accent" />
            Wunschliste
          </h1>
          <p className="text-muted-foreground mt-1">
            {records.length} Tonträger auf deiner Wunschliste
          </p>
        </div>

        {/* Search */}
        {records.length > 0 && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-border/50"
            />
          </div>
        )}
      </div>

      {/* Records Grid */}
      <AnimatePresence mode="wait">
        {filteredRecords.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">
              {searchQuery ? "Keine Treffer" : "Deine Wunschliste ist leer"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? "Versuche einen anderen Suchbegriff"
                : "Füge Tonträger zu deiner Wunschliste hinzu, die du dir wünschst!"}
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate("/hinzufuegen")} className="gap-2">
                Tonträger hinzufügen
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {filteredRecords.map((record) => (
              <div key={record.id} className="relative group">
                <RecordCard
                  record={record}
                  onClick={() => navigate(`/sammlung/${record.id}`)}
                />
                <Button
                  size="sm"
                  onClick={(e) => handleMarkAsOwned(record.id, e)}
                  className="absolute bottom-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity gap-1 bg-primary text-primary-foreground shadow-lg"
                >
                  <ShoppingCart className="w-3 h-3" />
                  Gekauft!
                </Button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
