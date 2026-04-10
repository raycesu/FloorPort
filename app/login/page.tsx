import { AuthForm } from '@/components/AuthForm'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-fp-bg">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 md:grid-cols-2">
        <section className="flex bg-fp-page px-6 py-10 md:px-12 md:py-14">
          <div className="mx-auto flex w-full max-w-md flex-col justify-center gap-8">
            <div className="space-y-4">
              <Image
                src="/floorport-logo-v2.png"
                alt="FloorPort"
                width={756}
                height={198}
                className="h-[7.2rem] w-auto md:h-36"
                priority
              />
              <p className="max-w-sm text-sm text-fp-muted">
                Track your crypto &amp; stock portfolio in one place
              </p>
            </div>

            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-fp-text">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-fp-crypto-bg text-fp-crypto-text">
                  P
                </span>
                Live portfolio value across assets
              </li>
              <li className="flex items-center gap-3 text-sm text-fp-text">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-fp-stock-bg text-fp-stock-text">
                  T
                </span>
                Track transactions with clean history
              </li>
              <li className="flex items-center gap-3 text-sm text-fp-text">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-fp-crypto-bg text-fp-accent">
                  W
                </span>
                Watchlist insights for stocks and crypto
              </li>
            </ul>
          </div>
        </section>

        <section className="flex bg-fp-surface px-6 py-10 md:px-12 md:py-14">
          <div className="mx-auto flex w-full max-w-md items-center">
            <AuthForm />
          </div>
        </section>
      </div>
    </div>
  )
}
