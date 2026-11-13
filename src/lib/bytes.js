// Low-level helpers for building and inspecting synthetic packet byte streams.

/** Append-only byte buffer used by protocol layer builders. */
export class ByteWriter {
  constructor() {
    this.bytes = []
  }

  u8(value) {
    this.bytes.push(value & 0xff)
    return this
  }

  u16(value) {
    this.bytes.push((value >> 8) & 0xff, value & 0xff)
    return this
  }

  u32(value) {
    this.bytes.push(
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff,
    )
    return this
  }

  bytesRaw(arr) {
    for (const b of arr) this.bytes.push(b & 0xff)
    return this
  }

  ascii(str) {
    for (let i = 0; i < str.length; i++) this.bytes.push(str.charCodeAt(i) & 0xff)
    return this
  }

  mac(macStr) {
    return this.bytesRaw(macToBytes(macStr))
  }

  ipv4(ipStr) {
    return this.bytesRaw(ipToBytes(ipStr))
  }

  get length() {
    return this.bytes.length
  }

  toUint8Array() {
    return Uint8Array.from(this.bytes)
  }
}

export function macToBytes(mac) {
  return mac.split(':').map((h) => parseInt(h, 16))
}

export function bytesToMac(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(':')
}

export function ipToBytes(ip) {
  return ip.split('.').map((o) => parseInt(o, 10) & 0xff)
}

export function bytesToIp(bytes) {
  return Array.from(bytes).join('.')
}

/**
 * Internet checksum (RFC 1071) used by IPv4, TCP, UDP and ICMP headers.
 * Operates on a plain array/Uint8Array of bytes and returns a 16-bit value.
 */
export function internetChecksum(bytes) {
  let sum = 0
  for (let i = 0; i < bytes.length; i += 2) {
    const hi = bytes[i]
    const lo = i + 1 < bytes.length ? bytes[i + 1] : 0
    sum += (hi << 8) | lo
    if (sum > 0xffff) sum = (sum & 0xffff) + 1
  }
  return (~sum) & 0xffff
}

export function toHexByte(n) {
  return n.toString(16).padStart(2, '0')
}

/** Splits a full packet's bytes into 16-byte rows for the hex dump pane. */
export function chunkForHexDump(bytes, rowSize = 16) {
  const rows = []
  for (let offset = 0; offset < bytes.length; offset += rowSize) {
    rows.push({
      offset,
      bytes: bytes.slice(offset, offset + rowSize),
    })
  }
  return rows
}

export function byteToPrintableAscii(b) {
  return b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.'
}
