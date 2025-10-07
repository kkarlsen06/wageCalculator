import { supabase } from '/src/supabase-client.js';
import { getUserId } from '/src/lib/auth/getUserId.js';

/**
 * Validates if user can create a new shift based on subscription status and paywall rules
 * @param {string} shiftDate - Date of the shift to be created (YYYY-MM-DD format)
 * @returns {Promise<{canCreate: boolean, reason: string|null, requiresUpgrade: boolean}>}
 */
export async function validateShiftCreation(shiftDate) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { canCreate: false, reason: 'authentication_required', requiresUpgrade: false };
    }

    // Get current subscription status and before_paywall flag
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('before_paywall')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.warn('[paywall] Could not fetch profile:', profileError);
      // Default to false if we can't fetch profile
    }

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('status, price_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError && subError.code !== 'PGRST116') {
      console.warn('[paywall] Could not fetch subscription:', subError);
      console.warn('[paywall] Defaulting to free tier validation due to subscription query error');
    }

    const isActiveSubscription = subscription?.status === 'active';
    const beforePaywall = userProfile?.before_paywall === true;

    // Rule 1: Active subscription = full access
    if (isActiveSubscription) {
      return { canCreate: true, reason: null, requiresUpgrade: false };
    }

    // Rule 2: No active subscription but before_paywall = true = grandfathered access
    if (beforePaywall) {
      return { canCreate: true, reason: null, requiresUpgrade: false };
    }

    // Rule 3: Check if user has shifts outside current month (free tier limitation)
    return await checkFreeMonthLimit(userId, shiftDate);

  } catch (error) {
    console.error('[paywall] Validation error:', error);
    return { canCreate: false, reason: 'system_error', requiresUpgrade: false };
  }
}

/**
 * Checks if free tier user can create shift in given month
 * Free tier allows only one month of data at a time
 */
async function checkFreeMonthLimit(userId, shiftDate) {
  try {
    const targetMonth = shiftDate.substring(0, 7); // YYYY-MM format

    // Get all distinct months where user has shifts
    const { data: existingShifts, error } = await supabase
      .from('user_shifts')
      .select('shift_date')
      .eq('user_id', userId);

    if (error) {
      console.warn('[paywall] Could not fetch existing shifts:', error);
      return { canCreate: false, reason: 'system_error', requiresUpgrade: false };
    }

    if (!existingShifts || existingShifts.length === 0) {
      // No existing shifts = can create
      return { canCreate: true, reason: null, requiresUpgrade: false };
    }

    // Extract unique months from existing shifts
    const existingMonths = new Set(
      existingShifts.map(shift => shift.shift_date.substring(0, 7))
    );

    // If user only has shifts in target month, allow creation
    if (existingMonths.size === 1 && existingMonths.has(targetMonth)) {
      return { canCreate: true, reason: null, requiresUpgrade: false };
    }

    // If user has no shifts in target month, but has shifts in other months, block
    if (!existingMonths.has(targetMonth) && existingMonths.size > 0) {
      return {
        canCreate: false,
        reason: 'free_tier_month_limit',
        requiresUpgrade: true,
        otherMonths: Array.from(existingMonths).filter(month => month !== targetMonth)
      };
    }

    // If user has shifts in target month AND other months, block
    if (existingMonths.has(targetMonth) && existingMonths.size > 1) {
      return {
        canCreate: false,
        reason: 'free_tier_month_limit',
        requiresUpgrade: true,
        otherMonths: Array.from(existingMonths).filter(month => month !== targetMonth)
      };
    }

    // Default allow (shouldn't reach here)
    return { canCreate: true, reason: null, requiresUpgrade: false };

  } catch (error) {
    console.error('[paywall] Free month limit check error:', error);
    return { canCreate: false, reason: 'system_error', requiresUpgrade: false };
  }
}

/**
 * Deletes all shifts outside the specified month
 * @param {string} keepMonth - Month to keep in YYYY-MM format
 * @returns {Promise<{success: boolean, deletedCount: number, error?: string}>}
 */
export async function deleteShiftsOutsideMonth(keepMonth) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, deletedCount: 0, error: 'authentication_required' };
    }

    // Use API endpoint for consistent deletion
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, deletedCount: 0, error: 'authentication_required' };
    }

    const response = await fetch(`${window.CONFIG.apiBase}/shifts/outside-month/${keepMonth}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[paywall] Delete shifts API error:', errorData);
      return { success: false, deletedCount: 0, error: 'delete_failed' };
    }

    const result = await response.json();
    return {
      success: result.success,
      deletedCount: result.deletedCount || 0,
      error: null
    };

  } catch (error) {
    console.error('[paywall] Delete shifts exception:', error);
    return { success: false, deletedCount: 0, error: 'system_error' };
  }
}

/**
 * Gets a user-friendly message for validation result
 */
export function getValidationMessage(validationResult) {
  switch (validationResult.reason) {
    case 'authentication_required':
      return 'Du må være logget inn for å legge til vakter.';
    case 'free_tier_month_limit':
      return 'Du har funnet en premium-funksjon. Gratis-planen tillater kun vakter i én måned om gangen.';
    case 'system_error':
      return 'Systemfeil. Prøv igjen senere.';
    default:
      return 'Kunne ikke validere vakt-oppretting.';
  }
}