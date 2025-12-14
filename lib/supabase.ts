import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Sanitize env vars - remove ALL whitespace and non-printable characters
function sanitizeEnvVar(value: string | undefined): string {
  if (!value) return ''
  // Remove all whitespace (including newlines, tabs, etc.) and non-printable chars
  return value.replace(/\s+/g, '').replace(/[^\x20-\x7E]/g, '')
}

// Lazy initialization to ensure env vars are available
let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase

  const supabaseUrl = sanitizeEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const supabaseAnonKey = sanitizeEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

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
      sanitizeEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL),
      sanitizeEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    )
