import { ByteWriter, internetChecksum, ipToBytes } from '../bytes.js'

export function buildUdpDatagram({ srcIp, dstIp, srcPort, dstPort, payloadBytes = [] }) {
  const length = 8 + payloadBytes.length

  const w = new ByteWriter()
  w.u16(srcPort)
  w.u16(dstPort)
  w.u16(length)
  w.u16(0) // checksum placeholder

  const headerBytes = w.toUint8Array()

  const pseudoHeader = new ByteWriter()
  pseudoHeader.bytesRaw(ipToBytes(srcIp))
  pseudoHeader.bytesRaw(ipToBytes(dstIp))
  pseudoHeader.u8(0)
  pseudoHeader.u8(17) // UDP protocol number
  pseudoHeader.u16(length)

  const checksumInput = [...pseudoHeader.bytes, ...headerBytes, ...payloadBytes]
  const checksum = internetChecksum(checksumInput)
  headerBytes[6] = (checksum >> 8) & 0xff
  headerBytes[7] = checksum & 0xff

  const fields = [
    { label: 'Source Port', value: String(srcPort), offset: 0, length: 2 },
    { label: 'Destination Port', value: String(dstPort), offset: 2, length: 2 },
    { label: 'Length', value: String(length), offset: 4, length: 2 },
    { label: 'Checksum', value: `0x${checksum.toString(16).padStart(4, '0')}`, offset: 6, length: 2 },
  ]

  return {
    bytes: headerBytes,
    tree: { name: 'User Datagram Protocol', fields },
  }
}
