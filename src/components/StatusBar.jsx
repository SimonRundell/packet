import { useAppState } from '../state/AppContext.jsx'

export default function StatusBar() {
  const { state, filteredPackets, selectedPacket } = useAppState()

  return (
    <div className="status-bar">
      <span>{state.interfaceName}</span>
      <span className="status-bar__sep">·</span>
      <span>
        {filteredPackets.length} displayed / {state.packets.length} captured
      </span>
      {selectedPacket && (
        <>
          <span className="status-bar__sep">·</span>
          <span>
            Frame {selectedPacket.number}, {selectedPacket.length} bytes
          </span>
        </>
      )}
      <span className="status-bar__spacer" />
      <span className="status-bar__note">Simulated capture — no real network traffic is read or sent.</span>
    </div>
  )
}
