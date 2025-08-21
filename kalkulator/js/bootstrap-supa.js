import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

// Create Supabase client with hardcoded production values
const supabaseUrl = 'https://iuwjdacxbirhmsglcbxp.supabase.co';
const supabaseAnonKey = 'sb_publishable_z9EoG7GZZMS3RL4hmilh5A_xI0va5Nb';

console.log('[bootstrap] Creating Supabase client with URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// expose early, before other modules import/use it
window.supa = supabase;
