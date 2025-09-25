"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent, type JSX } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/card";
import Text from "@/components/text";
import Button from "@/components/button";
import { useAuth } from "@/components/providers";
import styles from "./LoginPage.module.css";

const REMEMBER_FLAG_KEY = "wagecalc:remember";
const REMEMBER_EMAIL_KEY = "wagecalc:remember:email";

export default function LoginPage(): JSX.Element {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent(): JSX.Element {
  const { supabase, session, loading, refreshSession, status: authStatus } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = useMemo(() => {
    const requested = searchParams.get("redirect");
    if (requested && requested.startsWith("/")) {
      return requested;
    }
    return "/";
  }, [searchParams]);

  const loadRememberedEmail = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedFlag = window.localStorage.getItem(REMEMBER_FLAG_KEY);
    if (storedFlag === "true") {
      setRememberMe(true);
      const storedEmail = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }
  }, []);

  useEffect(() => {
    loadRememberedEmail();
  }, [loadRememberedEmail]);

  useEffect(() => {
    const message = searchParams.get("message");
    if (message) {
      setStatusMessage(decodeURIComponent(message));
    }
  }, [searchParams]);

  useEffect(() => {
    if (loading) return;
    if (session) {
      router.replace(redirectTo);
    }
  }, [loading, redirectTo, router, session]);

  const persistRememberPreference = useCallback(
    (shouldRemember: boolean, value: string) => {
      if (typeof window === "undefined") {
        return;
      }

      if (shouldRemember) {
        window.localStorage.setItem(REMEMBER_FLAG_KEY, "true");
        window.localStorage.setItem(REMEMBER_EMAIL_KEY, value);
      } else {
        window.localStorage.removeItem(REMEMBER_FLAG_KEY);
        window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);
      setStatusMessage(null);

      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedEmail) {
        setFormError("E-postadresse er påkrevd.");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setFormError("Oppgi en gyldig e-postadresse.");
        return;
      }

      if (!password) {
        setFormError("Passord er påkrevd.");
        return;
      }

      setIsSubmitting(true);

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) {
          setFormError(error.message ?? "Kunne ikke logge inn. Prøv igjen senere.");
          return;
        }

        persistRememberPreference(rememberMe, trimmedEmail);

        await refreshSession();
        router.replace(redirectTo);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Noe gikk galt under innlogging.";
        setFormError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password, persistRememberPreference, redirectTo, refreshSession, rememberMe, router, supabase],
  );

  const isBusy = loading || isSubmitting;

  return (
    <main className={styles.page}>
      <Card className={styles.card} material="glass" materialProps={{ thickness: "normal" }}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.header}>
            <Text tag="h1" fontClass="display2">
              Velkommen tilbake
            </Text>
            <Text tag="p" color="onsurfacevariant" fontClass="body">
              Logg inn for å fortsette lønnsberegningen.
            </Text>
          </div>

          <div className={styles.field}>
            <label htmlFor="email">E-post</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="din@epost.no"
              disabled={isBusy}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Passord</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              disabled={isBusy}
              required
            />
          </div>

          <div className={styles.checkboxRow}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => {
                  const next = event.target.checked;
                  setRememberMe(next);
                  if (!next) {
                    persistRememberPreference(false, "");
                  }
                }}
                disabled={isBusy}
              />
              Husk meg
            </label>
            <a href="mailto:support@kalkulator.no">Glemt passord?</a>
          </div>

          <p className={styles.error}>{formError}</p>
          <p className={styles.status}>{statusMessage ?? (authStatus === "loading" ? "Kobler til Supabase…" : null)}</p>

          <div className={styles.actions}>
            <Button
              type="submit"
              label={isSubmitting ? "Logger inn…" : "Logg inn"}
              disabled={isBusy}
              variant="fill"
              color="primary"
            />
          </div>

          <div className={styles.secondaryActions}>
            <span>Har du ikke konto?</span>
            <Link href="/onboarding">Opprett konto</Link>
          </div>
        </form>
      </Card>
    </main>
  );
}
