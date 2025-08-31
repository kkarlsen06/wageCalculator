import { refreshSubscriptionState } from './subscriptionState.js';
import { getUserId } from '/src/lib/auth/getUserId.js';

/**
 * Checks if the current user has an active enterprise subscription (tier = "max")
 * This replaces the old isWageCaregiver flag functionality
 * @returns {Promise<boolean>}
 */
export async function hasEnterpriseSubscription() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return false;
    }

    // Use cached state if available, otherwise refresh
    let subscriptionState = window.SubscriptionState;
    if (!subscriptionState) {
      subscriptionState = await refreshSubscriptionState(userId);
    }
    
    if (!subscriptionState) {
      return false;
    }

    // Check if user has active "max" tier subscription
    return subscriptionState.is_active === true && subscriptionState.tier === 'max';
  } catch (error) {
    console.error('[subscription] Error checking enterprise subscription:', error);
    return false;
  }
}

/**
 * Gets the current subscription state, refreshing if needed
 * @returns {Promise<object|null>}
 */
export async function getCurrentSubscriptionState() {
  try {
    // Use existing global state if available and fresh
    if (window.SubscriptionState) {
      return window.SubscriptionState;
    }

    const userId = await getUserId();
    if (!userId) {
      return null;
    }

    return await refreshSubscriptionState(userId);
  } catch (error) {
    console.error('[subscription] Error getting subscription state:', error);
    return null;
  }
}