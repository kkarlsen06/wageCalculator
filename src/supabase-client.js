import { createClient } from '@supabase/supabase-js'

// Get environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iuwjdacxbirhmsglcbxp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_z9EoG7GZZMS3RL4hmilh5A_xI0va5Nb';

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

try {
  const mask = (s) => {
    if (!s) return ''
    const str = String(s)
    if (str.length <= 8) return str[0] + '…' + str[str.length - 1]
    return str.slice(0, 4) + '…' + str.slice(-4)
  }
  const host = (() => {
    try {
      return new URL(supabaseUrl).host
    } catch (_) {
      return supabaseUrl
    }
  })()
  console.log(
    `[boot] supabase vite client url=${host} key=${mask(supabaseAnonKey)}`
  )
} catch (_) {}