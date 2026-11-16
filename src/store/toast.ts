import { create } from 'zustand'

export interface ToastItem {
  id: number
  message: string
}

interface ToastState {
  toasts: ToastItem[]
  show: (message: string, durationMs?: number) => void
  dismiss: (id: number) => void
}

let seq = 0
const timers = new Map<number, number>()
const MAX_TOASTS = 3

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, durationMs = 2200) => {
    const id = ++seq
    set((state) => {
      const next = [...state.toasts, { id, message }]
      const overflow = next.length - MAX_TOASTS
      if (overflow <= 0) return { toasts: next }
      const dropped = next.slice(0, overflow)
      for (const item of dropped) {
        const timer = timers.get(item.id)
        if (timer != null) {
          window.clearTimeout(timer)
          timers.delete(item.id)
        }
      }
      return { toasts: next.slice(overflow) }
    })
    const timer = window.setTimeout(() => {
      timers.delete(id)
      get().dismiss(id)
    }, durationMs)
    timers.set(id, timer)
  },
  dismiss: (id) => {
    const timer = timers.get(id)
    if (timer != null) {
      window.clearTimeout(timer)
      timers.delete(id)
    }
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }))
  },
}))

export function toast(message: string, durationMs?: number) {
  useToastStore.getState().show(message, durationMs)
}
