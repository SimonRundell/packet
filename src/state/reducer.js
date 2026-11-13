import { DEFAULT_SORT_KEY, DEFAULT_SORT_DIR } from '../lib/sort.js'

export const MAX_BUFFERED_PACKETS = 800

export const initialState = {
  isCapturing: false,
  packets: [],
  nextNumber: 1,
  captureStartedAt: null,
  selectedId: null,
  hoveredRange: null,
  selectedRange: null,
  filterText: '',
  filterError: null,
  autoScroll: true,
  interfaceName: 'eth0 (Simulated Ethernet)',
  sortKey: DEFAULT_SORT_KEY,
  sortDir: DEFAULT_SORT_DIR,
}

export function reducer(state, action) {
  switch (action.type) {
    case 'START_CAPTURE':
      return {
        ...state,
        isCapturing: true,
        captureStartedAt: state.captureStartedAt ?? action.now,
      }

    case 'STOP_CAPTURE':
      return { ...state, isCapturing: false }

    case 'CLEAR_CAPTURE':
      return {
        ...initialState,
        interfaceName: state.interfaceName,
        filterText: state.filterText,
        autoScroll: state.autoScroll,
        sortKey: state.sortKey,
        sortDir: state.sortDir,
      }

    case 'ADD_PACKETS': {
      const combined = [...state.packets, ...action.packets]
      const overflow = combined.length - MAX_BUFFERED_PACKETS
      const packets = overflow > 0 ? combined.slice(overflow) : combined
      return {
        ...state,
        packets,
        nextNumber: state.nextNumber + action.packets.length,
      }
    }

    case 'SELECT_PACKET':
      return { ...state, selectedId: action.id, selectedRange: null, hoveredRange: null }

    case 'SET_FILTER_TEXT':
      return { ...state, filterText: action.text }

    case 'SET_FILTER_ERROR':
      return { ...state, filterError: action.error }

    case 'SET_AUTOSCROLL':
      return { ...state, autoScroll: action.value }

    case 'SET_HOVERED_RANGE':
      return { ...state, hoveredRange: action.range }

    case 'SET_SELECTED_RANGE':
      return { ...state, selectedRange: action.range }

    case 'SET_INTERFACE':
      return { ...state, interfaceName: action.name }

    case 'SET_SORT':
      if (state.sortKey === action.key) {
        return { ...state, sortDir: state.sortDir === 'asc' ? 'desc' : 'asc' }
      }
      return { ...state, sortKey: action.key, sortDir: 'asc' }

    default:
      return state
  }
}
