/** Position a fixed popover near a rect / point, staying in viewport. */

export function placeActionMenu(rect: DOMRect, width: number, height: number) {
  const gap = 8
  const margin = 10
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = rect.left + rect.width / 2 - width / 2
  left = Math.min(Math.max(margin, left), vw - width - margin)
  let top = rect.bottom + gap
  if (top + height > vh - margin) {
    top = rect.top - height - gap
  }
  top = Math.min(Math.max(margin, top), vh - height - margin)
  return { left, top }
}

export function pointRect(x: number, y: number): DOMRect {
  return new DOMRect(x, y, 0, 0)
}
