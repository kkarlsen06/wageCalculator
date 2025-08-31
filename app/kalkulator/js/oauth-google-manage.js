import { supabase } from '../../src/supabase-client.js';

export async function getAuthSnapshot() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  const identities = user?.identities || [];
  const hasGoogle = identities.some(i => i.provider === 'google');
  const hasEmail = identities.some(i => i.provider === 'email');
  const otherProviders = identities.filter(i => i.provider !== 'google');
  return { user, identities, hasGoogle, hasEmail, otherProviders };
}

export async function unlinkGoogleIdentity() {
  const { user, identities, hasGoogle, hasEmail, otherProviders } = await getAuthSnapshot();
  if (!hasGoogle) return { ok: false, reason: 'not_linked' };

  // Prevent lockout: need at least one alternative sign-in (email or another OAuth)
  const hasAlternative = hasEmail || (otherProviders && otherProviders.length > 0);
  if (!hasAlternative) return { ok: false, reason: 'no_alternative' };

  const googleIdentity = identities.find(i => i.provider === 'google');
  const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
  if (error) throw error;
  return { ok: true };
}

