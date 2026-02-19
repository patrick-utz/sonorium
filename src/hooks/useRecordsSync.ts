import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Record } from "@/types/record";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

// Convert from DB snake_case to frontend camelCase
function dbToRecord(row: any): Record {
  return {
    id: row.id,
    artist: row.artist,
    album: row.album,
    year: row.year,
    genre: row.genre || [],
    label: row.label,
    catalogNumber: row.catalog_number,
    format: row.format,
    formatDetails: row.format_details,
    pressing: row.pressing,
    coverArt: row.cover_art,
    myRating: row.my_rating || 3,
    recordingQuality: row.recording_quality,
    masteringQuality: row.mastering_quality,
    artisticRating: row.artistic_rating,
    criticScore: row.critic_score,
    criticReviews: row.critic_reviews,
    status: row.status || "owned",
    dateAdded: row.date_added,
    purchasePrice: row.purchase_price,
    purchaseLocation: row.purchase_location,
    vinylRecommendation: row.vinyl_recommendation,
    recommendationReason: row.recommendation_reason,
    personalNotes: row.personal_notes,
    tags: row.tags || [],
    moods: row.moods || [],
    isFavorite: row.is_favorite || false,
    audiophileAssessment: row.audiophile_assessment,
    artisticAssessment: row.artistic_assessment,
    recommendations: row.recommendations,
  };
}

// Convert from frontend camelCase to DB snake_case
function recordToDb(record: Partial<Record>, userId: string): any {
  return {
    user_id: userId,
    artist: record.artist,
    album: record.album,
    year: record.year,
    genre: record.genre || [],
    label: record.label,
    catalog_number: record.catalogNumber,
    format: record.format,
    format_details: record.formatDetails,
    pressing: record.pressing,
    cover_art: record.coverArt,
    my_rating: record.myRating,
    recording_quality: record.recordingQuality,
    mastering_quality: record.masteringQuality,
    artistic_rating: record.artisticRating,
    critic_score: record.criticScore,
    critic_reviews: record.criticReviews,
    status: record.status,
    date_added: record.dateAdded || new Date().toISOString().split("T")[0],
    purchase_price: record.purchasePrice,
    purchase_location: record.purchaseLocation,
    vinyl_recommendation: record.vinylRecommendation,
    recommendation_reason: record.recommendationReason,
    personal_notes: record.personalNotes,
    tags: record.tags || [],
    moods: record.moods || [],
    is_favorite: record.isFavorite || false,
    audiophile_assessment: record.audiophileAssessment,
    artistic_assessment: record.artisticAssessment,
    recommendations: record.recommendations,
  };
}

