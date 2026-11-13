import { useState } from 'react'
import { useAppState } from '../state/AppContext.jsx'
import { FILTER_EXAMPLES } from '../content/filterHelp.js'

export default function FilterBar() {
  const { state, dispatch, filterError, filteredPackets } = useAppState()
  const [showHelp, setShowHelp] = useState(false)

  return (
    <div className="filterbar">
      <span className="filterbar__icon" aria-hidden="true">
        ⏷
      </span>
      <input
        type="text"
        className={`filterbar__input ${filterError ? 'filterbar__input--invalid' : ''}`}
        placeholder='Apply a display filter… e.g. tcp.port == 443 or dns'
        value={state.filterText}
        onChange={(e) => dispatch({ type: 'SET_FILTER_TEXT', text: e.target.value })}
        aria-invalid={Boolean(filterError)}
        aria-describedby="filter-error"
      />
      {state.filterText && (
        <button
          type="button"
          className="filterbar__clear"
          onClick={() => dispatch({ type: 'SET_FILTER_TEXT', text: '' })}
          title="Clear filter"
        >
          ✕
        </button>
      )}
      <button
        type="button"
        className="filterbar__help-btn"
        onClick={() => setShowHelp((v) => !v)}
        title="Filter syntax help"
        aria-expanded={showHelp}
      >
        ?
      </button>
      <span className="filterbar__count">
        {filteredPackets.length} displayed · {state.packets.length} captured
      </span>

      {filterError && (
        <div id="filter-error" className="filterbar__error" role="alert">
          {filterError}
        </div>
      )}

      {showHelp && (
        <div className="filterbar__help">
          <strong>Display filter examples</strong>
          <table>
            <tbody>
              {FILTER_EXAMPLES.map((ex) => (
                <tr key={ex.filter}>
                  <td>
                    <button
                      type="button"
                      className="filterbar__example"
                      onClick={() => {
                        dispatch({ type: 'SET_FILTER_TEXT', text: ex.filter })
                        setShowHelp(false)
                      }}
                    >
                      {ex.filter}
                    </button>
                  </td>
                  <td>{ex.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="filterbar__help-note">
            Supports <code>&amp;&amp;</code>/<code>and</code>, <code>||</code>/<code>or</code>, <code>!</code>/
            <code>not</code>, and parentheses.
          </p>
        </div>
      )}
    </div>
  )
}
