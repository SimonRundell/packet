// Each scenario models a short, realistic "conversation" between simulated
// hosts (an ARP resolution, a ping, a DNS lookup, a full HTTP or HTTPS
// session...) as a flat list of packet events, each carrying a delay
// relative to the *previous* event in the scenario. The capture engine
// (hooks/useCapture.js) drains these events over time and turns each one
// into a finished packet via lib/packetBuilder.js.

import { buildEthernetFrame } from './protocols/ethernet.js'
import { buildIPv4Header } from './protocols/ip.js'
import { buildTcpSegment } from './protocols/tcp.js'
import { buildUdpDatagram } from './protocols/udp.js'
import { buildIcmpMessage } from './protocols/icmp.js'
import { buildArpMessage } from './protocols/arp.js'
import { buildDnsMessage } from './protocols/dns.js'
import { buildHttpRequest, buildHttpResponse } from './protocols/http.js'
import { buildTlsRecord } from './protocols/tls.js'
import { buildRawTextLayer } from './protocols/rawData.js'
import { buildPlainTextBody } from '../content/sampleText.js'
import {
  LOCAL_HOST,
  ROUTER,
  LAN_HOSTS,
  REMOTE_HOSTS,
  DNS_SERVER,
  SERVICE_PORTS,
  TCP_MSS,
  pickRandom,
  nextEphemeralPortNumber,
} from '../config/network.js'

const BROADCAST_MAC = 'ff:ff:ff:ff:ff:ff'

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function totalBytes(parts) {
  return parts.reduce((sum, p) => sum + p.bytes.length, 0)
}

/** Wraps a transport-layer part (+ optional application layers) in IPv4 + Ethernet. */
function wrapIp({ srcMac, dstMac, srcIp, dstIp, protocol, transport, appLayers = [] }) {
  const payloadLength = transport.bytes.length + totalBytes(appLayers)
  const ip = buildIPv4Header({
    srcIp,
    dstIp,
    protocol,
    payloadLength,
    identification: randomInt(1, 0xffff),
  })
  const eth = buildEthernetFrame({ srcMac, dstMac, payloadType: 'ip' })
  return [eth, ip, transport, ...appLayers]
}

/**
 * Shared machinery behind every TCP-based scenario: tracks each side's
 * sequence number across the conversation and emits one finished event per
 * `addTcp(...)` call, addressed between the local host and `target` on
 * `srcPort ↔ dstPort`.
 */
function createTcpSession(target, srcPort, dstPort) {
  let clientSeq = randomInt(1_000_000, 4_000_000_000)
  let serverSeq = randomInt(1_000_000, 4_000_000_000)
  const events = []

  function addTcp({ delayMs, from, flags, payloadBytes = [], appLayers = [], info, protocol = 'TCP' }) {
    const isClient = from === 'client'
    const srcIp = isClient ? LOCAL_HOST.ip : target.ip
    const dstIp = isClient ? target.ip : LOCAL_HOST.ip
    const seq = isClient ? clientSeq : serverSeq
    const ack = isClient ? serverSeq : clientSeq

    const tcp = buildTcpSegment({
      srcIp,
      dstIp,
      srcPort: isClient ? srcPort : dstPort,
      dstPort: isClient ? dstPort : srcPort,
      seq,
      ack,
      flags,
      payloadBytes,
    })

    events.push({
      delayMs,
      protocol,
      srcAddr: srcIp,
      dstAddr: dstIp,
      info,
      layerParts: wrapIp({
        srcMac: isClient ? LOCAL_HOST.mac : ROUTER.mac,
        dstMac: isClient ? ROUTER.mac : LOCAL_HOST.mac,
        srcIp,
        dstIp,
        protocol: 'tcp',
        transport: tcp,
        appLayers,
      }),
    })

    const advance = payloadBytes.length + (flags.syn || flags.fin ? 1 : 0)
    if (isClient) clientSeq += advance
    else serverSeq += advance
  }

  return { events, addTcp }
}

