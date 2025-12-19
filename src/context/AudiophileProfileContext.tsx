import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AudiophileProfile } from "@/types/audiophileProfile";

interface AudiophileProfileContextType {
  profile: AudiophileProfile | null;
  updateProfile: (profile: AudiophileProfile) => void;
  hasProfile: boolean;
}

const defaultProfile: AudiophileProfile = {
  equipment: {
    turntable: "",
    amplifier: "",
    speakers: "",
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
};

const AudiophileProfileContext = createContext<AudiophileProfileContextType | undefined>(undefined);

export function AudiophileProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AudiophileProfile | null>(() => {
    const stored = localStorage.getItem("sonorium-audiophile-profile");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (profile) {
      localStorage.setItem("sonorium-audiophile-profile", JSON.stringify(profile));
    }
  }, [profile]);

  const updateProfile = (newProfile: AudiophileProfile) => {
    setProfile(newProfile);
  };

  const hasProfile = profile !== null && 
    !!(profile.equipment.turntable || profile.equipment.amplifier || profile.equipment.speakers);

  return (
    <AudiophileProfileContext.Provider
      value={{
        profile,
        updateProfile,
        hasProfile,
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
