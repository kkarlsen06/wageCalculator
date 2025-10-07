import { supabase } from '/src/supabase-client.js';

export async function getAuthSnapshot() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  const identities = Array.isArray(user?.identities) ? user.identities : [];

  // Derive providers from both identities and app_metadata for robustness
  const idProviders = identities.map(i => i.provider).filter(Boolean);
  const metaProviders = Array.isArray(user?.app_metadata?.providers)
    ? user.app_metadata.providers
    : (user?.app_metadata?.provider ? [user.app_metadata.provider] : []);
  const providerSet = new Set([...idProviders, ...metaProviders]);

  const hasGoogle = providerSet.has('google');
  const hasEmail = providerSet.has('email');
  const otherProviders = [...providerSet].filter(p => p !== 'google');

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
