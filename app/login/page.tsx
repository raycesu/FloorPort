import { AuthForm } from '@/components/AuthForm'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { Syne } from 'next/font/google'
import { redirect } from 'next/navigation'

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div
      className={`${syne.className} min-h-screen bg-[#0d0d0f] text-[#e4e4e7] antialiased`}
    >
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 md:grid-cols-2">
        <section className="relative flex flex-col items-center justify-center overflow-hidden border-b border-[rgba(255,255,255,0.06)] px-6 py-12 md:border-b-0 md:border-r md:py-14 md:pl-12 md:pr-10">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_32%,rgba(124,111,212,0.07)_0%,transparent_65%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.45]"
            style={{
              backgroundImage:
                'radial-gradient(circle at center, rgba(255,255,255,0.028) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-1/2 top-[min(38%,220px)] h-[min(100vw,420px)] w-[min(100vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7c6fd4]/[0.08] blur-[80px]"
            aria-hidden
          />

          <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center text-center">
            <div className="flex flex-col items-center">
              <Image
                src="/floorport-logo-v2.png"
                alt="FloorPort logo"
                width={707}
                height={353}
                className="h-auto w-full max-w-[200px] md:max-w-[220px]"
                priority
              />
              <h1 className="mt-5 max-w-[20ch] text-balance text-[40px] font-bold leading-[1.1] tracking-tight text-white md:mt-6 md:text-[52px]">
                Your portfolio, unified.
              </h1>
              <p className="mt-4 max-w-[320px] text-[15px] font-medium leading-relaxed text-[#71717a]">
                Track your crypto &amp; stock portfolio in one place
              </p>
            </div>

            <ul className="mt-12 hidden w-full max-w-sm flex-col items-center gap-6 md:flex">
              <li className="inline-flex items-center justify-center gap-3 text-center text-[14px] font-medium leading-snug text-[#a1a1aa]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className="shrink-0 text-[#7c6fd4]/90"
                >
                  <path
                    d="M4 20H20"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <rect
                    x="6"
                    y="11"
                    width="3"
                    height="6"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <rect
                    x="11"
                    y="8"
                    width="3"
                    height="9"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <rect
                    x="16"
                    y="5"
                    width="3"
                    height="12"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
                Live portfolio value across assets
              </li>
              <li className="inline-flex items-center justify-center gap-3 text-center text-[14px] font-medium leading-snug text-[#a1a1aa]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className="shrink-0 text-[#7c6fd4]/90"
                >
                  <path
                    d="M8 7H19"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8 12H19"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8 17H19"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <circle cx="5" cy="7" r="1.2" fill="currentColor" />
                  <circle cx="5" cy="12" r="1.2" fill="currentColor" />
                  <circle cx="5" cy="17" r="1.2" fill="currentColor" />
                </svg>
                Track transactions with clean history
              </li>
              <li className="inline-flex items-center justify-center gap-3 text-center text-[14px] font-medium leading-snug text-[#a1a1aa]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className="shrink-0 text-[#7c6fd4]/90"
                >
                  <path
                    d="M6 4.5C6 3.67 6.67 3 7.5 3H16.5C17.33 3 18 3.67 18 4.5V21L12 16.8L6 21V4.5Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 7.2L13.2 9.64L15.9 10.03L13.95 11.93L14.41 14.62L12 13.35L9.59 14.62L10.05 11.93L8.1 10.03L10.8 9.64L12 7.2Z"
                    fill="currentColor"
                  />
                </svg>
                Watchlist insights for stocks and crypto
              </li>
            </ul>
          </div>
        </section>

        <section className="flex items-center justify-center bg-[#161618] px-6 py-12 md:px-12 md:py-14">
          <div className="flex w-full max-w-md items-center justify-center">
            <AuthForm />
          </div>
        </section>
      </div>
    </div>
  )
}
