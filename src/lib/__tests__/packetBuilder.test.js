import { describe, expect, it } from 'vitest'
import { composeLayers, finalizePacket } from '../packetBuilder.js'

function mockLayer(name, byteValues, fields) {
  return { bytes: Uint8Array.from(byteValues), tree: { name, fields } }
}

describe('composeLayers', () => {
  it('concatenates layer bytes and offsets field positions globally', () => {
    const layerA = mockLayer('A', [1, 2, 3], [{ label: 'x', value: '1', offset: 0, length: 1 }])
    const layerB = mockLayer('B', [4, 5], [{ label: 'y', value: '4', offset: 0, length: 1 }])

    const { bytes, layers } = composeLayers([layerA, layerB])

    expect(Array.from(bytes)).toEqual([1, 2, 3, 4, 5])
    expect(layers[0]).toMatchObject({ name: 'A', offset: 0, length: 3 })
    expect(layers[0].fields[0]).toMatchObject({ offset: 0 })
    expect(layers[1]).toMatchObject({ name: 'B', offset: 3, length: 2 })
    expect(layers[1].fields[0]).toMatchObject({ offset: 3 })
  })
})

describe('finalizePacket', () => {
  it('prepends a synthetic Frame layer covering the whole packet', () => {
    const layerA = mockLayer('A', [9, 9, 9, 9], [{ label: 'x', value: '9', offset: 0, length: 4 }])

    const packet = finalizePacket({
      layerParts: [layerA],
      number: 7,
      timestamp: 123,
      relTime: 0.5,
      srcAddr: '1.1.1.1',
      dstAddr: '2.2.2.2',
      protocol: 'TCP',
      info: 'test',
      interfaceName: 'eth0',
    })

    expect(packet.id).toBe('pkt-7')
    expect(packet.length).toBe(4)
    expect(packet.layers[0].name).toBe('Frame')
    expect(packet.layers[1].name).toBe('A')
    expect(packet.bytes).toHaveLength(4)
  })
})
