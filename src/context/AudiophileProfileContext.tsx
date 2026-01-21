import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { AudiophileProfile, DEFAULT_SHOPS } from "@/types/audiophileProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface AudiophileProfileContextType {
  profile: AudiophileProfile | null;
  updateProfile: (profile: AudiophileProfile) => Promise<void>;
  hasProfile: boolean;
  loading: boolean;
}

const defaultProfile: AudiophileProfile = {
  equipment: {
    turntable: "",
    amplifier: "",
    speakers: "",
    cdPlayer: "",
    dac: "",
    other: "",
  },
  preferences: {
    genres: [],
    favoriteLabels: [],
    avoidLabels: [],
    soundPreference: "warm",
    listeningStyle: "critical",
  },
  mediaFormat: "vinyl",
  shops: DEFAULT_SHOPS,
};

const AudiophileProfileContext = createContext<AudiophileProfileContextType | undefined>(undefined);

export function AudiophileProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AudiophileProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from Supabase when user logs in
  const fetchProfile = useCallback(async () => {
    if (!user) {
      // No user logged in - try localStorage as fallback
      const stored = localStorage.getItem("sonorium-audiophile-profile");
      if (stored) {
        try {
          setProfile(JSON.parse(stored));
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("audiophile_profiles")
        .select("profile")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching audiophile profile:", error);
        // Fallback to localStorage
        const stored = localStorage.getItem("sonorium-audiophile-profile");
        if (stored) {
          try {
            setProfile(JSON.parse(stored));
          } catch {
            setProfile(null);
          }
        }
      } else if (data?.profile) {
        // Profile found in database
        const dbProfile = data.profile as unknown as AudiophileProfile;
        // Ensure shops array exists with defaults if missing
        if (!dbProfile.shops) {
          dbProfile.shops = DEFAULT_SHOPS;
        }
        setProfile(dbProfile);
        // Also update localStorage for offline access
        localStorage.setItem("sonorium-audiophile-profile", JSON.stringify(dbProfile));
      } else {
        // No profile in database - check localStorage and migrate if exists
        const stored = localStorage.getItem("sonorium-audiophile-profile");
        if (stored) {
          try {
            const localProfile = JSON.parse(stored) as AudiophileProfile;
            // Migrate localStorage profile to database
            await saveProfileToDatabase(user.id, localProfile);
            setProfile(localProfile);
          } catch {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      }
    } catch (err) {
      console.error("Unexpected error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Save profile to Supabase
  const saveProfileToDatabase = async (userId: string, profileData: AudiophileProfile) => {
    // Check if profile exists
    const { data: existing } = await supabase
      .from("audiophile_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    let error;
    if (existing) {
      // Update existing - cast to Json type
      const result = await supabase
        .from("audiophile_profiles")
        .update({ profile: JSON.parse(JSON.stringify(profileData)) })
        .eq("user_id", userId);
      error = result.error;
    } else {
      // Insert new - cast to Json type
      const result = await supabase
        .from("audiophile_profiles")
        .insert([{ user_id: userId, profile: JSON.parse(JSON.stringify(profileData)) }]);
      error = result.error;
    }

    if (error) {
      console.error("Error saving audiophile profile:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (newProfile: AudiophileProfile) => {
    // Always update local state and localStorage
    setProfile(newProfile);
    localStorage.setItem("sonorium-audiophile-profile", JSON.stringify(newProfile));

    // If user is logged in, also save to database
    if (user) {
      try {
        await saveProfileToDatabase(user.id, newProfile);
      } catch (err) {
        console.error("Failed to sync profile to cloud:", err);
        toast.error("Profil lokal gespeichert, Cloud-Sync fehlgeschlagen");
      }
    }
  };

  const hasProfile = profile !== null && 
    !!(profile.equipment?.turntable || profile.equipment?.amplifier || profile.equipment?.speakers);

  return (
    <AudiophileProfileContext.Provider
      value={{
        profile,
        updateProfile,
        hasProfile,
        loading,
      }}
    >
      {children}
    </AudiophileProfileContext.Provider>
  );
}

export function useAudiophileProfile() {
  const context = useContext(AudiophileProfileContext);
  if (!context) {
    throw new Error("useAudiophileProfile must be used within an AudiophileProfileProvider");
  }
  return context;
}

export { defaultProfile };
