import { getPublicSupabaseConfig } from '@/lib/env'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Service-role client for server-only tasks (e.g. shared cache). Returns null if not configured. */
export const createServiceRoleClient = (): SupabaseClient | null => {
  const publicConfig = getPublicSupabaseConfig()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!publicConfig || !serviceKey) return null
  return createClient(publicConfig.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
