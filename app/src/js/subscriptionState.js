import { supabase } from '/src/supabase-client.js';

/**
 * Refetch subscriptions for the current user and update global UI state.
 * - Stores result on window.SubscriptionState
 * - Dispatches `subscription:updated` with { detail: data }
 */
// Helper function to map price_id to tier
function priceIdToTier(priceId) {
  switch (priceId) {
    case 'price_1RzQ85Qiotkj8G58AO6st4fh':
      return 'pro';
    case 'price_1RzQC1Qiotkj8G58tYo4U5oO':
      return 'max';
    default:
      return 'free';
  }
}

export async function refreshSubscriptionState(userId) {
  if (!userId) {
    console.warn('[sub] refresh: missing userId');
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, price_id, current_period_end, updated_at, stripe_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[sub] refresh error', error);
      return null;
    }

    const state = data ? {
      status: data.status || 'none',
      price_id: data.price_id,
      tier: priceIdToTier(data.price_id),
      is_active: data.status === 'active',
      current_period_end: data.current_period_end,
      updated_at: data.updated_at,
    } : {
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