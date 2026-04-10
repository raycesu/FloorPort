'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()

    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
        })
        if (err) {
          setError(err.message)
          return
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (err) {
          setError(err.message)
          return
        }
      }
      router.replace('/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-white/10 bg-fp-surface p-8 shadow-xl backdrop-blur">
      <h1 className="text-center text-2xl font-semibold tracking-tight text-white">FloorPort</h1>
      <p className="mt-1 text-center text-sm text-zinc-400">Portfolio tracker for crypto &amp; stocks</p>

      <div className="mt-8 flex rounded-lg bg-black/30 p-1">
        <button
          type="button"
          onClick={() => {
            setMode('signin')
            setError(null)
          }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
            mode === 'signin' ? 'bg-fp-accent/20 text-fp-accent' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup')
            setError(null)
          }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
            mode === 'signup' ? 'bg-fp-accent/20 text-fp-accent' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white outline-none ring-fp-accent focus:ring-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white outline-none ring-fp-accent focus:ring-2"
          />
        </div>

        {error ? (
          <p className="rounded-lg bg-fp-negative/10 px-3 py-2 text-sm text-fp-negative" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-lg bg-fp-accent py-2.5 text-sm font-semibold text-[#0d0d14] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
