import { useCallback, useRef, useState } from 'react'

const MIN_GAP = 0.1

/**
 * Drives the two draggable dividers that split the capture window into
 * three stacked panes (packet list / details tree / hex dump), the same
 * arrangement Wireshark uses by default. Boundaries are fractions (0..1) of
 * the container's height: boundary[0] separates pane 1 from pane 2,
 * boundary[1] separates pane 2 from pane 3.
 */
export function useResizableLayout(containerRef, initialBoundaries = [0.45, 0.72]) {
  const [boundaries, setBoundaries] = useState(initialBoundaries)
  const draggingIndex = useRef(null)

  const onDividerPointerDown = useCallback(
    (index) => (downEvent) => {
      downEvent.preventDefault()
      draggingIndex.current = index

      const onMove = (moveEvent) => {
        const container = containerRef.current
        if (!container || draggingIndex.current === null) return
        const rect = container.getBoundingClientRect()
        const fraction = Math.min(Math.max((moveEvent.clientY - rect.top) / rect.height, 0.05), 0.95)

        setBoundaries(([b0, b1]) => {
          if (draggingIndex.current === 0) {
            const clamped = Math.min(fraction, b1 - MIN_GAP)
            return [Math.max(clamped, MIN_GAP), b1]
          }
          const clamped = Math.max(fraction, b0 + MIN_GAP)
          return [b0, Math.min(clamped, 1 - MIN_GAP)]
        })
      }

      const onUp = () => {
        draggingIndex.current = null
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [containerRef],
  )

  return { boundaries, onDividerPointerDown }
}
