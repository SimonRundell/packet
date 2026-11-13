import { ByteWriter } from '../bytes.js'

const OPCODE_NAMES = { 1: 'request', 2: 'reply' }

export function buildArpMessage({ opcode, senderMac, senderIp, targetMac, targetIp }) {
  const w = new ByteWriter()
  w.u16(1) // hardware type: Ethernet
  w.u16(0x0800) // protocol type: IPv4
  w.u8(6) // hardware address length
  w.u8(4) // protocol address length
  w.u16(opcode)
  w.mac(senderMac)
  w.ipv4(senderIp)
  w.mac(targetMac)
  w.ipv4(targetIp)

  const bytes = w.toUint8Array()

  const fields = [
    { label: 'Hardware Type', value: 'Ethernet (1)', offset: 0, length: 2 },
    { label: 'Protocol Type', value: 'IPv4 (0x0800)', offset: 2, length: 2 },
    { label: 'Hardware Size', value: '6', offset: 4, length: 1 },
    { label: 'Protocol Size', value: '4', offset: 5, length: 1 },
    { label: 'Opcode', value: `${OPCODE_NAMES[opcode]} (${opcode})`, offset: 6, length: 2 },
    { label: 'Sender MAC Address', value: senderMac, offset: 8, length: 6 },
    { label: 'Sender IP Address', value: senderIp, offset: 14, length: 4 },
    { label: 'Target MAC Address', value: targetMac, offset: 18, length: 6 },
    { label: 'Target IP Address', value: targetIp, offset: 24, length: 4 },
  ]

  return {
    bytes,
    tree: { name: 'Address Resolution Protocol', fields },
  }
}
