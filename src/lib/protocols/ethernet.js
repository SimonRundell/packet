import { ByteWriter, bytesToMac } from '../bytes.js'

const ETHERTYPE_IPV4 = 0x0800
const ETHERTYPE_ARP = 0x0806

export function buildEthernetFrame({ srcMac, dstMac, payloadType }) {
  const w = new ByteWriter()
  w.mac(dstMac)
  w.mac(srcMac)
  const etherType = payloadType === 'arp' ? ETHERTYPE_ARP : ETHERTYPE_IPV4
  w.u16(etherType)

  const bytes = w.toUint8Array()
  const fields = [
    { label: 'Destination', value: bytesToMac(bytes.slice(0, 6)), offset: 0, length: 6 },
    { label: 'Source', value: bytesToMac(bytes.slice(6, 12)), offset: 6, length: 6 },
    {
      label: 'Type',
      value: `${payloadType === 'arp' ? 'ARP' : 'IPv4'} (0x${etherType.toString(16).padStart(4, '0')})`,
      offset: 12,
      length: 2,
    },
  ]

  return {
    bytes,
    tree: { name: 'Ethernet II', fields },
  }
}
