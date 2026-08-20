import { create } from "zustand";
import type { ReadSettings } from "../types";
import { withPersist } from "./persist";

export interface SettingsState {
  readSettings: ReadSettings;
  settingsUpdatedAt: number;
  hasCompletedOnboarding: boolean;
  showOnboardingGuide: boolean;
  _hasHydrated: boolean;

  // Actions
  completeOnboarding: () => void;
  setShowOnboardingGuide: (show: boolean) => void;
  updateReadSettings: (updates: Partial<ReadSettings>) => void;
  resetToDefaults: () => void;
}

const defaultReadSettings: ReadSettings = {
  fontSize: 16,
  lineHeight: 1.6,
  fontTheme: "system",
  useBookFonts: true,
  viewMode: "paginated",
  paginatedLayout: "double",
  fixedLayoutZoom: 1,
  pageMargin: 40,
  paragraphSpacing: 16,
  justifyBodyText: true,
  showTopTitleProgress: true,
  showBottomTimeBattery: true,
  volumeButtonsPageTurn: false,
  defaultHighlightColor: "yellow",
  followSystemFontScale: false,
};

function migrateSettingsState(state: SettingsState): SettingsState {
  let next = state;
  if (next.readSettings?.useBookFonts === undefined) {
    next = {
      ...next,
      readSettings: {
        ...next.readSettings,
        useBookFonts: true,
      },
    };
  }
  if (next.readSettings?.justifyBodyText === undefined) {
    next = {
      ...next,
      readSettings: {
        ...next.readSettings,
        justifyBodyText: true,
      },
    };
  }
  return next;
}

export const useSettingsStore = create<SettingsState>()(
  withPersist("settings", (set) => ({
    readSettings: defaultReadSettings,
    settingsUpdatedAt: 0,
    hasCompletedOnboarding: false,
    showOnboardingGuide: true,
    _hasHydrated: false,

    completeOnboarding: () => set({ hasCompletedOnboarding: true }),
    setShowOnboardingGuide: (show: boolean) => set({ showOnboardingGuide: show }),

    updateReadSettings: (updates) =>
      set((state) => ({
        readSettings: { ...state.readSettings, ...updates },
        settingsUpdatedAt: Date.now(),
      })),

    resetToDefaults: () =>
      set({
        readSettings: defaultReadSettings,
      }),
  }), undefined, migrateSettingsState),
);
