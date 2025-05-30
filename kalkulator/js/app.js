import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Initialize Supabase client
document.addEventListener('DOMContentLoaded', async () => {
  const supa = createClient(
    "https://iuwjdacxbirhmsglcbxp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1d2pkYWN4YmlyaG1zZ2xjYnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NTIxNDAsImV4cCI6MjA2NDAyODE0MH0.iSjbvGVpM3zOWCGpg5HrQp37PjJCmiHIwVQLgc2LgcE"
  );
  window.supa = supa;

  // Authentication guard
  const { data: { session } } = await supa.auth.getSession();
  if (!session) {
    window.location.href = './';
    return;
  }

  // Expose logout
  window.logout = async () => { await supa.auth.signOut(); window.location.href = './'; };

  // Import and start the app logic
  const { app } = await import('./appLogic.js?v=5');
  window.app = app;
  await app.init();
  // Display the app container
  document.getElementById('app').style.display = 'block';

  // Etter init og visning av app
  // Legg til event listeners for alle knapper
  document.querySelectorAll('[onclick]').forEach(el => {
    const onClick = el.getAttribute('onclick');
    if (onClick) {
      el.addEventListener('click', () => eval(onClick));
      el.removeAttribute('onclick');
    }
  });
});
