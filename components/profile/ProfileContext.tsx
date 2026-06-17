"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const PROFILE_STORAGE_KEY = "mindspace-profile";

export type Profile = {
  id: string;
  name: string;
  description: string;
  accent: string;
};

export const PROFILES: Profile[] = [
  {
    id: "balanced",
    name: "Balanced",
    description: "Find flexible options that keep protein, calories, and cravings in sync.",
    accent: "from-blue-500 to-cyan-500",
  },
  {
    id: "high-protein",
    name: "High Protein",
    description: "Prioritize protein-dense meals and easy swaps across restaurants.",
    accent: "from-emerald-500 to-lime-500",
  },
  {
    id: "calorie-conscious",
    name: "Calorie Conscious",
    description: "Spot lighter meals and customize orders around calorie goals.",
    accent: "from-violet-500 to-fuchsia-500",
  },
];

const validProfileIds = new Set(PROFILES.map((profile) => profile.id));

export function isValidProfileId(profileId: string | null): profileId is string {
  return Boolean(profileId && validProfileIds.has(profileId));
}

type ProfileContextValue = {
  profile: Profile | null;
  isProfileReady: boolean;
  selectProfile: (profileId: string) => void;
  switchProfile: () => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isProfileReady, setIsProfileReady] = useState(false);

  useEffect(() => {
    try {
      const storedProfileId = window.localStorage.getItem(PROFILE_STORAGE_KEY);

      if (isValidProfileId(storedProfileId)) {
        setProfileId(storedProfileId);
      } else if (storedProfileId) {
        window.localStorage.removeItem(PROFILE_STORAGE_KEY);
      }
    } catch {
      // Ignore localStorage read errors so the profile picker remains usable.
    } finally {
      setIsProfileReady(true);
    }
  }, []);

  const selectProfile = useCallback((nextProfileId: string) => {
    if (!isValidProfileId(nextProfileId)) {
      return;
    }

    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, nextProfileId);
    } catch {
      // Ignore localStorage write errors; keep the in-memory selection for this session.
    }

    setProfileId(nextProfileId);
  }, []);

  const switchProfile = useCallback(() => {
    try {
      window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch {
      // Ignore localStorage write errors.
    }

    setProfileId(null);
  }, []);

  const profile = useMemo(
    () => PROFILES.find((candidate) => candidate.id === profileId) ?? null,
    [profileId]
  );

  const value = useMemo(
    () => ({ profile, isProfileReady, selectProfile, switchProfile }),
    [profile, isProfileReady, selectProfile, switchProfile]
  );

  if (!isProfileReady) {
    return null;
  }

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }

  return context;
}