export function arpResolutionScenario() {
  const target = Math.random() < 0.5 ? ROUTER : pickRandom(LAN_HOSTS)

  const request = buildArpMessage({
    opcode: 1,
    senderMac: LOCAL_HOST.mac,
    senderIp: LOCAL_HOST.ip,
    targetMac: '00:00:00:00:00:00',
    targetIp: target.ip,
  })
  const requestEth = buildEthernetFrame({ srcMac: LOCAL_HOST.mac, dstMac: BROADCAST_MAC, payloadType: 'arp' })

  const reply = buildArpMessage({
    opcode: 2,
    senderMac: target.mac,
    senderIp: target.ip,
    targetMac: LOCAL_HOST.mac,
    targetIp: LOCAL_HOST.ip,
  })
  const replyEth = buildEthernetFrame({ srcMac: target.mac, dstMac: LOCAL_HOST.mac, payloadType: 'arp' })

  return [
    {
      delayMs: 0,
      protocol: 'ARP',
      srcAddr: LOCAL_HOST.mac,
      dstAddr: 'Broadcast',
      info: `Who has ${target.ip}? Tell ${LOCAL_HOST.ip}`,
      layerParts: [requestEth, request],
    },
    {
      delayMs: randomInt(2, 9),
      protocol: 'ARP',
      srcAddr: target.mac,
      dstAddr: LOCAL_HOST.mac,
      info: `${target.ip} is at ${target.mac}`,
      layerParts: [replyEth, reply],
    },
  ]
}

export function icmpPingScenario() {
  const useRemote = Math.random() < 0.6
  const target = useRemote ? pickRandom(REMOTE_HOSTS) : ROUTER
  const identifier = randomInt(1, 0xffff)
  const pingCount = randomInt(3, 5)
  const payload = Array.from({ length: 32 }, (_, i) => 0x61 + (i % 23))

  const events = []
  for (let seq = 1; seq <= pingCount; seq++) {
    const request = buildIcmpMessage({ type: 8, identifier, sequence: seq, payloadBytes: payload })
    events.push({
      delayMs: seq === 1 ? 0 : randomInt(700, 1100),
      protocol: 'ICMP',
      srcAddr: LOCAL_HOST.ip,
      dstAddr: target.ip,
      info: `Echo (ping) request  id=0x${identifier.toString(16)}, seq=${seq}/${pingCount}`,
      layerParts: wrapIp({
        srcMac: LOCAL_HOST.mac,
        dstMac: ROUTER.mac,
        srcIp: LOCAL_HOST.ip,
        dstIp: target.ip,
        protocol: 'icmp',
        transport: request,
      }),
    })

    const reply = buildIcmpMessage({ type: 0, identifier, sequence: seq, payloadBytes: payload })
    events.push({
      delayMs: randomInt(8, 60),
      protocol: 'ICMP',
      srcAddr: target.ip,
      dstAddr: LOCAL_HOST.ip,
      info: `Echo (ping) reply  id=0x${identifier.toString(16)}, seq=${seq}/${pingCount}`,
      layerParts: wrapIp({
        srcMac: ROUTER.mac,
        dstMac: LOCAL_HOST.mac,
        srcIp: target.ip,
        dstIp: LOCAL_HOST.ip,
        protocol: 'icmp',
        transport: reply,
      }),
    })
  }

  return events
}

export function dnsLookupScenario() {
  const target = pickRandom(REMOTE_HOSTS)
  const id = randomInt(1, 0xffff)
  const srcPort = nextEphemeralPortNumber()

  const query = buildDnsMessage({ id, isResponse: false, hostname: target.name })
  const queryUdp = buildUdpDatagram({
    srcIp: LOCAL_HOST.ip,
    dstIp: DNS_SERVER.ip,
    srcPort,
    dstPort: SERVICE_PORTS.dns,
    payloadBytes: Array.from(query.bytes),
  })

  const response = buildDnsMessage({ id, isResponse: true, hostname: target.name, answerIp: target.ip })
  const responseUdp = buildUdpDatagram({
    srcIp: DNS_SERVER.ip,
    dstIp: LOCAL_HOST.ip,
    srcPort: SERVICE_PORTS.dns,
    dstPort: srcPort,
    payloadBytes: Array.from(response.bytes),
  })

  return [
    {
      delayMs: 0,
      protocol: 'DNS',
      srcAddr: LOCAL_HOST.ip,
      dstAddr: DNS_SERVER.ip,
      info: `Standard query 0x${id.toString(16).padStart(4, '0')} A ${target.name}`,
      layerParts: wrapIp({
        srcMac: LOCAL_HOST.mac,
        dstMac: ROUTER.mac,
        srcIp: LOCAL_HOST.ip,
        dstIp: DNS_SERVER.ip,
        protocol: 'udp',
        transport: queryUdp,
        appLayers: [query],
      }),
    },
    {
      delayMs: randomInt(15, 70),
      protocol: 'DNS',
      srcAddr: DNS_SERVER.ip,
      dstAddr: LOCAL_HOST.ip,
      info: `Standard query response 0x${id.toString(16).padStart(4, '0')} A ${target.name} A ${target.ip}`,
      layerParts: wrapIp({
        srcMac: ROUTER.mac,
        dstMac: LOCAL_HOST.mac,
        srcIp: DNS_SERVER.ip,
        dstIp: LOCAL_HOST.ip,
        protocol: 'udp',
        transport: responseUdp,
        appLayers: [response],
      }),
    },
  ]
}

