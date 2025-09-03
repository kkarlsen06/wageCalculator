import { supabase } from '/src/supabase-client.js';

export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: { prompt: 'select_account' },
        redirectTo: `${window.location.origin}/index.html`
      }
    });

    if (error) throw error;
    console.info('[oauth] google auth initiated', data);
    return data?.url || null;
  } catch (e) {
    console.error('[oauth] google sign-in failed', e);
    throw e;
  }
}