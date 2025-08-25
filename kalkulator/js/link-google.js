import { supabase } from '../../src/supabase-client.js';

export async function linkGoogleIdentity() {
  try {
    // For client-side identity linking, we use signInWithOAuth with skipBrowserRedirect
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: { 
          prompt: 'select_account',
          access_type: 'offline'
        },
        redirectTo: `${window.location.origin}/kalkulator/`,
        skipBrowserRedirect: false
      }
    });
    
    if (error) throw error;
    console.info('[oauth] google link initiated', data);
    
    // The redirect will happen automatically, so we return the URL
    return data?.url || null;
  } catch (e) {
    console.error('[oauth] link failed', e);
    throw e;
  }
}