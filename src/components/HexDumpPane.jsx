import { useMemo } from 'react'
import { useAppState } from '../state/AppContext.jsx'
import { chunkForHexDump, toHexByte, byteToPrintableAscii } from '../lib/bytes.js'

const ROW_SIZE = 16

export default function HexDumpPane() {
  const { selectedPacket, state } = useAppState()
  const activeRange = state.hoveredRange ?? state.selectedRange

  const rows = useMemo(() => (selectedPacket ? chunkForHexDump(selectedPacket.bytes, ROW_SIZE) : []), [selectedPacket])

  if (!selectedPacket) {
    return <div className="hexdump hexdump--empty">No packet selected — click a row in the packet list above.</div>
  }

  function isHighlighted(globalIndex) {
    if (!activeRange) return false
    return globalIndex >= activeRange.offset && globalIndex < activeRange.offset + activeRange.length
  }

  return (
    <div className="hexdump">
      {rows.map((row) => (
        <div className="hexdump__row" key={row.offset}>
          <span className="hexdump__offset">{row.offset.toString(16).padStart(4, '0')}</span>
          <span className="hexdump__hex">
            {Array.from({ length: ROW_SIZE }, (_, i) => {
              if (i >= row.bytes.length) {
                return <span key={i} className="hexdump__byte hexdump__byte--pad" aria-hidden="true" />
              }
              const globalIndex = row.offset + i
              return (
                <span
                  key={i}
                  className={`hexdump__byte ${isHighlighted(globalIndex) ? 'hexdump__byte--active' : ''}`}
                >
                  {toHexByte(row.bytes[i])}
                </span>
              )
            })}
          </span>
          <span className="hexdump__ascii">
            {Array.from(row.bytes).map((b, i) => {
              const globalIndex = row.offset + i
              return (
                <span
                  key={i}
                  className={`hexdump__char ${isHighlighted(globalIndex) ? 'hexdump__byte--active' : ''}`}
                >
                  {byteToPrintableAscii(b)}
                </span>
              )
            })}
          </span>
        </div>
      ))}
    </div>
  )
}
