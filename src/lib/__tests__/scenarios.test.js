import { describe, expect, it } from 'vitest'
import {
  arpResolutionScenario,
  icmpPingScenario,
  dnsLookupScenario,
  tcpHttpSessionScenario,
  tlsHttpsSessionScenario,
  tcpBulkTransferScenario,
  pickScenarioBuilder,
} from '../scenarios.js'
import { finalizePacket } from '../packetBuilder.js'
import { TCP_MSS } from '../../config/network.js'

const SCENARIOS = {
  arpResolutionScenario,
  icmpPingScenario,
  dnsLookupScenario,
  tcpHttpSessionScenario,
  tlsHttpsSessionScenario,
  tcpBulkTransferScenario,
}

describe.each(Object.entries(SCENARIOS))('%s', (name, build) => {
  it('produces a non-empty, well-formed sequence of events', () => {
    for (let i = 0; i < 10; i++) {
      const events = build()
      expect(events.length).toBeGreaterThan(0)

      let number = 1
      for (const event of events) {
        expect(event.delayMs).toBeGreaterThanOrEqual(0)
        expect(typeof event.protocol).toBe('string')
        expect(typeof event.info).toBe('string')
        expect(event.layerParts.length).toBeGreaterThan(0)

        const packet = finalizePacket({
          layerParts: event.layerParts,
          number: number++,
          timestamp: Date.now(),
          relTime: 0,
          srcAddr: event.srcAddr,
          dstAddr: event.dstAddr,
          protocol: event.protocol,
          info: event.info,
          interfaceName: 'eth0',
        })

        const expectedLength = event.layerParts.reduce((sum, l) => sum + l.bytes.length, 0)
        expect(packet.bytes).toHaveLength(expectedLength)
        expect(packet.layers.length).toBe(event.layerParts.length + 1)
      }
    }
  })
})

describe('tcpBulkTransferScenario', () => {
  function appPayloadLength(event) {
    // layerParts are [ethernet, ip, tcp, ...appLayers]; the app layers carry the segment's text.
    return event.layerParts.slice(3).reduce((sum, l) => sum + l.bytes.length, 0)
  }

  it('produces a segment carrying a full-MTU TCP payload of plain text', () => {
    const events = tcpBulkTransferScenario()
    const dataSegments = events.filter((e) => e.protocol === 'HTTP' || e.info.includes('reassembled'))

    const payloadLengths = dataSegments.map(appPayloadLength)
    expect(Math.max(...payloadLengths)).toBe(TCP_MSS)

    // The frame carrying the full MSS segment should land at the standard max frame size.
    const fullSegment = dataSegments.find((e) => appPayloadLength(e) === TCP_MSS)
    const totalFrameLength = fullSegment.layerParts.reduce((sum, l) => sum + l.bytes.length, 0)
    expect(totalFrameLength).toBe(14 + 20 + 20 + TCP_MSS) // Ethernet + IPv4 + TCP + max payload
  })
})

describe('pickScenarioBuilder', () => {
  it('always returns one of the known scenario builders', () => {
    const known = new Set(Object.values(SCENARIOS))
    for (let i = 0; i < 50; i++) {
      expect(known.has(pickScenarioBuilder())).toBe(true)
    }
  })
})
