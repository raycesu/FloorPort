'use client'

import { useEffect, type ReactNode } from 'react'

type ModalShellProps = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  widthClassName?: string
  titleClassName?: string
}

export function ModalShell({
  open,
  title,
  description,
  onClose,
  children,
  widthClassName = 'max-w-lg',
  titleClassName,
}: ModalShellProps) {
  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,10,18,0.72)] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`w-full ${widthClassName} rounded-[28px] border border-fp-border bg-[linear-gradient(180deg,rgba(27,34,45,0.98)_0%,rgba(18,24,34,0.98)_100%)] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.55)] sm:p-7`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="modal-title"
              className={titleClassName ?? 'text-[1.45rem] font-semibold tracking-[0.01em] text-fp-text'}
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-2 max-w-xl text-sm leading-6 text-fp-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-fp-border bg-white/[0.03] text-fp-muted transition hover:bg-white/[0.07] hover:text-fp-text"
            aria-label="Close"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
