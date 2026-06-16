import { createClient } from '@supabase/supabase-js'

// Supabase URL and anon key are public (used by browsers), safe to embed
const supabaseUrl = 'https://yyymdlrnotdbxmdnihwe.supabase.co'
const supabaseAnonKey = 'eyJhbG...Qi8U'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
})
