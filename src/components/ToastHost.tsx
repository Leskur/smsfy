import { createPortal } from 'react-dom'
import { useToastStore } from '../store/toast'

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return createPortal(
    <div className="toast-host" aria-live="polite" aria-relevant="additions">
      {toasts.map((item) => (
        <div key={item.id} className="toast" role="status">
          {item.message}
        </div>
      ))}
    </div>,
    document.body,
  )
}
