/** Shared public Supabase env (browser + server). Returns null if misconfigured. */
export type PublicSupabaseConfig = {
  url: string
  anonKey: string
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) return null
  return { url, anonKey }
}
