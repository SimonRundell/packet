import { describe, expect, it } from 'vitest'
import {
  internetChecksum,
  macToBytes,
  bytesToMac,
  ipToBytes,
  bytesToIp,
  chunkForHexDump,
  byteToPrintableAscii,
} from '../bytes.js'

describe('internetChecksum', () => {
  // Well-known IPv4 header checksum example (Wikipedia: "IPv4 header checksum").
  const headerWithChecksum = [
    0x45, 0x00, 0x00, 0x73, 0x00, 0x00, 0x40, 0x00, 0x40, 0x11, 0xb8, 0x61, 0xc0, 0xa8, 0x00, 0x01, 0xc0, 0xa8, 0x00,
    0xc7,
  ]

  it('sums to zero when the real checksum is included', () => {
    expect(internetChecksum(headerWithChecksum)).toBe(0)
  })

  it('recomputes the original checksum when the checksum field is zeroed', () => {
    const zeroed = [...headerWithChecksum]
    zeroed[10] = 0
    zeroed[11] = 0
    expect(internetChecksum(zeroed)).toBe(0xb861)
  })
})

describe('mac/ip conversions', () => {
  it('round-trips a MAC address', () => {
    const mac = 'a4:c3:f0:66:2b:1e'
    expect(bytesToMac(macToBytes(mac))).toBe(mac)
  })

  it('round-trips an IPv4 address', () => {
    const ip = '192.168.1.23'
    expect(bytesToIp(ipToBytes(ip))).toBe(ip)
  })
})

describe('chunkForHexDump', () => {
  it('splits bytes into fixed-size rows with correct offsets', () => {
    const bytes = new Uint8Array(20).map((_, i) => i)
    const rows = chunkForHexDump(bytes, 16)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ offset: 0 })
    expect(rows[0].bytes).toHaveLength(16)
    expect(rows[1]).toMatchObject({ offset: 16 })
    expect(rows[1].bytes).toHaveLength(4)
  })
})

describe('byteToPrintableAscii', () => {
  it('renders printable bytes as their character and others as a dot', () => {
    expect(byteToPrintableAscii(0x41)).toBe('A')
    expect(byteToPrintableAscii(0x00)).toBe('.')
    expect(byteToPrintableAscii(0x7f)).toBe('.')
  })
})
