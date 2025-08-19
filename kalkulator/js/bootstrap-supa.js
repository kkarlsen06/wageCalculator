import { supabase } from '../../src/supabase-client.js';

// expose early, before other modules import/use it
window.supa = supabase;
