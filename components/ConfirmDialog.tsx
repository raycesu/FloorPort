'use client'

import { ModalShell } from '@/components/ModalShell'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  loading?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  loading = false,
  error,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const confirmClassName =
    tone === 'danger'
      ? 'bg-[rgba(248,113,113,0.14)] text-[#ffd5d5] ring-1 ring-[rgba(248,113,113,0.18)] hover:bg-[rgba(248,113,113,0.22)]'
      : 'bg-fp-accent text-white hover:bg-fp-accent-hover'

  return (
    <ModalShell open={open} onClose={loading ? () => undefined : onCancel} title={title} description={description}>
      <div className="space-y-4">
        {error ? (
          <div className="rounded-2xl border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#ffcbcb]">
            {error}
          </div>
        ) : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-2xl border border-fp-border bg-transparent px-5 py-3 text-sm font-medium text-fp-text-secondary transition hover:bg-white/[0.04] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={loading}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:opacity-50 ${confirmClassName}`}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
