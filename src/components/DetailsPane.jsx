import { useAppState } from '../state/AppContext.jsx'
import LayerNode from './LayerNode.jsx'

export default function DetailsPane() {
  const { selectedPacket } = useAppState()

  if (!selectedPacket) {
    return <div className="details-pane details-pane--empty">Select a packet to inspect its layers.</div>
  }

  return (
    <div className="details-pane" key={selectedPacket.id}>
      {selectedPacket.layers.map((layer, i) => (
        <LayerNode key={`${selectedPacket.id}-${i}`} layer={layer} />
      ))}
    </div>
  )
}
