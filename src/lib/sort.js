// Column sorting for the packet list. Each column reads straight off the
// finalized packet object (lib/packetBuilder.js sets number/relTime/srcAddr/
// dstAddr/protocol/length/info directly), so no layer lookups are needed.

const ACCESSORS = {
  number: (p) => p.number,
  relTime: (p) => p.relTime,
  srcAddr: (p) => p.srcAddr,
  dstAddr: (p) => p.dstAddr,
  protocol: (p) => p.protocol,
  length: (p) => p.length,
  info: (p) => p.info,
}

export const DEFAULT_SORT_KEY = 'number'
export const DEFAULT_SORT_DIR = 'asc'

export function sortPackets(packets, key, direction) {
  const accessor = ACCESSORS[key] ?? ACCESSORS[DEFAULT_SORT_KEY]
  const sign = direction === 'desc' ? -1 : 1

  return [...packets].sort((a, b) => {
    const av = accessor(a)
    const bv = accessor(b)
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sign
    return String(av).localeCompare(String(bv), undefined, { numeric: true }) * sign
  })
}
