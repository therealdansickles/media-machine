import { createClient } from '@supabase/supabase-js'

// Hardcoded temporarily to debug env var issues
const supabaseUrl = 'https://mrmoxwfjgcaimbqrqqoz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ybW94d2ZqZ2NhaW1icXJxcW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3Mjk0NDIsImV4cCI6MjA4MDMwNTQ0Mn0.6YJzGO-vCLE23ldjKB5mhx052CX0dppz_qMt8qYbiOk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)