export function tcpHttpSessionScenario() {
  const target = pickRandom(REMOTE_HOSTS)
  const srcPort = nextEphemeralPortNumber()
  const dstPort = SERVICE_PORTS.http
  const { events, addTcp } = createTcpSession(target, srcPort, dstPort)

  const port = `${srcPort} → ${dstPort}`
  const portBack = `${dstPort} → ${srcPort}`

  addTcp({ delayMs: 0, from: 'client', flags: { syn: true }, info: `${port} [SYN] Seq=0 Win=64240` })
  addTcp({ delayMs: randomInt(15, 45), from: 'server', flags: { syn: true, ack: true }, info: `${portBack} [SYN, ACK] Seq=0 Ack=1 Win=65160` })
  addTcp({ delayMs: randomInt(1, 5), from: 'client', flags: { ack: true }, info: `${port} [ACK] Seq=1 Ack=1 Win=64240` })

  const path = pickRandom(['/', '/index.html', '/api/status', '/favicon.ico'])
  const request = buildHttpRequest({ path, host: target.name })
  addTcp({
    delayMs: randomInt(3, 12),
    from: 'client',
    flags: { ack: true, psh: true },
    payloadBytes: Array.from(request.bytes),
    appLayers: [request],
    info: `${port} GET ${path} HTTP/1.1`,
    protocol: 'HTTP',
  })

  addTcp({ delayMs: randomInt(1, 4), from: 'server', flags: { ack: true }, info: `${portBack} [ACK] Seq=1 Ack=${request.bytes.length + 1} Win=65160` })

  const response = buildHttpResponse({})
  addTcp({
    delayMs: randomInt(20, 90),
    from: 'server',
    flags: { ack: true, psh: true },
    payloadBytes: Array.from(response.bytes),
    appLayers: [response],
    info: `${portBack} HTTP/1.1 200 OK`,
    protocol: 'HTTP',
  })

  addTcp({ delayMs: randomInt(1, 5), from: 'client', flags: { ack: true }, info: `${port} [ACK] Win=64240` })
  addTcp({ delayMs: randomInt(50, 250), from: 'client', flags: { fin: true, ack: true }, info: `${port} [FIN, ACK] Win=64240` })
  addTcp({ delayMs: randomInt(1, 5), from: 'server', flags: { ack: true }, info: `${portBack} [ACK]` })
  addTcp({ delayMs: randomInt(1, 6), from: 'server', flags: { fin: true, ack: true }, info: `${portBack} [FIN, ACK]` })
  addTcp({ delayMs: randomInt(1, 5), from: 'client', flags: { ack: true }, info: `${port} [ACK]` })

  return events
}

