import { CurrencyProvider } from '@/components/CurrencyContext'
import { Navbar } from '@/components/Navbar'
import { getUsdToCad } from '@/lib/fx'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_currency')
    .eq('id', user.id)
    .single()

  const currency = profile?.preferred_currency === 'CAD' ? 'CAD' : 'USD'
  const usdToCad = await getUsdToCad()

  return (
    <div className="min-h-screen">
      <CurrencyProvider currency={currency} usdToCad={usdToCad}>
        <Navbar email={user.email} />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </CurrencyProvider>
    </div>
  )
}
