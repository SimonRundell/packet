// Convenience accessors that pull a specific field's value back out of a
// finalized packet's layer tree, used by the filter engine and the UI.

function findLayer(packet, nameIncludes) {
  return packet.layers.find((l) => l.name.toLowerCase().includes(nameIncludes))
}

export function hasLayer(packet, nameIncludes) {
  return Boolean(findLayer(packet, nameIncludes))
}

function findField(layer, label) {
  return layer?.fields.find((f) => f.label === label)?.value
}

export function getEthSrc(packet) {
  return findField(findLayer(packet, 'ethernet'), 'Source')
}

export function getEthDst(packet) {
  return findField(findLayer(packet, 'ethernet'), 'Destination')
}

export function getIpSrc(packet) {
  return findField(findLayer(packet, 'internet protocol'), 'Source Address')
}

export function getIpDst(packet) {
  return findField(findLayer(packet, 'internet protocol'), 'Destination Address')
}

export function getSrcPort(packet) {
  const layer = findLayer(packet, 'transmission control') ?? findLayer(packet, 'user datagram')
  const value = findField(layer, 'Source Port')
  return value === undefined ? undefined : Number(value)
}

export function getDstPort(packet) {
  const layer = findLayer(packet, 'transmission control') ?? findLayer(packet, 'user datagram')
  const value = findField(layer, 'Destination Port')
  return value === undefined ? undefined : Number(value)
}

export function getAnyPort(packet) {
  const src = getSrcPort(packet)
  const dst = getDstPort(packet)
  return [src, dst].filter((p) => p !== undefined)
}
