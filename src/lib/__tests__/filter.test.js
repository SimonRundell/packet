import { describe, expect, it } from 'vitest'
import { parseFilter, evaluateFilter, filterPackets, FilterSyntaxError } from '../filter.js'

function makePacket({ protocol, length = 100, srcIp, dstIp, srcPort, dstPort }) {
  const layers = [
    { name: 'Ethernet II', fields: [{ label: 'Source', value: 'aa:bb:cc:dd:ee:01' }, { label: 'Destination', value: 'aa:bb:cc:dd:ee:02' }] },
  ]
  if (srcIp) {
    layers.push({
      name: 'Internet Protocol Version 4',
      fields: [{ label: 'Source Address', value: srcIp }, { label: 'Destination Address', value: dstIp }],
    })
  }
  if (srcPort !== undefined) {
    layers.push({
      name: protocol === 'UDP' || protocol === 'DNS' ? 'User Datagram Protocol' : 'Transmission Control Protocol',
      fields: [{ label: 'Source Port', value: srcPort }, { label: 'Destination Port', value: dstPort }],
    })
  }
  return { protocol, length, layers }
}

const tcpPacket = makePacket({ protocol: 'TCP', srcIp: '192.168.1.23', dstIp: '93.184.216.34', srcPort: 51000, dstPort: 443, length: 66 })
const dnsPacket = makePacket({ protocol: 'DNS', srcIp: '192.168.1.23', dstIp: '8.8.8.8', srcPort: 51200, dstPort: 53, length: 72 })
const arpPacket = makePacket({ protocol: 'ARP', length: 42 })

describe('parseFilter + evaluateFilter', () => {
  it('treats an empty filter as "match everything"', () => {
    expect(parseFilter('')).toBeNull()
    expect(evaluateFilter(null, tcpPacket)).toBe(true)
  })

  it('matches bareword protocol filters, including transport fallthrough', () => {
    expect(evaluateFilter(parseFilter('tcp'), tcpPacket)).toBe(true)
    expect(evaluateFilter(parseFilter('tcp'), dnsPacket)).toBe(false)
    expect(evaluateFilter(parseFilter('udp'), dnsPacket)).toBe(true)
    expect(evaluateFilter(parseFilter('dns'), dnsPacket)).toBe(true)
    expect(evaluateFilter(parseFilter('arp'), arpPacket)).toBe(true)
  })

  it('matches ip.addr against either source or destination', () => {
    expect(evaluateFilter(parseFilter('ip.addr == 93.184.216.34'), tcpPacket)).toBe(true)
    expect(evaluateFilter(parseFilter('ip.addr == 192.168.1.23'), tcpPacket)).toBe(true)
    expect(evaluateFilter(parseFilter('ip.addr == 1.2.3.4'), tcpPacket)).toBe(false)
  })

  it('matches tcp.port against either port and is numeric', () => {
    expect(evaluateFilter(parseFilter('tcp.port == 443'), tcpPacket)).toBe(true)
    expect(evaluateFilter(parseFilter('tcp.port == 80'), tcpPacket)).toBe(false)
    expect(evaluateFilter(parseFilter('tcp.srcport == 51000'), tcpPacket)).toBe(true)
  })

  it('supports frame.len comparisons', () => {
    expect(evaluateFilter(parseFilter('frame.len > 50'), tcpPacket)).toBe(true)
    expect(evaluateFilter(parseFilter('frame.len > 1000'), tcpPacket)).toBe(false)
  })

  it('supports boolean combinators and parentheses', () => {
    expect(evaluateFilter(parseFilter('dns || http'), dnsPacket)).toBe(true)
    expect(evaluateFilter(parseFilter('not arp'), tcpPacket)).toBe(true)
    expect(evaluateFilter(parseFilter('not arp'), arpPacket)).toBe(false)
    expect(evaluateFilter(parseFilter('ip.src == 192.168.1.23 && tcp'), tcpPacket)).toBe(true)
    expect(evaluateFilter(parseFilter('(arp or dns) and not tcp'), dnsPacket)).toBe(true)
  })

  it('throws FilterSyntaxError for incomplete expressions', () => {
    expect(() => parseFilter('tcp &&')).toThrow(FilterSyntaxError)
    expect(() => parseFilter('tcp.port ==')).toThrow(FilterSyntaxError)
  })

  it('throws FilterSyntaxError for unknown fields or barewords', () => {
    expect(() => evaluateFilter(parseFilter('foo.bar == 1'), tcpPacket)).toThrow(FilterSyntaxError)
    expect(() => evaluateFilter(parseFilter('nonsense'), tcpPacket)).toThrow(FilterSyntaxError)
  })
})

describe('filterPackets', () => {
  it('filters a list down to matching packets', () => {
    const result = filterPackets([tcpPacket, dnsPacket, arpPacket], 'udp')
    expect(result).toEqual([dnsPacket])
  })

  it('returns the full list for a blank filter', () => {
    const all = [tcpPacket, dnsPacket, arpPacket]
    expect(filterPackets(all, '   ')).toEqual(all)
  })
})
