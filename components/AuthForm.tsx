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

  return (
    <div className="mx-auto w-full max-w-md bg-fp-surface">
      <div className="flex border-b border-fp-border">
        <button
          type="button"
          onClick={() => {
            setMode('signin')
            setError(null)
            setNotice(null)
          }}
          className={`border-b-2 px-1 py-3 text-sm font-medium transition ${
            mode === 'signin'
              ? 'border-fp-accent text-fp-accent'
              : 'border-transparent text-fp-muted hover:text-fp-text'
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
          className={`ml-6 border-b-2 px-1 py-3 text-sm font-medium transition ${
            mode === 'signup'
              ? 'border-fp-accent text-fp-accent'
              : 'border-transparent text-fp-muted hover:text-fp-text'
          }`}
        >
          Sign up
        </button>
      </div>

      <div className="mt-6">
        <h1 className="text-[24px] font-semibold text-fp-text">
          {isRecovery ? 'Set new password' : mode === 'signup' ? 'Create account' : 'Welcome back'}
        </h1>
        <p className="mt-1 text-sm text-fp-muted">
          {isRecovery
            ? 'Choose a strong password to secure your account.'
            : mode === 'signup'
            ? 'Start tracking your crypto and stock portfolio.'
            : 'Sign in to continue to your FloorPort dashboard.'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {!isRecovery ? (
          <div>
            <label htmlFor="email" className="block text-[13px] font-medium text-fp-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-11 w-full"
            />
          </div>
        ) : null}
        <div>
          <label htmlFor="password" className="block text-[13px] font-medium text-fp-muted">
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
            className="mt-1 h-11 w-full"
          />
          {mode === 'signin' ? (
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => void onForgotPassword()}
                disabled={resetLoading}
                className="text-[13px] text-fp-muted hover:text-fp-text disabled:opacity-60"
              >
                {resetLoading ? 'Sending...' : 'Forgot password?'}
              </button>
            </div>
          ) : null}
        </div>
        {isRecovery ? (
          <div>
            <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-fp-muted">
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
              className="mt-1 h-11 w-full"
            />
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg bg-fp-negative/10 px-3 py-2 text-sm text-fp-negative" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="rounded-lg bg-fp-buy-bg px-3 py-2 text-sm text-fp-buy-text" role="status">
            {notice}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-fp-accent px-5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
