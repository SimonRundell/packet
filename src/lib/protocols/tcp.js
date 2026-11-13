import { ByteWriter, internetChecksum, ipToBytes } from '../bytes.js'

const FLAG_BITS = { fin: 0x01, syn: 0x02, rst: 0x04, psh: 0x08, ack: 0x10, urg: 0x20 }

function flagsToByte(flags) {
  let b = 0
  for (const [name, bit] of Object.entries(FLAG_BITS)) {
    if (flags[name]) b |= bit
  }
  return b
}

function flagsSummary(flags) {
  const order = ['syn', 'ack', 'psh', 'fin', 'rst', 'urg']
  const set = order.filter((f) => flags[f]).map((f) => f.toUpperCase())
  return set.length ? set.join(', ') : 'none'
}

/**
 * Builds a TCP header. The checksum covers the IPv4 pseudo-header, the TCP
 * header itself, and payloadBytes — but only the 20-byte header is returned;
 * the caller appends payloadBytes separately as its own layer.
 */
export function buildTcpSegment({
  srcIp,
  dstIp,
  srcPort,
  dstPort,
  seq,
  ack,
  flags,
  window = 64240,
  payloadBytes = [],
}) {
  const w = new ByteWriter()
  w.u16(srcPort)
  w.u16(dstPort)
  w.u32(seq)
  w.u32(ack)
  w.u8(5 << 4) // data offset: 5 words (20 bytes), no options
  w.u8(flagsToByte(flags))
  w.u16(window)
  w.u16(0) // checksum placeholder
  w.u16(0) // urgent pointer

  const headerBytes = w.toUint8Array()

  const pseudoHeader = new ByteWriter()
  pseudoHeader.bytesRaw(ipToBytes(srcIp))
  pseudoHeader.bytesRaw(ipToBytes(dstIp))
  pseudoHeader.u8(0)
  pseudoHeader.u8(6) // TCP protocol number
  pseudoHeader.u16(headerBytes.length + payloadBytes.length)

  const checksumInput = [...pseudoHeader.bytes, ...headerBytes, ...payloadBytes]
  const checksum = internetChecksum(checksumInput)
  headerBytes[16] = (checksum >> 8) & 0xff
  headerBytes[17] = checksum & 0xff

  const fields = [
    { label: 'Source Port', value: String(srcPort), offset: 0, length: 2 },
    { label: 'Destination Port', value: String(dstPort), offset: 2, length: 2 },
    { label: 'Sequence Number', value: String(seq), offset: 4, length: 4 },
    { label: 'Acknowledgment Number', value: String(ack), offset: 8, length: 4 },
    { label: 'Header Length', value: '20 bytes', offset: 12, length: 1 },
    { label: 'Flags', value: flagsSummary(flags), offset: 13, length: 1 },
    { label: 'Window Size', value: String(window), offset: 14, length: 2 },
    { label: 'Checksum', value: `0x${checksum.toString(16).padStart(4, '0')}`, offset: 16, length: 2 },
    { label: 'Urgent Pointer', value: '0', offset: 18, length: 2 },
  ]

  return {
    bytes: headerBytes,
    tree: { name: 'Transmission Control Protocol', fields },
  }
}
