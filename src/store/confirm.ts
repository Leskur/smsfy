import { create } from 'zustand'

export interface ConfirmRequest {
  id: number
  title: string
  message?: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
  resolve: (ok: boolean) => void
}

interface ConfirmState {
  current: ConfirmRequest | null
  ask: (input: {
    title: string
    message?: string
    confirmLabel: string
    cancelLabel: string
    danger?: boolean
  }) => Promise<boolean>
  close: (ok: boolean) => void
}

let seq = 0

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  current: null,
  ask: ({ title, message, confirmLabel, cancelLabel, danger }) =>
    new Promise<boolean>((resolve) => {
      const prev = get().current
      if (prev) prev.resolve(false)
      set({
        current: {
          id: ++seq,
          title,
          message,
          confirmLabel,
          cancelLabel,
          danger,
          resolve,
        },
      })
    }),
  close: (ok) => {
    const current = get().current
    if (!current) return
    current.resolve(ok)
    set({ current: null })
  },
}))

export function confirmDialog(input: {
  title: string
  message?: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
}): Promise<boolean> {
  return useConfirmStore.getState().ask(input)
}
