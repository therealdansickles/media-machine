import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Debug: log what we have (will show in browser console)
if (typeof window !== 'undefined') {
  console.log('Supabase URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING')
  console.log('Supabase Key:', supabaseAnonKey ? 'Present (' + supabaseAnonKey.length + ' chars)' : 'MISSING')
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables - URL:', !!supabaseUrl, 'Key:', !!supabaseAnonKey)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)





