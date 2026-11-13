import { useMemo, useReducer, useRef } from 'react'
import { AppContext, useAppState } from './state/AppContext.jsx'
import { reducer, initialState } from './state/reducer.js'
import { parseFilter, evaluateFilter, FilterSyntaxError } from './lib/filter.js'
import { sortPackets } from './lib/sort.js'
import { useCapture } from './hooks/useCapture.js'
import { useResizableLayout } from './hooks/useResizableLayout.js'
import Toolbar from './components/Toolbar.jsx'
import FilterBar from './components/FilterBar.jsx'
import PacketListPane from './components/PacketListPane.jsx'
import DetailsPane from './components/DetailsPane.jsx'
import HexDumpPane from './components/HexDumpPane.jsx'
import StatusBar from './components/StatusBar.jsx'
import CMFloatAd from './cmFloatAd.jsx'

function Workspace() {
  const { state, dispatch } = useAppState()
  const capture = useCapture({
    isCapturing: state.isCapturing,
    interfaceName: state.interfaceName,
    dispatch,
  })
  const containerRef = useRef(null)
  const { boundaries, onDividerPointerDown } = useResizableLayout(containerRef)

  function handleStart() {
    dispatch({ type: 'START_CAPTURE', now: Date.now() })
  }

  function handleStop() {
    dispatch({ type: 'STOP_CAPTURE' })
  }

  function handleClear() {
    capture.reset()
    dispatch({ type: 'CLEAR_CAPTURE' })
  }

  const [b0, b1] = boundaries

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">PacketTrace</h1>
        <span className="app__subtitle">a simulated packet capture analyzer</span>
      </header>
      <Toolbar onStart={handleStart} onStop={handleStop} onClear={handleClear} />
      <FilterBar />
      <div className="panes" ref={containerRef}>
        <section className="pane" style={{ height: `${b0 * 100}%` }}>
          <PacketListPane />
        </section>
        <div className="divider" onPointerDown={onDividerPointerDown(0)} role="separator" aria-orientation="horizontal" />
        <section className="pane" style={{ height: `${(b1 - b0) * 100}%` }}>
          <DetailsPane />
        </section>
        <div className="divider" onPointerDown={onDividerPointerDown(1)} role="separator" aria-orientation="horizontal" />
        <section className="pane pane--hex" style={{ height: `${(1 - b1) * 100}%` }}>
          <HexDumpPane />
        </section>
      </div>
      <StatusBar />
      <CMFloatAd />
    </div>
  )
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const { filteredPackets: matchedPackets, filterError } = useMemo(() => {
    try {
      const ast = parseFilter(state.filterText)
      return {
        filteredPackets: ast ? state.packets.filter((p) => evaluateFilter(ast, p)) : state.packets,
        filterError: null,
      }
    } catch (err) {
      if (err instanceof FilterSyntaxError) {
        return { filteredPackets: state.packets, filterError: err.message }
      }
      throw err
    }
  }, [state.packets, state.filterText])

  const filteredPackets = useMemo(
    () => sortPackets(matchedPackets, state.sortKey, state.sortDir),
    [matchedPackets, state.sortKey, state.sortDir],
  )

  const selectedPacket = useMemo(
    () => state.packets.find((p) => p.id === state.selectedId) ?? null,
    [state.packets, state.selectedId],
  )

  const value = useMemo(
    () => ({ state, dispatch, filteredPackets, filterError, selectedPacket }),
    [state, dispatch, filteredPackets, filterError, selectedPacket],
  )

  return (
    <AppContext.Provider value={value}>
      <Workspace />
    </AppContext.Provider>
  )
}
