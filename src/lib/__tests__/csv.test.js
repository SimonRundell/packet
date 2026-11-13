import { describe, expect, it } from 'vitest'
import { packetsToCsv, csvFilename } from '../csv.js'

const packet = {
  number: 1,
  relTime: 0.1234567,
  srcAddr: '10.0.0.1',
  dstAddr: '8.8.8.8',
  protocol: 'DNS',
  length: 74,
  info: 'Standard query A example.com',
}

describe('packetsToCsv', () => {
  it('writes a header row matching the packet list columns', () => {
    expect(packetsToCsv([]).split('\r\n')[0]).toBe('No.,Time,Source,Destination,Protocol,Length,Info')
  })

  it('writes one row per packet using the displayed time format', () => {
    const lines = packetsToCsv([packet]).split('\r\n')
    expect(lines[1]).toBe('1,0.123457,10.0.0.1,8.8.8.8,DNS,74,Standard query A example.com')
  })

  it('quotes fields containing commas, quotes or newlines', () => {
    const tricky = { ...packet, info: 'GET /a?x=1,y=2 "quoted"\nnext' }
    const csv = packetsToCsv([tricky])
    expect(csv).toContain('"GET /a?x=1,y=2 ""quoted""\nnext"')
  })

  it('preserves the order of the packets passed in', () => {
    const csv = packetsToCsv([{ ...packet, number: 2 }, { ...packet, number: 1 }])
    expect(csv.split('\r\n').slice(1, 3).map((l) => l.split(',')[0])).toEqual(['2', '1'])
  })
})

describe('csvFilename', () => {
  it('includes a timestamp', () => {
    expect(csvFilename(new Date(2026, 10, 13, 9, 5, 7))).toBe('packettrace-20261113-090507.csv')
  })
})
