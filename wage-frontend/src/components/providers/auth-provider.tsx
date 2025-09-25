"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type PropsWithChildren,
} from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { appConfig } from "@/lib/config";
import { getBrowserSupabaseClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/stores/auth-store";

export type AuthContextValue = {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const setSessionInStore = useAuthStore((state) => state.setSession);
  const setStatus = useAuthStore((state) => state.setStatus);
  const setProfile = useAuthStore((state) => state.setProfile);

  useEffect(() => {
    let isMounted = true;
    const shouldLog = appConfig.features.enableVerboseLogging;

    setStatus("loading");

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;

      const nextSession = data.session ?? null;

      setSession(nextSession);
      setSessionInStore(nextSession);
      if (!nextSession) {
        setProfile(null);
      }
      setStatus(nextSession ? "authenticated" : "unauthenticated");
      setLoading(false);

      if (shouldLog) {
        console.info("[auth] session initialised", {
          isAuthenticated: Boolean(nextSession),
        });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!isMounted) return;

        setSession(nextSession);
        setSessionInStore(nextSession);
        if (!nextSession) {
          setProfile(null);
        }

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
  }, [setProfile, setSessionInStore, setStatus, supabase]);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    const nextSession = data.session ?? null;

    setSession(nextSession);
    setSessionInStore(nextSession);
    setStatus(nextSession ? "authenticated" : "unauthenticated");
    if (!nextSession) {
      setProfile(null);
    }
    setLoading(false);
  }, [setProfile, setSessionInStore, setStatus, supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      supabase,
      session,
      user: session?.user ?? null,
      loading,
      refreshSession,
    }),
    [loading, refreshSession, session, supabase],
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