export function tlsHttpsSessionScenario() {
  const target = pickRandom(REMOTE_HOSTS)
  const srcPort = nextEphemeralPortNumber()
  const dstPort = SERVICE_PORTS.https
  let seed = randomInt(1, 1_000_000)
  const { events, addTcp } = createTcpSession(target, srcPort, dstPort)

  const port = `${srcPort} → ${dstPort}`
  const portBack = `${dstPort} → ${srcPort}`

  addTcp({ delayMs: 0, from: 'client', flags: { syn: true }, info: `${port} [SYN] Seq=0 Win=64240` })
  addTcp({ delayMs: randomInt(15, 45), from: 'server', flags: { syn: true, ack: true }, info: `${portBack} [SYN, ACK] Seq=0 Ack=1 Win=65160` })
  addTcp({ delayMs: randomInt(1, 5), from: 'client', flags: { ack: true }, info: `${port} [ACK] Seq=1 Ack=1 Win=64240` })

  const clientHello = buildTlsRecord({ recordType: 'handshake', handshakeType: 'client_hello', bodySize: 180, seed: seed++, sniHost: target.name })
  addTcp({
    delayMs: randomInt(3, 10),
    from: 'client',
    flags: { ack: true, psh: true },
    payloadBytes: Array.from(clientHello.bytes),
    appLayers: [clientHello],
    info: `${port} Client Hello`,
    protocol: 'TLS',
  })

  addTcp({ delayMs: randomInt(1, 4), from: 'server', flags: { ack: true }, info: `${portBack} [ACK]` })

  const serverHello = buildTlsRecord({ recordType: 'handshake', handshakeType: 'server_hello', bodySize: 90, seed: seed++ })
  addTcp({
    delayMs: randomInt(20, 60),
    from: 'server',
    flags: { ack: true, psh: true },
    payloadBytes: Array.from(serverHello.bytes),
    appLayers: [serverHello],
    info: `${portBack} Server Hello`,
    protocol: 'TLS',
  })

  const certificate = buildTlsRecord({ recordType: 'handshake', handshakeType: 'certificate', bodySize: 900, seed: seed++ })
  addTcp({
    delayMs: randomInt(2, 8),
    from: 'server',
    flags: { ack: true, psh: true },
    payloadBytes: Array.from(certificate.bytes),
    appLayers: [certificate],
    info: `${portBack} Certificate, Server Hello Done`,
    protocol: 'TLS',
  })

  addTcp({ delayMs: randomInt(1, 5), from: 'client', flags: { ack: true }, info: `${port} [ACK]` })

  const finishedClient = buildTlsRecord({ recordType: 'handshake', handshakeType: 'finished', bodySize: 48, seed: seed++ })
  addTcp({
    delayMs: randomInt(5, 20),
    from: 'client',
    flags: { ack: true, psh: true },
    payloadBytes: Array.from(finishedClient.bytes),
    appLayers: [finishedClient],
    info: `${port} Finished`,
    protocol: 'TLS',
  })

  addTcp({ delayMs: randomInt(1, 5), from: 'server', flags: { ack: true }, info: `${portBack} [ACK]` })

  const appDataRequest = buildTlsRecord({ recordType: 'application_data', bodySize: 128, seed: seed++ })
  addTcp({
    delayMs: randomInt(2, 10),
    from: 'client',
    flags: { ack: true, psh: true },
    payloadBytes: Array.from(appDataRequest.bytes),
    appLayers: [appDataRequest],
    info: `${port} Application Data`,
    protocol: 'TLS',
  })

  const appDataResponse = buildTlsRecord({ recordType: 'application_data', bodySize: 512, seed: seed++ })
  addTcp({
    delayMs: randomInt(20, 90),
    from: 'server',
    flags: { ack: true, psh: true },
    payloadBytes: Array.from(appDataResponse.bytes),
    appLayers: [appDataResponse],
    info: `${portBack} Application Data`,
    protocol: 'TLS',
  })

  addTcp({ delayMs: randomInt(1, 5), from: 'client', flags: { ack: true }, info: `${port} [ACK]` })
  addTcp({ delayMs: randomInt(100, 400), from: 'client', flags: { fin: true, ack: true }, info: `${port} [FIN, ACK]` })
  addTcp({ delayMs: randomInt(1, 5), from: 'server', flags: { ack: true }, info: `${portBack} [ACK]` })
  addTcp({ delayMs: randomInt(1, 6), from: 'server', flags: { fin: true, ack: true }, info: `${portBack} [FIN, ACK]` })
  addTcp({ delayMs: randomInt(1, 5), from: 'client', flags: { ack: true }, info: `${port} [ACK]` })

  return events
}

/**
 * A plain-text HTTP download whose body is deliberately sized so the first
 * TCP segment lands right at the standard Ethernet MTU (1460 bytes of TCP
 * payload, 1514 bytes on the wire) and the rest of the body follows as
 * further full-size segments.
 */
