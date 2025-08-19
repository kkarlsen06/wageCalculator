// Smoke test for user ID retrieval
// Run this after authentication to verify user ID retrieval works correctly

import { supabase } from '../src/supabase-client.js';

async function getUserId() {
  let cachedId = null;

  // Try fast local verify first (claims)
  const { data: claims } = await supabase.auth.getClaims();
  const idFromClaims = claims?.sub;
  if (idFromClaims) {
    cachedId = idFromClaims;
    return cachedId;
  }

  // Fallback to full user fetch
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = user?.id;
  if (!id) throw new Error("No authenticated user id found");
  cachedId = id;
  return cachedId;
}

(async () => {
  try {
    console.log('🔍 Testing user ID retrieval...');
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ No session found. Please sign in first.');
      process.exit(1);
    }
    
    console.log('✅ Session found');
    
    const id = await getUserId();
    console.log('✅ USER_ID:', id);
    
    // Test that the ID is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.error('❌ User ID is not a valid UUID:', id);
      process.exit(1);
    }
    
    console.log('✅ User ID is a valid UUID');
    
    // Test that we can use this ID in a query
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Query failed:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Database query with user ID succeeded');
    console.log('🎉 All user ID tests passed!');
    
  } catch (error) {
    console.error('❌ Smoke test failed:', error.message);
    process.exit(1);
  }
})();
