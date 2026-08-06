import { getPublicSupabaseConfig } from '@/lib/env'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const config = getPublicSupabaseConfig()
  if (!config) {
    throw new Error('Missing Supabase configuration: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createBrowserClient(config.url, config.anonKey)
}
