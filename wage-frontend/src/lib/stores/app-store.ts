"use client";

import { create } from "zustand";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";

type ThemePreference = "system" | "light" | "dark";

type AppSettings = {
  theme: ThemePreference;
  skeletonsEnabled: boolean;
  notificationsEnabled: boolean;
  lastConfigSync: string | null;
};

export type AppStoreState = AppSettings & {
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
  setSkeletonsEnabled: (value: boolean) => void;
  setNotificationsEnabled: (value: boolean) => void;
  setLastConfigSync: (isoDate: string | null) => void;
  reset: () => void;
};

const memoryStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const selectStorage = () =>
  typeof window === "undefined" ? memoryStorage : window.localStorage;

const initialSettings: AppSettings = {
  theme: "system",
  skeletonsEnabled: true,
  notificationsEnabled: true,
  lastConfigSync: null,
};

export const useAppStore = create<AppStoreState>()(
  persist(
    (set, get) => ({
      ...initialSettings,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => {
        const order: ThemePreference[] = ["light", "dark", "system"];
        const current = get().theme;
        const nextIndex = (order.indexOf(current) + 1) % order.length;
        set({ theme: order[nextIndex] });
      },
      setSkeletonsEnabled: (value) => set({ skeletonsEnabled: value }),
      setNotificationsEnabled: (value) => set({ notificationsEnabled: value }),
      setLastConfigSync: (isoDate) => set({ lastConfigSync: isoDate }),
      reset: () => set({ ...initialSettings }),
    }),
    {
      name: "app-store",
      storage: createJSONStorage(selectStorage),
    },
  ),
);
