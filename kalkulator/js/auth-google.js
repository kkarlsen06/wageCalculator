import { supabase } from '../../src/supabase-client.js';

export async function signInWithGoogle() {
  const redirectTo = `${window.location.origin}/kalkulator/`; // forces local -> local, prod -> prod
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: { 
          prompt: 'select_account',
          redirectTo
        }
        // If app already uses a post-login page, set it here:
        // redirectTo: `${window.location.origin}/kalkulator/`
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