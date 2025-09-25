"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type PropsWithChildren,
  type JSX,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useRuntimeConfig } from "./config-provider";
import { getBrowserSupabaseClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { AuthStatus, UserProfile } from "@/lib/stores/auth-store";

type BrowserSupabaseClient = ReturnType<typeof getBrowserSupabaseClient>;

export type AuthContextValue = {
  supabase: BrowserSupabaseClient;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  status: AuthStatus;
  loading: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const profile = useAuthStore((state) => state.profile);
  const status = useAuthStore((state) => state.status);
  const setSessionInStore = useAuthStore((state) => state.setSession);
  const setStatus = useAuthStore((state) => state.setStatus);
  const setProfile = useAuthStore((state) => state.setProfile);
  const { config: runtimeConfig } = useRuntimeConfig();
  const verboseFeature = runtimeConfig.features?.["enableVerboseLogging"] as boolean | undefined;
  const verboseFlag = runtimeConfig.flags?.["enableVerboseLogging"] ?? undefined;
  const shouldLog = Boolean(runtimeConfig.debug || verboseFlag || verboseFeature);

  const fetchProfile = useCallback(
    async (targetSession: Session | null): Promise<UserProfile | null> => {
      if (!targetSession) {
        return null;
      }

      try {
        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("*")
          .eq("id", targetSession.user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        const record = (data as Record<string, unknown> | null) ?? null;

        if (!record) {
          return {
            id: targetSession.user.id,
            email: targetSession.user.email ?? undefined,
          };
        }

        const resolved: UserProfile = {
          id:
            typeof record["id"] === "string"
              ? (record["id"] as string)
              : targetSession.user.id,
          fullName:
            typeof record["full_name"] === "string"
              ? (record["full_name"] as string)
              : (record["fullName"] as string | undefined),
          avatarUrl:
            typeof record["avatar_url"] === "string"
              ? (record["avatar_url"] as string)
              : (record["avatarUrl"] as string | undefined),
          email:
            typeof record["email"] === "string"
              ? (record["email"] as string)
              : targetSession.user.email ?? undefined,
          ...record,
        };

        return resolved;
      } catch (error) {
        if (shouldLog) {
          console.warn("[auth] profile fetch failed", error);
        }
        return {
          id: targetSession.user.id,
          email: targetSession.user.email ?? undefined,
        };
      }
    },
    [shouldLog, supabase],
  );

  useEffect(() => {
    let isMounted = true;

    const initialise = async () => {
      try {
        setStatus("loading");
        setLoading(true);

        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;

        const nextSession = data.session ?? null;
        setSession(nextSession);
        setSessionInStore(nextSession);

        const nextProfile = await fetchProfile(nextSession);
        if (!isMounted) return;
        setProfile(nextProfile);

        setStatus(nextSession ? "authenticated" : "unauthenticated");

        if (shouldLog) {
          console.info("[auth] session initialised", {
            isAuthenticated: Boolean(nextSession),
          });
        }
      } catch (error) {
        if (shouldLog) {
          console.error("[auth] failed to initialise session", error);
        }
        if (isMounted) {
          setSession(null);
          setSessionInStore(null);
          setProfile(null);
          setStatus("unauthenticated");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initialise();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        if (!isMounted) return;

        setSession(nextSession);
        setSessionInStore(nextSession);

        const nextProfile = await fetchProfile(nextSession);
        if (!isMounted) return;
        setProfile(nextProfile);

        const isAuthenticated = Boolean(nextSession);
        setStatus(isAuthenticated ? "authenticated" : "unauthenticated");

        if (shouldLog) {
          console.info("[auth] auth event", { event, isAuthenticated });
        }
      },
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [fetchProfile, setProfile, setSessionInStore, setStatus, supabase, shouldLog]);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const nextSession = data.session ?? null;

      setSession(nextSession);
      setSessionInStore(nextSession);
      const nextProfile = await fetchProfile(nextSession);
      setProfile(nextProfile);
      setStatus(nextSession ? "authenticated" : "unauthenticated");
    } catch (error) {
      if (shouldLog) {
        console.error("[auth] failed to refresh session", error);
      }
      setSession(null);
      setSessionInStore(null);
      setProfile(null);
      setStatus("unauthenticated");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchProfile, setProfile, setSessionInStore, setStatus, supabase, shouldLog]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      if (shouldLog) {
        console.error("[auth] sign-out failed", error);
      }
      throw error as Error;
    } finally {
      setSession(null);
      setSessionInStore(null);
      setProfile(null);
      setStatus("unauthenticated");
      setLoading(false);
    }
  }, [setProfile, setSessionInStore, setStatus, supabase, shouldLog]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!session?.user) {
        throw new Error("Cannot update profile without an active session");
      }

      const payload: Record<string, unknown> = {
        id: session.user.id,
      };

      if (Object.prototype.hasOwnProperty.call(updates, "fullName")) {
        payload.full_name = updates.fullName ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "avatarUrl")) {
        payload.avatar_url = updates.avatarUrl ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "email")) {
        payload.email = updates.email ?? null;
      }

      for (const [key, value] of Object.entries(updates)) {
        if (["id", "fullName", "avatarUrl", "email"].includes(key)) {
          continue;
        }
        payload[key] = value;
      }

      const { data, error } = await (supabase as any)
        .from("profiles")
        .upsert(payload, { onConflict: "id" })
        .select()
        .maybeSingle();

      if (error) {
        if (shouldLog) {
          console.error("[auth] profile update failed", error);
        }
        throw error;
      }

      const record = (data as Record<string, unknown> | null) ?? payload;

      const nextProfile: UserProfile = {
        id:
          typeof record["id"] === "string"
            ? (record["id"] as string)
            : session.user.id,
        fullName:
          typeof record["full_name"] === "string"
            ? (record["full_name"] as string)
            : updates.fullName ?? undefined,
        avatarUrl:
          typeof record["avatar_url"] === "string"
            ? (record["avatar_url"] as string)
            : updates.avatarUrl ?? undefined,
        email:
          typeof record["email"] === "string"
            ? (record["email"] as string)
            : updates.email ?? session.user.email ?? undefined,
        ...record,
      };

      setProfile(nextProfile);
      return nextProfile;
    },
    [session, shouldLog, supabase, setProfile],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      supabase,
      session,
      user: session?.user ?? null,
      profile,
      status,
      loading,
      refreshSession,
      signOut,
      updateProfile,
    }),
    [loading, profile, refreshSession, session, signOut, status, supabase, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
