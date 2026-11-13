import { ByteWriter, internetChecksum } from '../bytes.js'

const TYPE_NAMES = { 8: 'Echo (ping) request', 0: 'Echo (ping) reply' }

export function buildIcmpMessage({ type, identifier, sequence, payloadBytes = [] }) {
  const w = new ByteWriter()
  w.u8(type)
  w.u8(0) // code
  w.u16(0) // checksum placeholder
  w.u16(identifier)
  w.u16(sequence)

  const headerBytes = w.toUint8Array()
  const checksum = internetChecksum([...headerBytes, ...payloadBytes])
  headerBytes[2] = (checksum >> 8) & 0xff
  headerBytes[3] = checksum & 0xff

  const fields = [
    { label: 'Type', value: `${TYPE_NAMES[type] ?? type} (${type})`, offset: 0, length: 1 },
    { label: 'Code', value: '0', offset: 1, length: 1 },
    { label: 'Checksum', value: `0x${checksum.toString(16).padStart(4, '0')}`, offset: 2, length: 2 },
    { label: 'Identifier', value: `0x${identifier.toString(16).padStart(4, '0')}`, offset: 4, length: 2 },
    { label: 'Sequence Number', value: String(sequence), offset: 6, length: 2 },
  ]

  return {
    bytes: headerBytes,
    tree: { name: 'Internet Control Message Protocol', fields },
  }
}
