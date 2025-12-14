import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization to ensure env vars are available
let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase credentials missing:', {
      urlLength: supabaseUrl.length,
      keyLength: supabaseAnonKey.length
    })
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey)
  return _supabase
}

// For backwards compatibility
export const supabase = typeof window !== 'undefined'
  ? getSupabase()
  : createClient(
      (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
    )