export function tcpBulkTransferScenario() {
  const target = pickRandom(REMOTE_HOSTS)
  const srcPort = nextEphemeralPortNumber()
  const dstPort = SERVICE_PORTS.http
  const { events, addTcp } = createTcpSession(target, srcPort, dstPort)

  const port = `${srcPort} → ${dstPort}`
  const portBack = `${dstPort} → ${srcPort}`

  addTcp({ delayMs: 0, from: 'client', flags: { syn: true }, info: `${port} [SYN] Seq=0 Win=64240` })
  addTcp({ delayMs: randomInt(15, 45), from: 'server', flags: { syn: true, ack: true }, info: `${portBack} [SYN, ACK] Seq=0 Ack=1 Win=65160` })
  addTcp({ delayMs: randomInt(1, 5), from: 'client', flags: { ack: true }, info: `${port} [ACK] Seq=1 Ack=1 Win=64240` })

  const path = pickRandom(['/report.txt', '/data/export.txt', '/logs/capture.txt'])
  const request = buildHttpRequest({ path, host: target.name })
  addTcp({
    delayMs: randomInt(3, 12),
    from: 'client',
    flags: { ack: true, psh: true },
    payloadBytes: Array.from(request.bytes),
    appLayers: [request],
    info: `${port} GET ${path} HTTP/1.1`,
    protocol: 'HTTP',
  })

  addTcp({
    delayMs: randomInt(1, 4),
    from: 'server',
    flags: { ack: true },
    info: `${portBack} [ACK] Seq=1 Ack=${request.bytes.length + 1} Win=65160`,
  })

  // Comfortably more than one MSS, so the transfer spans several near-MTU segments.
  const bodyLength = TCP_MSS * 2 + randomInt(80, 500)
  const body = buildPlainTextBody(bodyLength)
  const response = buildHttpResponse({ contentType: 'text/plain; charset=us-ascii', body })

  const chunks = []
  for (let offset = 0; offset < response.bytes.length; offset += TCP_MSS) {
    chunks.push(response.bytes.slice(offset, offset + TCP_MSS))
  }

  chunks.forEach((chunk, i) => {
    const isFirst = i === 0
    const appLayer = isFirst
      ? {
          bytes: chunk,
          tree: {
            name: 'Hypertext Transfer Protocol',
            fields: response.tree.fields.filter((f) => f.offset + f.length <= chunk.length),
          },
        }
      : buildRawTextLayer(String.fromCharCode(...chunk), { name: `Data (TCP segment ${i + 1} of ${chunks.length})` })

    addTcp({
      delayMs: isFirst ? randomInt(20, 90) : randomInt(1, 4),
      from: 'server',
      flags: { ack: true, psh: true },
      payloadBytes: Array.from(chunk),
      appLayers: [appLayer],
      info: isFirst
        ? `${portBack} HTTP/1.1 200 OK  (text/plain, ${response.bytes.length} bytes, ${chunks.length} segments)`
        : `${portBack} [PSH, ACK] Len=${chunk.length}  [TCP segment of a reassembled PDU]`,
      protocol: isFirst ? 'HTTP' : 'TCP',
    })
  })

  addTcp({ delayMs: randomInt(5, 20), from: 'client', flags: { ack: true }, info: `${port} [ACK] Win=64240` })
  addTcp({ delayMs: randomInt(50, 250), from: 'client', flags: { fin: true, ack: true }, info: `${port} [FIN, ACK] Win=64240` })
  addTcp({ delayMs: randomInt(1, 5), from: 'server', flags: { ack: true }, info: `${portBack} [ACK]` })
  addTcp({ delayMs: randomInt(1, 6), from: 'server', flags: { fin: true, ack: true }, info: `${portBack} [FIN, ACK]` })
  addTcp({ delayMs: randomInt(1, 5), from: 'client', flags: { ack: true }, info: `${port} [ACK]` })

  return events
}

export const SCENARIOS = [
  { weight: 2, build: arpResolutionScenario },
  { weight: 3, build: icmpPingScenario },
  { weight: 4, build: dnsLookupScenario },
  { weight: 6, build: tcpHttpSessionScenario },
  { weight: 6, build: tlsHttpsSessionScenario },
  { weight: 3, build: tcpBulkTransferScenario },
]

export function pickScenarioBuilder() {
  const totalWeight = SCENARIOS.reduce((sum, s) => sum + s.weight, 0)
  let roll = Math.random() * totalWeight
  for (const scenario of SCENARIOS) {
    if (roll < scenario.weight) return scenario.build
    roll -= scenario.weight
  }
  return SCENARIOS[0].build
}
