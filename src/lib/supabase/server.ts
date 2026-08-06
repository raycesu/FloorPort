import { getPublicSupabaseConfig } from '@/lib/env'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const config = getPublicSupabaseConfig()
  if (!config) {
    throw new Error('Missing Supabase configuration: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const cookieStore = await cookies()

  return createServerClient(
    config.url,
    config.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            /* ignore in server components */
          }
        },
      },
    }
  )
}
