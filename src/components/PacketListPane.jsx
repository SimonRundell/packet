import { useEffect, useRef } from 'react'
import { useAppState } from '../state/AppContext.jsx'
import { DEFAULT_SORT_KEY, DEFAULT_SORT_DIR } from '../lib/sort.js'
import PacketRow from './PacketRow.jsx'

const COLUMNS = [
  { key: 'number', label: 'No.', className: 'col--no' },
  { key: 'relTime', label: 'Time', className: 'col--time' },
  { key: 'srcAddr', label: 'Source', className: 'col--src' },
  { key: 'dstAddr', label: 'Destination', className: 'col--dst' },
  { key: 'protocol', label: 'Protocol', className: 'col--proto' },
  { key: 'length', label: 'Length', className: 'col--len' },
  { key: 'info', label: 'Info', className: 'col--info' },
]

export default function PacketListPane() {
  const { state, dispatch, filteredPackets } = useAppState()
  const scrollRef = useRef(null)
  const isDefaultSort = state.sortKey === DEFAULT_SORT_KEY && state.sortDir === DEFAULT_SORT_DIR

  useEffect(() => {
    if (isDefaultSort && state.autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [filteredPackets.length, state.autoScroll, isDefaultSort])

  return (
    <div className="packet-list">
      <div className="packet-list__header" role="row">
        {COLUMNS.map(({ key, label, className }) => {
          const isActive = state.sortKey === key
          return (
            <button
              key={key}
              type="button"
              className={`col col--sortable ${className} ${isActive ? 'col--sort-active' : ''}`}
              onClick={() => dispatch({ type: 'SET_SORT', key })}
              aria-sort={isActive ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              title={`Sort by ${label}`}
            >
              {label}
              <span className="col__sort-arrow" aria-hidden="true">
                {isActive ? (state.sortDir === 'asc' ? '▲' : '▼') : ''}
              </span>
            </button>
          )
        })}
      </div>
      <div className="packet-list__rows" ref={scrollRef} role="rowgroup">
        {filteredPackets.length === 0 ? (
          <div className="packet-list__empty">
            {state.packets.length === 0
              ? 'No packets captured yet. Press Start to begin.'
              : 'No packets match this filter.'}
          </div>
        ) : (
          filteredPackets.map((packet) => (
            <PacketRow
              key={packet.id}
              packet={packet}
              isSelected={packet.id === state.selectedId}
              onSelect={() => dispatch({ type: 'SELECT_PACKET', id: packet.id })}
            />
          ))
        )}
      </div>
    </div>
  )
}
