// Login page: renders markup from former app/login.html and wires existing auth logic
// Include legal modal styles only for login route
import '/src/css/legal-modal.css';

export function renderLogin() {
  // Compute marketing home based on environment (dev vs prod)
  const marketingUrl = (() => {
    try {
      if (import.meta.env && import.meta.env.PROD) return 'https://www.kkarlsen.dev/';
      // Dev: default to localhost marketing server
      const { protocol } = window.location;
      return `${protocol}//localhost:5174/`;
    } catch (_) {
      return 'https://www.kkarlsen.dev/';
    }
  })();

  // Keep DOM semantics and classes identical
  return `
  <div class="pb-80">
    <div class="absolute-top-left">
      <a href="${marketingUrl}" class="btn btn-secondary back-link" aria-label="Tilbake til hovedside">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m12 19-7-7 7-7"/>
          <path d="M19 12H5"/>
        </svg>
        Tilbake til hovedside
      </a>
    </div>

    <main id="main-content">
      <div id="auth-box" class="auth-center">
        <div class="login-card" aria-labelledby="login-heading">
          <form id="login-form" novalidate>
            <h2 id="login-heading" class="mb-20">Logg inn</h2>
            <label for="email" class="form-label">E-post</label>
            <input id="email" name="email" type="email" placeholder="E-post" required class="form-control mb-12" aria-describedby="auth-msg" autocomplete="email" />
            <label for="password" class="form-label">Passord</label>
            <input id="password" name="password" type="password" placeholder="Passord" required class="form-control mb-18" aria-describedby="auth-msg" autocomplete="current-password" />
            <button id="login-btn" type="submit" class="btn btn-primary mb-12">Logg inn</button>
          </form>

          <button id="signup-btn" class="btn btn-secondary mb-12">Opprett ny konto</button>

          <div class="relative my-4">
            <div class="h-px w-full bg-white/10"></div>
            <span class="absolute inset-0 -top-3 mx-auto w-fit px-3 text-xs font-medium text-white/60 bg-black/60 backdrop-blur rounded-full" aria-hidden="true">eller</span>
          </div>

          <button id="btn-google" type="button" class="btn btn-secondary mb-12" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
              <path d="M44.5 20H24v8.5h11.8C34.6 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 3.1l6-6C34.6 4.3 29.6 2 24 2 12.4 2 3 11.4 3 23s9.4 21 21 21 20-9.4 20-21c0-1.2-.1-2.1-.3-3z" fill="#FFC107"/>
              <path d="M6.3 14.7l7 5.1C14.7 16.3 18.9 13 24 13c3.1 0 5.9 1.1 8.1 3.1l6-6C34.6 4.3 29.6 2 24 2 15.5 2 8.2 6.7 6.3 14.7z" fill="#FF3D00"/>
              <path d="M24 44c5.7 0 10.6-1.9 14.1-5.2l-6.5-5.4c-2 1.4-4.6 2.2-7.6 2.2-5.9 0-10.8-3.9-12.6-9.3l-7.1 5.5C7.2 38.8 15 44 24 44z" fill="#4CAF50"/>
              <path d="M44.5 20H24v8.5h11.8c-1 2.9-3 5.2-5.6 6.9l6.5 5.4C39.8 42.5 45 38 45 23c0-1.2-.2-2.1-.5-3z" fill="#1976D2"/>
            </svg>
            <span>Fortsett med Google</span>
          </button>
          <button id="show-reset-btn" class="mt-4" style="background:none;border:none;color:var(--accent);font-size:14px;cursor:pointer;" aria-label="Tilbakestill med kode">Tilbakestill med kode</button>
          <div id="auth-msg" role="alert" aria-live="polite" style="color: var(--error); min-height: 24px; text-align: center; font-size: 15px;"></div>
        </div>
      </div>

      <div id="signup-card" class="auth-center" style="display:none;">
        <div class="login-card">
          <form id="signup-form" novalidate>
            <h2 class="mb-20">Opprett ny konto</h2>
            <label for="signup-email" class="form-label">E-post</label>
            <input id="signup-email" name="email" type="email" placeholder="E-post" required class="form-control mb-12" autocomplete="email" />
            <label for="signup-password" class="form-label">Passord</label>
            <input id="signup-password" name="password" type="password" placeholder="Passord" required class="form-control mb-12" autocomplete="new-password" />
            <label for="signup-name" class="form-label">Fornavn</label>
            <input id="signup-name" name="given-name" type="text" placeholder="Fornavn" required class="form-control mb-12" autocomplete="given-name" />

            <div class="form-checkbox-group mb-18">
              <label class="form-checkbox-label">
                <input type="checkbox" id="terms-accept" required class="form-checkbox" />
                <span class="checkmark"></span>
                <span class="checkbox-text">
                  Jeg har lest og godtar <button type="button" class="link-button" id="show-terms-btn">vilkår og betingelser</button> og <button type="button" class="link-button" id="show-privacy-btn">personvernpolicy</button>
                  <br><small style="color: var(--text-secondary); font-size: 12px; margin-top: 4px; display: block;">Klikk her for å lese vilkårene først</small>
                </span>
              </label>
            </div>

            <button id="create-account-btn" type="submit" class="btn btn-primary mb-12">Opprett konto</button>
          </form>
          <button id="back-login-signup-btn" class="btn btn-secondary">Tilbake til innlogging</button>
          <p id="signup-msg" style="color: var(--danger); min-height: 24px; text-align: center; font-size: 15px;"></p>
        </div>
      </div>

      <div id="reset-form" class="auth-center" style="display:none;">
        <div class="login-card">
          <div id="reset-step-1">
            <form id="reset-email-form" novalidate>
              <h2 class="mb-20">Tilbakestill med kode</h2>
              <label for="reset-email" class="form-label">E-post</label>
              <input id="reset-email" name="email" type="email" placeholder="E-post" required class="form-control mb-18" autocomplete="email" />
              <button id="reset-send" type="submit" class="btn btn-primary mb-12">Send kode</button>
            </form>
            <button id="back-to-login-btn" class="btn btn-secondary">Tilbake</button>
          </div>

          <div id="reset-step-2" style="display:none;">
            <form id="reset-code-form" novalidate>
              <h2 class="mb-20">Skriv inn kode og nytt passord</h2>
              <label for="reset-code" class="form-label">6-sifret kode fra e-post</label>
              <input id="reset-code" name="code" type="text" placeholder="123456" required class="form-control mb-12" maxlength="6" pattern="[0-9]{6}" autocomplete="one-time-code" />
              <label for="reset-password" class="form-label">Nytt passord</label>
              <input id="reset-password" name="password" type="password" placeholder="Nytt passord" required class="form-control mb-18" autocomplete="new-password" />
              <button id="reset-confirm" type="submit" class="btn btn-primary mb-12">Oppdater passord</button>
            </form>
            <button id="reset-back" class="btn btn-secondary mb-12">Tilbake til e-post</button>
            <p id="resend-timer" style="font-size: 14px; color: var(--text-secondary); text-align: center; margin-bottom: 8px;"></p>
            <button id="reset-resend" class="btn" style="background:none;border:none;color:var(--accent);font-size:14px;cursor:pointer;" disabled>Send ny kode</button>
          </div>

          <p id="reset-msg" role="alert" aria-live="polite" style="color: var(--danger); min-height: 24px; text-align: center; font-size: 15px;"></p>
        </div>
      </div>

      <div id="complete-profile-card" class="auth-center" style="display:none;">
        <div class="login-card">
          <form id="complete-profile-form" novalidate>
            <h2 class="mb-20">Fullfør profilen din</h2>
            <p style="margin-bottom: 20px; color: var(--text-secondary); text-align: center;">Vennligst oppgi ditt fornavn for å fullføre profilen din.</p>
            <label for="complete-name" class="form-label">Fornavn</label>
            <input id="complete-name" name="given-name" type="text" placeholder="Fornavn" required class="form-control mb-18" autocomplete="given-name" />
            <button id="complete-profile-btn" type="submit" class="btn btn-primary mb-12">Fullfør profil</button>
          </form>
          <button id="skip-profile-btn" class="btn btn-secondary">Hopp over (kan gjøres senere)</button>
          <p id="complete-profile-msg" style="color: var(--error); min-height: 24px; text-align: center; font-size: 15px;"></p>
        </div>
      </div>
    </main>
  </div>`;
}

export async function afterMountLogin() {
  // Ensure body is visible for login page UX parity
  try { document.body.style.visibility = 'visible'; } catch (_) {}

  // Initialize legal modal and auth logic
  const [{ default: LegalHandler }] = await Promise.all([
    import('/js/legal-handler.js')
  ]);
  new LegalHandler();

  // Load existing auth logic which wires all listeners and redirects
  await import('/js/auth.js');
}
