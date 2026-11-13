import { memo } from 'react'
import { colorsForProtocol } from '../config/protocolColors.js'
import { formatRelTime } from '../lib/format.js'

function PacketRow({ packet, isSelected, onSelect }) {
  const colors = colorsForProtocol(packet.protocol)

  return (
    <div
      className={`packet-row ${isSelected ? 'packet-row--selected' : ''}`}
      style={!isSelected ? { backgroundColor: colors.bg, borderLeftColor: colors.border } : { borderLeftColor: colors.border }}
      onClick={onSelect}
      role="row"
      aria-selected={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <span className="col col--no">{packet.number}</span>
      <span className="col col--time">{formatRelTime(packet.relTime)}</span>
      <span className="col col--src">{packet.srcAddr}</span>
      <span className="col col--dst">{packet.dstAddr}</span>
      <span className="col col--proto">{packet.protocol}</span>
      <span className="col col--len">{packet.length}</span>
      <span className="col col--info" title={packet.info}>
        {packet.info}
      </span>
    </div>
  )
}

export default memo(PacketRow)
