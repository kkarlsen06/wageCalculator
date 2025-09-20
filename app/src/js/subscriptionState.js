import { supabase } from '/src/supabase-client.js';

/**
 * Refetch subscription_tiers for the current user and update global UI state.
 * - Stores result on window.SubscriptionState
 * - Dispatches `subscription:updated` with { detail: data }
 */
export async function refreshSubscriptionState(userId) {
  if (!userId) {
    console.warn('[sub] refresh: missing userId');
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('subscription_tiers')
      .select('status, price_id, tier, is_active, current_period_end, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[sub] refresh error', error);
      return null;
    }

    const state = data ?? {
      status: 'none',
      price_id: null,
      tier: 'free',
      is_active: false,
      current_period_end: null,
      updated_at: null,
    };

    window.SubscriptionState = state;
    document.dispatchEvent(new CustomEvent('subscription:updated', { detail: state }));
    return state;
  } catch (e) {
    console.warn('[sub] refresh exception', e);
    return null;
  }
}