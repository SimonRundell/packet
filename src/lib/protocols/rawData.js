import { ByteWriter } from '../bytes.js'

const PREVIEW_LIMIT = 160

/**
 * Wraps a plain-text (ASCII) byte chunk as a generic "Data" layer, the way
 * Wireshark shows a TCP segment that is part of a larger message but hasn't
 * completed reassembly yet.
 */
export function buildRawTextLayer(text, { name = 'Data (text/plain fragment)' } = {}) {
  const w = new ByteWriter()
  w.ascii(text)
  const bytes = w.toUint8Array()

  const preview = text.length > PREVIEW_LIMIT ? `${text.slice(0, PREVIEW_LIMIT)}…` : text

  return {
    bytes,
    tree: {
      name,
      fields: [
        { label: 'Length', value: `${bytes.length} bytes`, offset: 0, length: bytes.length },
        { label: 'Text', value: preview, offset: 0, length: bytes.length },
      ],
    },
  }
}
