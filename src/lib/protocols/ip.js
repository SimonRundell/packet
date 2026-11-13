import { ByteWriter, bytesToIp, internetChecksum } from '../bytes.js'

const PROTOCOL_NUMBERS = { tcp: 6, udp: 17, icmp: 1 }
const PROTOCOL_NAMES = { tcp: 'TCP', udp: 'UDP', icmp: 'ICMP' }

export function buildIPv4Header({ srcIp, dstIp, protocol, payloadLength, identification, ttl = 64 }) {
  const headerLength = 20
  const totalLength = headerLength + payloadLength

  const w = new ByteWriter()
  w.u8(0x45) // version 4, header length 5 x 32-bit words
  w.u8(0x00) // DSCP / ECN
  w.u16(totalLength)
  w.u16(identification)
  w.u16(0x4000) // flags: don't fragment, no fragment offset
  w.u8(ttl)
  w.u8(PROTOCOL_NUMBERS[protocol])
  w.u16(0) // checksum placeholder
  w.ipv4(srcIp)
  w.ipv4(dstIp)

  const bytes = w.toUint8Array()
  const checksum = internetChecksum(bytes)
  bytes[10] = (checksum >> 8) & 0xff
  bytes[11] = checksum & 0xff

  const fields = [
    { label: 'Version', value: '4', offset: 0, length: 1 },
    { label: 'Header Length', value: `${headerLength} bytes`, offset: 0, length: 1 },
    { label: 'Total Length', value: String(totalLength), offset: 2, length: 2 },
    { label: 'Identification', value: `0x${identification.toString(16).padStart(4, '0')}`, offset: 4, length: 2 },
    { label: 'Flags', value: "Don't fragment", offset: 6, length: 2 },
    { label: 'Time to Live', value: String(ttl), offset: 8, length: 1 },
    { label: 'Protocol', value: `${PROTOCOL_NAMES[protocol]} (${PROTOCOL_NUMBERS[protocol]})`, offset: 9, length: 1 },
    { label: 'Header Checksum', value: `0x${checksum.toString(16).padStart(4, '0')}`, offset: 10, length: 2 },
    { label: 'Source Address', value: bytesToIp(bytes.slice(12, 16)), offset: 12, length: 4 },
    { label: 'Destination Address', value: bytesToIp(bytes.slice(16, 20)), offset: 16, length: 4 },
  ]

  return {
    bytes,
    tree: { name: 'Internet Protocol Version 4', fields },
  }
}
