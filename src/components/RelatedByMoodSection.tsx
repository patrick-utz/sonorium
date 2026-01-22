import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Sparkles, Disc3 } from "lucide-react";
import type { Record } from "@/types/record";

interface RelatedByMoodSectionProps {
  currentRecord: Record;
  allRecords: Record[];
  onNavigate: (id: string) => void;
}

export function RelatedByMoodSection({ 
  currentRecord, 
  allRecords, 
  onNavigate 
}: RelatedByMoodSectionProps) {
  const relatedRecords = useMemo(() => {
    const currentMoods = currentRecord.moods || [];
    
    if (currentMoods.length === 0) return [];
    
    // Find records that share at least one mood
    const related = allRecords
      .filter(r => {
        // Exclude current record
        if (r.id === currentRecord.id) return false;
        
        // Check for shared moods
        const recordMoods = r.moods || [];
        return recordMoods.some(mood => currentMoods.includes(mood));
      })
      .map(r => {
        // Calculate similarity score (number of shared moods)
        const recordMoods = r.moods || [];
        const sharedMoods = recordMoods.filter(mood => currentMoods.includes(mood));
        return {
          record: r,
          sharedMoods,
          score: sharedMoods.length
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    return related;
  }, [currentRecord.id, currentRecord.moods, allRecords]);

  if (relatedRecords.length === 0) return null;

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Ähnliche Stimmung
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4">
            {relatedRecords.map(({ record, sharedMoods }) => (
              <div
                key={record.id}
                className="relative group cursor-pointer flex-shrink-0 w-32 md:w-40"
                onClick={() => onNavigate(record.id)}
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
                      <Disc3 className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium text-foreground truncate">{record.album}</p>
                  <p className="text-xs text-muted-foreground truncate">{record.artist}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {sharedMoods.slice(0, 2).map(mood => (
                      <span 
                        key={mood}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary truncate max-w-full"
                      >
                        {mood}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
