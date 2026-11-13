import { useAppState } from '../state/AppContext.jsx'

const INTERFACES = ['eth0 (Simulated Ethernet)', 'wlan0 (Simulated Wi-Fi)', 'lo (Loopback)']

export default function Toolbar({ onStart, onStop, onClear }) {
  const { state, dispatch } = useAppState()
  const { isCapturing, interfaceName, autoScroll } = state

  return (
    <div className="toolbar" role="toolbar" aria-label="Capture controls">
      <div className="toolbar__group">
        {!isCapturing ? (
          <button type="button" className="toolbar__btn toolbar__btn--primary" onClick={onStart} title="Start capture">
            <span aria-hidden="true">▶</span> Start
          </button>
        ) : (
          <button type="button" className="toolbar__btn toolbar__btn--danger" onClick={onStop} title="Stop capture">
            <span aria-hidden="true">■</span> Stop
          </button>
        )}
        <button type="button" className="toolbar__btn" onClick={onClear} title="Clear capture">
          <span aria-hidden="true">⟲</span> Clear
        </button>
      </div>

      <div className="toolbar__group">
        <label className="toolbar__label" htmlFor="interface-select">
          Interface
        </label>
        <select
          id="interface-select"
          className="toolbar__select"
          value={interfaceName}
          disabled={isCapturing}
          onChange={(e) => dispatch({ type: 'SET_INTERFACE', name: e.target.value })}
        >
          {INTERFACES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <label className="toolbar__group toolbar__checkbox">
        <input
          type="checkbox"
          checked={autoScroll}
          onChange={(e) => dispatch({ type: 'SET_AUTOSCROLL', value: e.target.checked })}
        />
        Auto-scroll
      </label>

      <div className="toolbar__status" aria-live="polite">
        <span className={`toolbar__dot ${isCapturing ? 'toolbar__dot--live' : ''}`} aria-hidden="true" />
        {isCapturing ? 'Capturing…' : 'Idle'}
      </div>
    </div>
  )
}
