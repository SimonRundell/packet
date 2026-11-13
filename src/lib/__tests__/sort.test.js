import { describe, expect, it } from 'vitest'
import { sortPackets } from '../sort.js'

const packets = [
  { number: 3, relTime: 0.3, srcAddr: '10.0.0.3', dstAddr: '2.2.2.2', protocol: 'UDP', length: 80, info: 'c' },
  { number: 1, relTime: 0.1, srcAddr: '10.0.0.1', dstAddr: '3.3.3.3', protocol: 'TCP', length: 200, info: 'a' },
  { number: 2, relTime: 0.2, srcAddr: '10.0.0.2', dstAddr: '1.1.1.1', protocol: 'ARP', length: 40, info: 'b' },
]

describe('sortPackets', () => {
  it('defaults to ascending numeric order by number', () => {
    expect(sortPackets(packets, 'number', 'asc').map((p) => p.number)).toEqual([1, 2, 3])
  })

  it('reverses for descending', () => {
    expect(sortPackets(packets, 'number', 'desc').map((p) => p.number)).toEqual([3, 2, 1])
  })

  it('sorts numeric columns numerically, not lexically', () => {
    const withBigNumbers = [{ number: 2, length: 9 }, { number: 1, length: 100 }, { number: 3, length: 20 }]
    expect(sortPackets(withBigNumbers, 'length', 'asc').map((p) => p.length)).toEqual([9, 20, 100])
  })

  it('sorts string columns alphabetically', () => {
    expect(sortPackets(packets, 'protocol', 'asc').map((p) => p.protocol)).toEqual(['ARP', 'TCP', 'UDP'])
  })

  it('does not mutate the input array', () => {
    const original = [...packets]
    sortPackets(packets, 'number', 'desc')
    expect(packets).toEqual(original)
  })

  it('falls back to sorting by number for an unknown key', () => {
    expect(sortPackets(packets, 'bogus', 'asc').map((p) => p.number)).toEqual([1, 2, 3])
  })
})
