import { ByteWriter } from '../bytes.js'

function encodeName(writer, hostname) {
  for (const label of hostname.split('.')) {
    writer.u8(label.length)
    writer.ascii(label)
  }
  writer.u8(0)
}

export function buildDnsMessage({ id, isResponse, hostname, answerIp, ttl = 300 }) {
  const w = new ByteWriter()
  w.u16(id)
  w.u16(isResponse ? 0x8180 : 0x0100) // response: QR+RD+RA set; query: RD set
  w.u16(1) // QDCOUNT
  w.u16(isResponse ? 1 : 0) // ANCOUNT
  w.u16(0) // NSCOUNT
  w.u16(0) // ARCOUNT

  const questionStart = w.length
  encodeName(w, hostname)
  w.u16(1) // QTYPE: A
  w.u16(1) // QCLASS: IN
  const questionEnd = w.length

  const fields = [
    { label: 'Transaction ID', value: `0x${id.toString(16).padStart(4, '0')}`, offset: 0, length: 2 },
    { label: 'Flags', value: isResponse ? 'Standard query response' : 'Standard query', offset: 2, length: 2 },
    { label: 'Questions', value: '1', offset: 4, length: 2 },
    { label: 'Answer RRs', value: isResponse ? '1' : '0', offset: 6, length: 2 },
    {
      label: 'Query',
      value: `${hostname}: type A, class IN`,
      offset: questionStart,
      length: questionEnd - questionStart,
    },
  ]

  if (isResponse) {
    const answerStart = w.length
    encodeName(w, hostname)
    w.u16(1) // TYPE: A
    w.u16(1) // CLASS: IN
    w.u32(ttl)
    w.u16(4) // RDLENGTH
    w.ipv4(answerIp)
    const answerEnd = w.length
    fields.push({
      label: 'Answer',
      value: `${hostname}: type A, class IN, addr ${answerIp}`,
      offset: answerStart,
      length: answerEnd - answerStart,
    })
  }

  return {
    bytes: w.toUint8Array(),
    tree: { name: isResponse ? 'Domain Name System (response)' : 'Domain Name System (query)', fields },
  }
}
