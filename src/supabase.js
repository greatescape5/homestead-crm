import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lqsakuijmjfiwsdidxcj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxc2FrdWlqbWpmaXdzZGlkeGNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTE1NTUsImV4cCI6MjA5Nzg4NzU1NX0.u1jybVoli4DdNV-RFQb-6HN2YX2vjuaihewNSLkfir8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
