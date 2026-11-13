import { useState } from 'react'
import { useAppState } from '../state/AppContext.jsx'

export default function LayerNode({ layer }) {
  const [collapsed, setCollapsed] = useState(false)
  const { state, dispatch } = useAppState()

  function hover(range) {
    dispatch({ type: 'SET_HOVERED_RANGE', range })
  }

  function select(range) {
    dispatch({ type: 'SET_SELECTED_RANGE', range })
  }

  const isFieldActive = (field) =>
    state.selectedRange?.offset === field.offset && state.selectedRange?.length === field.length

  return (
    <div className="tree-node">
      <button
        type="button"
        className="tree-node__header"
        onClick={() => setCollapsed((c) => !c)}
        onMouseEnter={() => hover({ offset: layer.offset, length: layer.length })}
        onMouseLeave={() => hover(null)}
      >
        <span className="tree-node__caret" aria-hidden="true">
          {collapsed ? '▶' : '▼'}
        </span>
        {layer.name}
      </button>
      {!collapsed && (
        <ul className="tree-node__fields">
          {layer.fields.map((field, i) => (
            <li
              key={i}
              className={`tree-node__field ${isFieldActive(field) ? 'tree-node__field--active' : ''}`}
              onMouseEnter={() => hover({ offset: field.offset, length: field.length })}
              onMouseLeave={() => hover(null)}
              onClick={() => select({ offset: field.offset, length: field.length })}
            >
              <span className="tree-node__field-label">{field.label}:</span>{' '}
              <span className="tree-node__field-value">{field.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