export function useRecordsSync() {
  const { user } = useAuth();
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Fetch records from database with pagination support
  const fetchRecords = useCallback(async (limit?: number, offset?: number) => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("records")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply pagination if provided
      if (limit && offset !== undefined) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      // If offset is provided, append records; otherwise replace
      const newRecords = (data || []).map(dbToRecord);
      if (offset && offset > 0) {
        setRecords((prev) => [...prev, ...newRecords]);
      } else {
        setRecords(newRecords);
      }
    } catch (error) {
      console.error("Error fetching records:", error);
      toast.error("Fehler beim Laden der Sammlung");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Add record
  const addRecord = async (record: Omit<Record, "id" | "dateAdded">) => {
    if (!user) return;
    setSyncing(true);

    try {
      const dbRecord = recordToDb(record, user.id);
      const { data, error } = await supabase
        .from("records")
        .insert(dbRecord)
        .select()
        .single();

      if (error) throw error;

      setRecords((prev) => [dbToRecord(data), ...prev]);
      toast.success("Album gespeichert");
    } catch (error) {
      console.error("Error adding record:", error);
      toast.error("Fehler beim Speichern");
    } finally {
      setSyncing(false);
    }
  };

  // Update record
  const updateRecord = async (id: string, updates: Partial<Record>) => {
    if (!user) return;
    setSyncing(true);

    try {
      const dbUpdates: any = {};
      if (updates.artist !== undefined) dbUpdates.artist = updates.artist;
      if (updates.album !== undefined) dbUpdates.album = updates.album;
      if (updates.year !== undefined) dbUpdates.year = updates.year;
      if (updates.genre !== undefined) dbUpdates.genre = updates.genre;
      if (updates.label !== undefined) dbUpdates.label = updates.label;
      if (updates.catalogNumber !== undefined) dbUpdates.catalog_number = updates.catalogNumber;
      if (updates.format !== undefined) dbUpdates.format = updates.format;
      if (updates.formatDetails !== undefined) dbUpdates.format_details = updates.formatDetails;
      if (updates.pressing !== undefined) dbUpdates.pressing = updates.pressing;
      if (updates.coverArt !== undefined) dbUpdates.cover_art = updates.coverArt;
      if (updates.myRating !== undefined) dbUpdates.my_rating = updates.myRating;
      if (updates.recordingQuality !== undefined) dbUpdates.recording_quality = updates.recordingQuality;
      if (updates.masteringQuality !== undefined) dbUpdates.mastering_quality = updates.masteringQuality;
      if (updates.artisticRating !== undefined) dbUpdates.artistic_rating = updates.artisticRating;
      if (updates.criticScore !== undefined) dbUpdates.critic_score = updates.criticScore;
      if (updates.criticReviews !== undefined) dbUpdates.critic_reviews = updates.criticReviews;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
      if (updates.purchaseLocation !== undefined) dbUpdates.purchase_location = updates.purchaseLocation;
      if (updates.vinylRecommendation !== undefined) dbUpdates.vinyl_recommendation = updates.vinylRecommendation;
      if (updates.recommendationReason !== undefined) dbUpdates.recommendation_reason = updates.recommendationReason;
      if (updates.personalNotes !== undefined) dbUpdates.personal_notes = updates.personalNotes;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.moods !== undefined) dbUpdates.moods = updates.moods;
      if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite;
      if (updates.audiophileAssessment !== undefined) dbUpdates.audiophile_assessment = updates.audiophileAssessment;
      if (updates.artisticAssessment !== undefined) dbUpdates.artistic_assessment = updates.artisticAssessment;
      if (updates.recommendations !== undefined) dbUpdates.recommendations = updates.recommendations;

      const { error } = await supabase
        .from("records")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;

      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    } catch (error) {
      console.error("Error updating record:", error);
      toast.error("Fehler beim Aktualisieren");
    } finally {
      setSyncing(false);
    }
  };

  // Delete record
  const deleteRecord = async (id: string) => {
    if (!user) return;
    setSyncing(true);

    try {
      const { error } = await supabase.from("records").delete().eq("id", id);

      if (error) throw error;

      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success("Album gelöscht");
    } catch (error) {
      console.error("Error deleting record:", error);
      toast.error("Fehler beim Löschen");
    } finally {
      setSyncing(false);
    }
  };

  // Toggle favorite
  const toggleFavorite = async (id: string) => {
    const record = records.find((r) => r.id === id);
    if (!record) return;
    await updateRecord(id, { isFavorite: !record.isFavorite });
  };

  // Get helpers
  const getRecordById = (id: string) => records.find((r) => r.id === id);
  const getOwnedRecords = () => records.filter((r) => r.status === "owned");
  const getWishlistRecords = () => records.filter((r) => r.status === "wishlist");
  const getFavoriteRecords = () => records.filter((r) => r.isFavorite);

  // Import records (merge or replace)
  const importRecords = async (importedRecords: Record[], mode: "merge" | "replace") => {
    if (!user) return;
    setSyncing(true);

    try {
      if (mode === "replace") {
        // Delete all existing records first
        await supabase.from("records").delete().eq("user_id", user.id);
      }

      // Validate and prepare records for insert
      const dbRecords = importedRecords
        .filter((r) => {
          // Ensure required fields exist
          if (!r.artist || !r.album) {
            console.warn("Skipping record with missing artist or album:", r);
            return false;
          }
          return true;
        })
        .map((r) => {
          // Ensure year is a valid positive number, default to current year if missing/invalid/null
          let year = new Date().getFullYear();
          if (r.year !== null && r.year !== undefined && !isNaN(Number(r.year)) && Number(r.year) > 0) {
            year = Number(r.year);
          }
          
          // Build the db record directly to ensure year is always set
          return {
            user_id: user.id,
            artist: r.artist,
            album: r.album,
            year: year,
            genre: r.genre || [],
            label: r.label || null,
            catalog_number: r.catalogNumber || null,
            format: r.format || "vinyl",
            format_details: r.formatDetails || null,
            pressing: r.pressing || null,
            cover_art: r.coverArt || null,
            my_rating: r.myRating || 3,
            recording_quality: r.recordingQuality || null,
            mastering_quality: r.masteringQuality || null,
            artistic_rating: r.artisticRating || null,
            critic_score: r.criticScore || null,
            critic_reviews: (r.criticReviews as unknown as Json) || null,
            status: r.status || "owned",
            date_added: r.dateAdded || new Date().toISOString().split("T")[0],
            purchase_price: r.purchasePrice || null,
            purchase_location: r.purchaseLocation || null,
            vinyl_recommendation: r.vinylRecommendation || null,
            recommendation_reason: r.recommendationReason || null,
            personal_notes: r.personalNotes || null,
            tags: r.tags || [],
            moods: r.moods || [],
            is_favorite: r.isFavorite || false,
            audiophile_assessment: r.audiophileAssessment || null,
            artistic_assessment: r.artisticAssessment || null,
            recommendations: (r.recommendations as unknown as Json) || null,
          };
        });

      if (dbRecords.length === 0) {
        toast.error("Keine gültigen Alben zum Importieren gefunden");
        return;
      }

      console.log("Importing records:", dbRecords.length, "First record year:", dbRecords[0]?.year);

      const { error } = await supabase.from("records").insert(dbRecords);

      if (error) throw error;

      toast.success(`${dbRecords.length} Alben importiert`);
      await fetchRecords();
    } catch (error) {
      console.error("Error importing records:", error);
      toast.error("Fehler beim Importieren: " + (error instanceof Error ? error.message : "Unbekannter Fehler"));
    } finally {
      setSyncing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return {
    records,
    loading,
    syncing,
    addRecord,
    updateRecord,
    deleteRecord,
    toggleFavorite,
    getRecordById,
    getOwnedRecords,
    getWishlistRecords,
    getFavoriteRecords,
    importRecords,
    refetch: fetchRecords,
  };
}

// New React Query-based hook for caching
export function useRecordsSyncCached() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  // Fetch records with caching - 5 minute stale time
  const { data: records = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["records", user?.id],
    queryFn: async () => {
      if (!user) return [];

      try {
        const { data, error } = await supabase
          .from("records")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return (data || []).map(dbToRecord);
      } catch (error) {
        console.error("Error fetching records:", error);
        toast.error("Fehler beim Laden der Sammlung");
        return [];
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Add record with invalidation
  const addRecord = async (record: Omit<Record, "id" | "dateAdded">) => {
    if (!user) return;
    setSyncing(true);

    try {
      const dbRecord = recordToDb(record, user.id);
      const { data, error } = await supabase
        .from("records")
        .insert(dbRecord)
        .select()
        .single();

      if (error) throw error;

      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ["records", user.id] });
      toast.success("Album gespeichert");
    } catch (error) {
      console.error("Error adding record:", error);
      toast.error("Fehler beim Speichern");
    } finally {
      setSyncing(false);
    }
  };

  // Update record with optimistic update
  const updateRecord = async (id: string, updates: Partial<Record>) => {
    if (!user) return;
    setSyncing(true);

    try {
      const dbUpdates: any = {};
      if (updates.artist !== undefined) dbUpdates.artist = updates.artist;
      if (updates.album !== undefined) dbUpdates.album = updates.album;
      if (updates.year !== undefined) dbUpdates.year = updates.year;
      if (updates.genre !== undefined) dbUpdates.genre = updates.genre;
      if (updates.label !== undefined) dbUpdates.label = updates.label;
      if (updates.catalogNumber !== undefined) dbUpdates.catalog_number = updates.catalogNumber;
      if (updates.format !== undefined) dbUpdates.format = updates.format;
      if (updates.formatDetails !== undefined) dbUpdates.format_details = updates.formatDetails;
      if (updates.pressing !== undefined) dbUpdates.pressing = updates.pressing;
      if (updates.coverArt !== undefined) dbUpdates.cover_art = updates.coverArt;
      if (updates.myRating !== undefined) dbUpdates.my_rating = updates.myRating;
      if (updates.recordingQuality !== undefined) dbUpdates.recording_quality = updates.recordingQuality;
      if (updates.masteringQuality !== undefined) dbUpdates.mastering_quality = updates.masteringQuality;
      if (updates.artisticRating !== undefined) dbUpdates.artistic_rating = updates.artisticRating;
      if (updates.criticScore !== undefined) dbUpdates.critic_score = updates.criticScore;
      if (updates.criticReviews !== undefined) dbUpdates.critic_reviews = updates.criticReviews;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
      if (updates.purchaseLocation !== undefined) dbUpdates.purchase_location = updates.purchaseLocation;
      if (updates.vinylRecommendation !== undefined) dbUpdates.vinyl_recommendation = updates.vinylRecommendation;
      if (updates.recommendationReason !== undefined) dbUpdates.recommendation_reason = updates.recommendationReason;
      if (updates.personalNotes !== undefined) dbUpdates.personal_notes = updates.personalNotes;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.moods !== undefined) dbUpdates.moods = updates.moods;
      if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite;
      if (updates.audiophileAssessment !== undefined) dbUpdates.audiophile_assessment = updates.audiophileAssessment;
      if (updates.artisticAssessment !== undefined) dbUpdates.artistic_assessment = updates.artisticAssessment;
      if (updates.recommendations !== undefined) dbUpdates.recommendations = updates.recommendations;

      const { error } = await supabase
        .from("records")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;

      // Invalidate cache
      await queryClient.invalidateQueries({ queryKey: ["records", user.id] });
    } catch (error) {
      console.error("Error updating record:", error);
      toast.error("Fehler beim Aktualisieren");
    } finally {
      setSyncing(false);
    }
  };

  // Delete record
  const deleteRecord = async (id: string) => {
    if (!user) return;
    setSyncing(true);

    try {
      const { error } = await supabase.from("records").delete().eq("id", id);

      if (error) throw error;

      // Invalidate cache
      await queryClient.invalidateQueries({ queryKey: ["records", user.id] });
      toast.success("Album gelöscht");
    } catch (error) {
      console.error("Error deleting record:", error);
      toast.error("Fehler beim Löschen");
    } finally {
      setSyncing(false);
    }
  };

  // Toggle favorite
  const toggleFavorite = async (id: string) => {
    const record = records.find((r) => r.id === id);
    if (!record) return;
    await updateRecord(id, { isFavorite: !record.isFavorite });
  };

  // Get helpers
  const getRecordById = (id: string) => records.find((r) => r.id === id);
  const getOwnedRecords = () => records.filter((r) => r.status === "owned");
  const getWishlistRecords = () => records.filter((r) => r.status === "wishlist");
  const getFavoriteRecords = () => records.filter((r) => r.isFavorite);

  // Import records with cache invalidation
  const importRecords = async (importedRecords: Record[], mode: "merge" | "replace") => {
    if (!user) return;
    setSyncing(true);

    try {
      if (mode === "replace") {
        await supabase.from("records").delete().eq("user_id", user.id);
      }

      const dbRecords = importedRecords
        .filter((r) => {
          if (!r.artist || !r.album) {
            console.warn("Skipping record with missing artist or album:", r);
            return false;
          }
          return true;
        })
        .map((r) => {
          let year = new Date().getFullYear();
          if (r.year !== null && r.year !== undefined && !isNaN(Number(r.year)) && Number(r.year) > 0) {
            year = Number(r.year);
          }

          return {
            user_id: user.id,
            artist: r.artist,
            album: r.album,
            year: year,
            genre: r.genre || [],
            label: r.label || null,
            catalog_number: r.catalogNumber || null,
            format: r.format || "vinyl",
            format_details: r.formatDetails || null,
            pressing: r.pressing || null,
            cover_art: r.coverArt || null,
            my_rating: r.myRating || 3,
            recording_quality: r.recordingQuality || null,
            mastering_quality: r.masteringQuality || null,
            artistic_rating: r.artisticRating || null,
            critic_score: r.criticScore || null,
            critic_reviews: (r.criticReviews as unknown as Json) || null,
            status: r.status || "owned",
            date_added: r.dateAdded || new Date().toISOString().split("T")[0],
            purchase_price: r.purchasePrice || null,
            purchase_location: r.purchaseLocation || null,
            vinyl_recommendation: r.vinylRecommendation || null,
            recommendation_reason: r.recommendationReason || null,
            personal_notes: r.personalNotes || null,
            tags: r.tags || [],
            moods: r.moods || [],
            is_favorite: r.isFavorite || false,
            audiophile_assessment: r.audiophileAssessment || null,
            artistic_assessment: r.artisticAssessment || null,
            recommendations: (r.recommendations as unknown as Json) || null,
          };
        });

      if (dbRecords.length === 0) {
        toast.error("Keine gültigen Alben zum Importieren gefunden");
        return;
      }

      const { error } = await supabase.from("records").insert(dbRecords);

      if (error) throw error;

      // Invalidate cache and refetch
      await queryClient.invalidateQueries({ queryKey: ["records", user.id] });
      toast.success(`${dbRecords.length} Alben importiert`);
    } catch (error) {
      console.error("Error importing records:", error);
      toast.error("Fehler beim Importieren: " + (error instanceof Error ? error.message : "Unbekannter Fehler"));
    } finally {
      setSyncing(false);
    }
  };

  return {
    records,
    loading,
    syncing,
    addRecord,
    updateRecord,
    deleteRecord,
    toggleFavorite,
    getRecordById,
    getOwnedRecords,
    getWishlistRecords,
    getFavoriteRecords,
    importRecords,
    refetch,
  };
}
