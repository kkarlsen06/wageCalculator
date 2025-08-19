import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)
try {
  const mask = (s) => {
    if (!s) return ''
    const str = String(s)
    if (str.length <= 8) return str[0] + '…' + str[str.length - 1]
    return str.slice(0, 4) + '…' + str.slice(-4)
  }
  const host = (() => { try { return new URL(import.meta.env.VITE_SUPABASE_URL).host } catch (_) { return import.meta.env.VITE_SUPABASE_URL } })()
  console.log(`[boot] supabase vite client url=${host} key=${mask(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)}`)
} catch (_) {}
