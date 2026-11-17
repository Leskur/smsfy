import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useConfirmStore } from '../store/confirm'

export function ConfirmHost() {
  const current = useConfirmStore((s) => s.current)
  const close = useConfirmStore((s) => s.close)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!current) return
    confirmRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, close])

  if (!current) return null

  return createPortal(
    <div className="confirm-root" role="presentation">
      <button
        type="button"
        className="confirm-backdrop"
        aria-label="关闭"
        onClick={() => close(false)}
      />
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`confirm-title-${current.id}`}
        aria-describedby={
          current.message ? `confirm-body-${current.id}` : undefined
        }
      >
        <h2 id={`confirm-title-${current.id}`} className="confirm-title">
          {current.title}
        </h2>
        {current.message ? (
          <p id={`confirm-body-${current.id}`} className="confirm-body">
            {current.message}
          </p>
        ) : null}
        <div className="confirm-actions">
          <button
            type="button"
            className="confirm-btn is-cancel"
            onClick={() => close(false)}
          >
            {current.cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`confirm-btn is-confirm${current.danger ? ' is-danger' : ''}`}
            onClick={() => close(true)}
          >
            {current.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
