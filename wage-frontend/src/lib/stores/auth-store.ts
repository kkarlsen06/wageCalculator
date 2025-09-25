"use client";

import { create } from "zustand";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";
import type { Session, User } from "@supabase/supabase-js";

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

export type UserProfile = {
  id: string;
  fullName?: string;
  avatarUrl?: string;
  email?: string;
  [key: string]: unknown;
};

export type AuthStoreState = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  status: AuthStatus;
  setStatus: (status: AuthStatus) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  reset: () => void;
};

const memoryStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const selectStorage = () =>
  typeof window === "undefined" ? memoryStorage : window.localStorage;

const initialState = {
  session: null,
  user: null,
  profile: null,
  status: "idle" as AuthStatus,
};

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      ...initialState,
      setStatus: (status) => set({ status }),
      setSession: (session) =>
        set({
          session,
          user: session?.user ?? null,
          status: session ? "authenticated" : "unauthenticated",
        }),
      setProfile: (profile) => set({ profile }),
      reset: () => set({ ...initialState, status: "unauthenticated" }),
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(selectStorage),
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        profile: state.profile,
        status: state.status,
      }),
    },
  ),
);
