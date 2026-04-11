'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

export function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'signin' | 'signup' | 'recovery'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const isRecovery = mode === 'recovery'
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (searchParams.get('mode') === 'recovery') {
      setMode('recovery')
      setNotice('Set a new password for your account.')
    }
  }, [searchParams])

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (hash.includes('type=recovery')) {
      setMode('recovery')
      setNotice('Set a new password for your account.')
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('recovery')
        setNotice('Set a new password for your account.')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)

    try {
      if (isRecovery) {
        if (password.length < 6) {
          setError('Password must be at least 6 characters')
          return
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          return
        }
        const { error: err } = await supabase.auth.updateUser({ password })
        if (err) {
          setError(err.message)
          return
        }
        setNotice('Password updated. Redirecting to your dashboard...')
        router.replace('/dashboard')
        router.refresh()
        return
      }

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

  async function onForgotPassword() {
    setError(null)
    setNotice(null)
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Enter your email first, then try again.')
      return
    }

    setResetLoading(true)
    try {
      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/login?mode=recovery` : undefined
      const { error: err } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo })
      if (err) {
        setError(err.message)
        return
      }
      setNotice('Password reset link sent. Check your email.')
    } finally {
      setResetLoading(false)
    }
  }

  const inputClass =
    'mt-1 h-11 w-full rounded-[10px] border border-[#2e2e32] bg-[#0d0d0f] px-3.5 text-[15px] text-[#e4e4e7] shadow-none outline-none transition-colors duration-200 placeholder:text-[#52525b] focus:border-[#7c6fd4] focus:!shadow-[0_0_0_3px_rgba(124,111,212,0.15)] disabled:opacity-50'

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#18181b] p-10 shadow-[0_0_40px_rgba(0,0,0,0.4)] md:p-12">
      <div className="border-b border-[rgba(255,255,255,0.06)]">
        <div className="-mb-px flex gap-8">
          <button
            type="button"
            onClick={() => {
              setMode('signin')
              setError(null)
              setNotice(null)
            }}
            className={`border-b-2 pb-3 text-[15px] font-semibold tracking-tight transition-colors duration-200 ${
              mode === 'signin'
                ? 'border-[#7c6fd4] text-[#e4e4e7]'
                : 'border-transparent text-[#52525b] hover:text-[#a1a1aa]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup')
              setError(null)
              setNotice(null)
            }}
            className={`border-b-2 pb-3 text-[15px] font-semibold tracking-tight transition-colors duration-200 ${
              mode === 'signup'
                ? 'border-[#7c6fd4] text-[#e4e4e7]'
                : 'border-transparent text-[#52525b] hover:text-[#a1a1aa]'
            }`}
          >
            Sign up
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h1 className="text-[24px] font-semibold tracking-tight text-[#e4e4e7]">
          {isRecovery ? 'Set new password' : mode === 'signup' ? 'Create account' : 'Welcome back'}
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[#71717a]">
          {isRecovery
            ? 'Choose a strong password to secure your account.'
            : mode === 'signup'
              ? 'Start tracking your crypto and stock portfolio.'
              : 'Sign in to continue to your FloorPort dashboard.'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        {!isRecovery ? (
          <div>
            <label htmlFor="email" className="block text-[13px] font-medium text-[#a1a1aa]">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
        ) : null}
        <div>
          <label htmlFor="password" className="block text-[13px] font-medium text-[#a1a1aa]">
            {isRecovery ? 'New password' : 'Password'}
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          {mode === 'signin' ? (
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => void onForgotPassword()}
                disabled={resetLoading}
                className="text-[13px] font-medium text-[#52525b] no-underline transition-colors duration-200 hover:text-[#a1a1aa] disabled:opacity-60"
              >
                {resetLoading ? 'Sending...' : 'Forgot password?'}
              </button>
            </div>
          ) : null}
        </div>
        {isRecovery ? (
          <div>
            <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-[#a1a1aa]">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>
        ) : null}

        {error ? (
          <p
            className="rounded-[10px] border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[13px] leading-snug text-red-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {notice ? (
          <p
            className="rounded-[10px] border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-[13px] leading-snug text-emerald-200/95"
            role="status"
          >
            {notice}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center rounded-[10px] bg-[#7c6fd4] px-5 text-[15px] font-semibold text-white transition duration-200 ease-out hover:bg-[#8b7ed8] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
        >
          {loading
            ? 'Please wait...'
            : isRecovery
              ? 'Update password'
              : mode === 'signup'
                ? 'Create account'
                : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
