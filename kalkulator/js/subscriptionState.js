import { supabase } from '/src/supabase-client.js';

/**
 * Refetch subscription_tiers for the current user and update global UI state.
 * - Stores result on window.SubscriptionState
 * - Dispatches `subscription:updated` with { detail: data }
 */
export async function refreshSubscriptionState(userId) {
  if (!userId) { console.warn('[sub] refresh: missing userId'); return null; }
  try {
    console.log('[sub] refresh start', { userId });
    const { data, error } = await supabase
      .from('subscription_tiers')
      .select('status, price_id, tier, is_active, current_period_end, updated_at')
      .eq('user_id', userId)
      .single();
    if (error) {
      console.warn('[sub] refresh error', error);
      return null;
    }
    window.SubscriptionState = data || null;
    console.log('[sub] refresh data', data);
    document.dispatchEvent(new CustomEvent('subscription:updated', { detail: data }));
    return data;
  } catch (e) {
    console.warn('[sub] refresh exception', e);
    return null;
  }
}

