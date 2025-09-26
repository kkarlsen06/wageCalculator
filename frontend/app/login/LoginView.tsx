"use client";

import Button from "@/components/button";
import Icon from "@/components/icon";
import { supabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  InputHTMLAttributes,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { IconName } from "lucide-react/dynamic";
import type { ReactNode } from "react";

const HERO_FEATURES: Array<{
  icon: IconName;
  title: string;
  description: string;
}> = [
  {
    icon: "clock",
    title: "Registrer skift på sekunder",
    description: "Legg inn arbeidstid mens minnene er friske og unngå manuelt rot.",
  },
  {
    icon: "trending-up",
    title: "Følg utviklingen i sanntid",
    description: "Dashbordet gir deg timer, tillegg og overtidsgrunnlag uten ekstra regning.",
  },
  {
    icon: "shield-check",
    title: "Sikker innlogging med Supabase",
    description: "Data lagres kryptert og tilgangen styres automatisk med rollestyring.",
  },
];

type Props = {
  nextPath: string;
  initialError?: string;
};

type ViewMode = "login" | "signup" | "reset-request" | "reset-verify";
type StatusTone = "error" | "success" | "info";

type StatusMessage = {
  tone: StatusTone;
  message: string;
} | null;

const STATUS_STYLE: Record<StatusTone, { container: string; icon: IconName }> = {
  error: { container: "bg-errorcontainer", icon: "alert-circle" },
  success: { container: "bg-successcontainer", icon: "check-circle" },
  info: { container: "bg-infocontainer", icon: "info" },
};

export default function LoginView({ nextPath, initialError }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => supabaseClient(), []);

  const [mode, setMode] = useState<ViewMode>("login");
  const [status, setStatus] = useState<StatusMessage>(
    initialError ? { tone: "error", message: initialError } : null,
  );
  const [loading, setLoading] = useState({
    login: false,
    signup: false,
    google: false,
    resetRequest: false,
    resetVerify: false,
    resend: false,
  });

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFirstName, setSignupFirstName] = useState("");

  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetCountdown, setResetCountdown] = useState(0);

  useEffect(() => {
    if (resetCountdown <= 0) return;
    const timer = window.setTimeout(
      () => setResetCountdown((seconds) => seconds - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resetCountdown]);

  const setModeAndClear = (nextMode: ViewMode) => {
    setMode(nextMode);
    if (nextMode === "login") {
      // Preserve success messages when returning to login
      setStatus((current) =>
        current?.tone === "success" ? current : null,
      );
    } else {
      setStatus(null);
    }
  };

  const redirectToApp = (path: string) => {
    router.replace(path as any);
    router.refresh();
  };

  const handleAuthError = (message: string, tone: StatusTone = "error") => {
    setStatus({ tone, message });
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading((state) => ({ ...state, login: true }));
    setStatus(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) {
        handleAuthError(error.message);
        return;
      }

      redirectToApp(nextPath || "/");
    } catch (error: any) {
      handleAuthError(error?.message ?? "Kunne ikke logge inn");
    } finally {
      setLoading((state) => ({ ...state, login: false }));
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading((state) => ({ ...state, google: true }));
    setStatus(null);
    try {
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(
        nextPath || "/",
      )}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) handleAuthError(error.message);
    } catch (error: any) {
      handleAuthError(error?.message ?? "Google-innlogging feilet");
    } finally {
      setLoading((state) => ({ ...state, google: false }));
    }
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading((state) => ({ ...state, signup: true }));
    setStatus(null);

    if (!signupEmail.trim() || !signupPassword || !signupFirstName.trim()) {
      handleAuthError("Fyll ut alle feltene");
      setLoading((state) => ({ ...state, signup: false }));
      return;
    }

    if (signupPassword.length < 8) {
      handleAuthError("Passordet må ha minst 8 tegn");
      setLoading((state) => ({ ...state, signup: false }));
      return;
    }

    try {
      const origin = window.location.origin;
      const postSignupRedirect = `${origin}/auth/callback?next=${encodeURIComponent(
        "/onboarding",
      )}`;

      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        options: {
          emailRedirectTo: postSignupRedirect,
          data: { first_name: signupFirstName.trim() },
        },
      });

      if (error) {
        handleAuthError(error.message);
        return;
      }

      if (data?.session) {
        redirectToApp("/onboarding");
        return;
      }

      handleAuthError(
        "Registrering sendt – sjekk e-posten din for å bekrefte kontoen.",
        "info",
      );
      setMode("login");
    } catch (error: any) {
      handleAuthError(error?.message ?? "Kunne ikke opprette konto");
    } finally {
      setLoading((state) => ({ ...state, signup: false }));
    }
  };

  const sendRecoveryEmail = async () => {
    if (!resetEmail.trim()) {
      handleAuthError("Skriv inn e-postadressen din");
      return false;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim(),
      );
      if (error) {
        handleAuthError(error.message);
        return false;
      }

      setStatus({ tone: "success", message: "Kode sendt! Sjekk e-posten din." });
      setResetCountdown(60);
      setMode("reset-verify");
      return true;
    } catch (error: any) {
      handleAuthError(error?.message ?? "Kunne ikke sende kode");
      return false;
    }
  };

  const handleResetRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading((state) => ({ ...state, resetRequest: true }));
    const success = await sendRecoveryEmail();
    if (success) {
      setResetCode("");
      setResetPassword("");
    }
    setLoading((state) => ({ ...state, resetRequest: false }));
  };

  const handleResetVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading((state) => ({ ...state, resetVerify: true }));
    setStatus(null);

    if (!resetCode.trim() || !resetPassword) {
      handleAuthError("Vennligst fyll ut kode og nytt passord");
      setLoading((state) => ({ ...state, resetVerify: false }));
      return;
    }

    if (!/^\d{6}$/.test(resetCode.trim())) {
      handleAuthError("Koden må være 6 sifre");
      setLoading((state) => ({ ...state, resetVerify: false }));
      return;
    }

    if (resetPassword.length < 8) {
      handleAuthError("Passordet må ha minst 8 tegn");
      setLoading((state) => ({ ...state, resetVerify: false }));
      return;
    }

    try {
      const verifyResult = await supabase.auth.verifyOtp({
        email: resetEmail.trim(),
        token: resetCode.trim(),
        type: "recovery",
      });

      if (verifyResult.error) {
        handleAuthError(verifyResult.error.message);
        return;
      }

      const updateResult = await supabase.auth.updateUser({
        password: resetPassword,
      });

      if (updateResult.error) {
        handleAuthError(updateResult.error.message);
        return;
      }

      await supabase.auth.signOut();
      setResetCode("");
      setResetPassword("");
      setStatus({
        tone: "success",
        message: "Passord oppdatert! Logg inn med det nye passordet.",
      });
      setMode("login");
    } catch (error: any) {
      handleAuthError(error?.message ?? "Kunne ikke oppdatere passordet");
    } finally {
      setLoading((state) => ({ ...state, resetVerify: false }));
    }
  };

  const handleResend = async () => {
    if (resetCountdown > 0) return;
    setLoading((state) => ({ ...state, resend: true }));
    await sendRecoveryEmail();
    setLoading((state) => ({ ...state, resend: false }));
  };

  const Input = (
    props: InputHTMLAttributes<HTMLInputElement> & { label: string; helper?: string },
  ) => {
    const { label, helper, id, className, ...rest } = props;
    const composedClassName = ["login-input", "w-full", className].filter(Boolean).join(" ");
    return (
      <label className="flex-v gap-xs w-full" htmlFor={id}>
        <span className="label color-light__onsurface">{label}</span>
        <input id={id} className={composedClassName} {...rest} />
        {helper ? (
          <span className="caption color-light__onsurfacevariant">{helper}</span>
        ) : null}
      </label>
    );
  };

  const SectionTitle = ({ children }: { children: ReactNode }) => (
    <h1 className="heading">{children}</h1>
  );

  const statusBanner = status ? (
    <div className={`login-status ${STATUS_STYLE[status.tone].container}`} role="status">
      <Icon name={STATUS_STYLE[status.tone].icon} color="currentColor" aria-hidden />
      <span className="body">{status.message}</span>
    </div>
  ) : null;

  return (
    <main
      className="login-shell color-light__onbackground"
      style={{
        background:
          "radial-gradient(circle at 5% 15%, rgba(219, 225, 255, 0.75), transparent 55%), radial-gradient(circle at 95% 5%, rgba(168, 237, 255, 0.55), transparent 40%), radial-gradient(circle at 80% 80%, rgba(181, 196, 255, 0.45), transparent 55%), var(--lk-background)",
      }}
    >
      <div className="login-surface">
        <section className="login-hero bg-surfacecontainerhigh">
          <div className="login-hero__badge caption">Norsk lønn for moderne skift</div>
          <div className="flex-v gap-sm">
            <h1 className="display2">Wage Calculator</h1>
            <p className="body color-light__onsurfacevariant">
              Hold styr på timer, tillegg og utbetalinger uten å ofre kvelder på regneark.
            </p>
          </div>
          <ul className="login-hero__features">
            {HERO_FEATURES.map((feature) => (
              <li key={feature.title} className="login-hero__feature">
                <span className="login-hero__icon">
                  <Icon name={feature.icon} color="primary" aria-hidden />
                </span>
                <div className="flex-v gap-3xs">
                  <span className="subheading">{feature.title}</span>
                  <span className="body color-light__onsurfacevariant">{feature.description}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="login-panel">
          <div className="login-card bg-surfacecontainer rounded-xl shadow-lg border-style-solid border-width-xs border-color-outlinevariant">
            <header className="flex-v gap-2xs">
              <span className="caption color-light__onsurfacevariant">Logg inn</span>
              <SectionTitle>Velkommen tilbake</SectionTitle>
              <p className="body color-light__onsurfacevariant">Fortsett der du slapp og få full kontroll på lønnsslippene.</p>
            </header>

            {statusBanner}

            {mode === "login" && (
              <div className="flex-v gap-lg">
                <form className="flex-v gap-md" onSubmit={handleLogin}>
                  <Input
                    id="login-email"
                    type="email"
                    label="E-post"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    required
                  />
                  <Input
                    id="login-password"
                    type="password"
                    label="Passord"
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    required
                  />
                  <Button
                    type="submit"
                    label={loading.login ? "Logger inn..." : "Logg inn"}
                    color="primary"
                    variant="fill"
                    disabled={loading.login}
                    modifiers="w-full"
                  />
                </form>

                <Button
                  type="button"
                  label="Opprett ny konto"
                  variant="outline"
                  color="secondary"
                  startIcon="user-plus"
                  onClick={() => setModeAndClear("signup")}
                  modifiers="w-full"
                />

                <div className="login-divider">
                  <span className="body color-light__onsurfacevariant">eller</span>
                </div>

                <Button
                  type="button"
                  label={loading.google ? "Åpner Google..." : "Fortsett med Google"}
                  variant="outline"
                  color="primary"
                  startIcon="globe"
                  onClick={handleGoogleSignIn}
                  disabled={loading.google}
                  modifiers="w-full"
                />

                <button
                  type="button"
                  className="login-link"
                  onClick={() => setModeAndClear("reset-request")}
                >
                  Glemt passordet?
                </button>
              </div>
            )}

            {mode === "signup" && (
              <div className="flex-v gap-lg">
                <SectionTitle>Opprett konto</SectionTitle>
                <p className="body color-light__onsurfacevariant">
                  Start gratis og inviter teamet når du er klar. Du kan alltid oppgradere senere.
                </p>
                <form className="flex-v gap-md" onSubmit={handleSignup}>
                  <Input
                    id="signup-email"
                    type="email"
                    label="E-post"
                    autoComplete="email"
                    value={signupEmail}
                    onChange={(event) => setSignupEmail(event.target.value)}
                    required
                  />
                  <Input
                    id="signup-password"
                    type="password"
                    label="Passord"
                    autoComplete="new-password"
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    helper="Minst 8 tegn og gjerne både tall og bokstaver."
                    required
                  />
                  <Input
                    id="signup-firstname"
                    type="text"
                    label="Fornavn"
                    autoComplete="given-name"
                    value={signupFirstName}
                    onChange={(event) => setSignupFirstName(event.target.value)}
                    required
                  />
                  <Button
                    type="submit"
                    label={loading.signup ? "Oppretter konto..." : "Opprett konto"}
                    color="primary"
                    variant="fill"
                    disabled={loading.signup}
                    modifiers="w-full"
                  />
                </form>
                <Button
                  type="button"
                  label="Tilbake til innlogging"
                  variant="text"
                  color="primary"
                  onClick={() => setModeAndClear("login")}
                  modifiers="w-full"
                />
              </div>
            )}

            {mode === "reset-request" && (
              <div className="flex-v gap-lg">
                <SectionTitle>Tilbakestill passord</SectionTitle>
                <p className="body color-light__onsurfacevariant">
                  Vi sender en engangskode til e-posten din. Bruk den for å velge nytt passord.
                </p>
                <form className="flex-v gap-md" onSubmit={handleResetRequest}>
                  <Input
                    id="reset-email"
                    type="email"
                    label="E-post"
                    autoComplete="email"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    required
                  />
                  <Button
                    type="submit"
                    label={loading.resetRequest ? "Sender kode..." : "Send kode"}
                    color="primary"
                    variant="fill"
                    disabled={loading.resetRequest}
                    modifiers="w-full"
                  />
                </form>
                <Button
                  type="button"
                  label="Tilbake til innlogging"
                  variant="text"
                  color="primary"
                  onClick={() => setModeAndClear("login")}
                />
              </div>
            )}

            {mode === "reset-verify" && (
              <div className="flex-v gap-lg">
                <SectionTitle>Angi kode og nytt passord</SectionTitle>
                <form className="flex-v gap-md" onSubmit={handleResetVerify}>
                  <Input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    label="6-sifret kode"
                    value={resetCode}
                    onChange={(event) => setResetCode(event.target.value)}
                    required
                    maxLength={6}
                  />
                  <Input
                    id="reset-password"
                    type="password"
                    label="Nytt passord"
                    autoComplete="new-password"
                    value={resetPassword}
                    onChange={(event) => setResetPassword(event.target.value)}
                    helper="Minst 8 tegn."
                    required
                  />
                  <Button
                    type="submit"
                    label={loading.resetVerify ? "Oppdaterer..." : "Oppdater passord"}
                    color="primary"
                    variant="fill"
                    disabled={loading.resetVerify}
                    modifiers="w-full"
                  />
                </form>
                <div className="flex-v gap-sm">
                  <Button
                    type="button"
                    label={
                      resetCountdown > 0
                        ? `Send ny kode (${resetCountdown}s)`
                        : loading.resend
                          ? "Sender..."
                          : "Send ny kode"
                    }
                    variant="text"
                    color="primary"
                    onClick={handleResend}
                    disabled={resetCountdown > 0 || loading.resend}
                  />
                  <div className="flex-h gap-sm">
                    <Button
                      type="button"
                      label="Tilbake til e-poststeg"
                      variant="text"
                      color="primary"
                      onClick={() => setModeAndClear("reset-request")}
                    />
                    <Button
                      type="button"
                      label="Tilbake til innlogging"
                      variant="text"
                      color="primary"
                      onClick={() => setModeAndClear("login")}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}