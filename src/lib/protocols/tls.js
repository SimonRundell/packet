import { ByteWriter } from '../bytes.js'

const CONTENT_TYPES = { handshake: 22, application_data: 23, change_cipher_spec: 20 }
const HANDSHAKE_TYPES = { client_hello: 1, server_hello: 2, certificate: 11, finished: 20 }

function pseudoRandomBytes(count, seed) {
  const out = []
  let state = seed || 1
  for (let i = 0; i < count; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    out.push(state & 0xff)
  }
  return out
}

/**
 * Builds a single TLS record. For handshake records, bodySeed/bodySize fill
 * the handshake body with deterministic filler bytes — this simulation does
 * not perform real cryptography, only the visible record/handshake framing.
 */
export function buildTlsRecord({ recordType, handshakeType, bodySize = 64, seed = 1, sniHost }) {
  const contentType = CONTENT_TYPES[recordType]
  const isHandshake = recordType === 'handshake'

  const w = new ByteWriter()
  const fields = []

  if (isHandshake) {
    const bodyBytes = pseudoRandomBytes(bodySize, seed)
    const handshakeBody = new ByteWriter()
    handshakeBody.u8(HANDSHAKE_TYPES[handshakeType])
    handshakeBody.u8(0)
    handshakeBody.u16(bodySize)
    handshakeBody.bytesRaw(bodyBytes)
    const handshakeBytes = handshakeBody.toUint8Array()

    w.u8(contentType)
    w.u16(0x0303)
    w.u16(handshakeBytes.length)
    const recordHeaderLen = w.length
    w.bytesRaw(handshakeBytes)

    const niceName = {
      client_hello: 'Client Hello',
      server_hello: 'Server Hello',
      certificate: 'Certificate',
      finished: 'Finished',
    }[handshakeType]

    fields.push(
      { label: 'Content Type', value: 'Handshake (22)', offset: 0, length: 1 },
      { label: 'Version', value: 'TLS 1.2 (0x0303)', offset: 1, length: 2 },
      { label: 'Length', value: String(handshakeBytes.length), offset: 3, length: 2 },
      { label: 'Handshake Type', value: `${niceName} (${HANDSHAKE_TYPES[handshakeType]})`, offset: recordHeaderLen, length: 1 },
    )
    if (sniHost && handshakeType === 'client_hello') {
      fields.push({
        label: 'Server Name Indication',
        value: sniHost,
        offset: recordHeaderLen,
        length: handshakeBytes.length,
      })
    }
  } else {
    const bodyBytes = pseudoRandomBytes(bodySize, seed)
    w.u8(contentType)
    w.u16(0x0303)
    w.u16(bodyBytes.length)
    w.bytesRaw(bodyBytes)

    fields.push(
      { label: 'Content Type', value: 'Application Data (23)', offset: 0, length: 1 },
      { label: 'Version', value: 'TLS 1.2 (0x0303)', offset: 1, length: 2 },
      { label: 'Length', value: String(bodyBytes.length), offset: 3, length: 2 },
      { label: 'Encrypted Application Data', value: `${bodyBytes.length} bytes, opaque`, offset: 5, length: bodyBytes.length },
    )
  }

  const recordName = {
    handshake: 'Transport Layer Security (Handshake)',
    application_data: 'Transport Layer Security (Application Data)',
    change_cipher_spec: 'Transport Layer Security (Change Cipher Spec)',
  }[recordType]

  return {
    bytes: w.toUint8Array(),
    tree: { name: recordName, fields },
  }
}
