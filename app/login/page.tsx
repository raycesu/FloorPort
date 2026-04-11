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
        <section className="flex items-center justify-center border-r border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] px-6 py-10 md:px-12 md:py-14">
          <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center">
            <div className="flex flex-col items-center">
              <Image
                src="/floorport-logo-v2.png"
                alt="FloorPort logo"
                width={707}
                height={353}
                className="h-auto w-full max-w-[220px]"
                priority
              />
              <p className="mt-3 max-w-[280px] text-center text-[15px] leading-[1.6] text-[rgba(255,255,255,0.55)]">
                Track your crypto &amp; stock portfolio in one place
              </p>
            </div>

            <ul className="mt-10 flex flex-col items-center gap-4">
              <li className="inline-flex items-center justify-center gap-[10px] text-[14px] font-normal text-[rgba(255,255,255,0.65)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#9d8fea]">
                  <path d="M4 20H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <rect x="6" y="11" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.8" />
                  <rect x="11" y="8" width="3" height="9" rx="1" stroke="currentColor" strokeWidth="1.8" />
                  <rect x="16" y="5" width="3" height="12" rx="1" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                Live portfolio value across assets
              </li>
              <li className="inline-flex items-center justify-center gap-[10px] text-[14px] font-normal text-[rgba(255,255,255,0.65)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#9d8fea]">
                  <path d="M8 7H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M8 12H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M8 17H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <circle cx="5" cy="7" r="1.2" fill="currentColor" />
                  <circle cx="5" cy="12" r="1.2" fill="currentColor" />
                  <circle cx="5" cy="17" r="1.2" fill="currentColor" />
                </svg>
                Track transactions with clean history
              </li>
              <li className="inline-flex items-center justify-center gap-[10px] text-[14px] font-normal text-[rgba(255,255,255,0.65)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#9d8fea]">
                  <path d="M6 4.5C6 3.67 6.67 3 7.5 3H16.5C17.33 3 18 3.67 18 4.5V21L12 16.8L6 21V4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M12 7.2L13.2 9.64L15.9 10.03L13.95 11.93L14.41 14.62L12 13.35L9.59 14.62L10.05 11.93L8.1 10.03L10.8 9.64L12 7.2Z" fill="currentColor" />
                </svg>
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
