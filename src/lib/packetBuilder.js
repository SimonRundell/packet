// Composes protocol layer builders (lib/protocols/*) into a single packet
// record: concatenated raw bytes plus a layered field tree with byte offsets
// resolved to the whole-frame coordinate space, ready for the details pane
// and hex dump to stay in sync.

/**
 * @param {{bytes: Uint8Array, tree: {name: string, fields: object[]}}[]} layerParts
 */
export function composeLayers(layerParts) {
  const chunks = []
  const layers = []
  let runningOffset = 0

  for (const part of layerParts) {
    chunks.push(part.bytes)
    layers.push({
      name: part.tree.name,
      offset: runningOffset,
      length: part.bytes.length,
      fields: part.tree.fields.map((f) => ({ ...f, offset: f.offset + runningOffset })),
    })
    runningOffset += part.bytes.length
  }

  const totalLength = runningOffset
  const bytes = new Uint8Array(totalLength)
  let pos = 0
  for (const chunk of chunks) {
    bytes.set(chunk, pos)
    pos += chunk.length
  }

  return { bytes, layers }
}

/**
 * Wraps composed layers with a synthetic "Frame" layer (capture metadata)
 * and the fields every packet list row needs.
 */
export function finalizePacket({
  layerParts,
  number,
  timestamp,
  relTime,
  srcAddr,
  dstAddr,
  protocol,
  info,
  interfaceName,
}) {
  const { bytes, layers } = composeLayers(layerParts)

  const frameLayer = {
    name: 'Frame',
    offset: 0,
    length: bytes.length,
    fields: [
      { label: 'Frame Number', value: String(number), offset: 0, length: bytes.length },
      { label: 'Frame Length', value: `${bytes.length} bytes`, offset: 0, length: bytes.length },
      { label: 'Capture Length', value: `${bytes.length} bytes`, offset: 0, length: bytes.length },
      { label: 'Interface', value: interfaceName, offset: 0, length: bytes.length },
      { label: 'Encapsulation', value: 'Ethernet', offset: 0, length: bytes.length },
    ],
  }

  return {
    id: `pkt-${number}`,
    number,
    timestamp,
    relTime,
    srcAddr,
    dstAddr,
    protocol,
    length: bytes.length,
    info,
    bytes,
    layers: [frameLayer, ...layers],
  }
}
