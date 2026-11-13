// A plain-text passage used to fill large, near-MTU TCP payloads so the hex
// dump and packet bytes show readable text rather than random filler.

const PASSAGE =
  'Packet capture tools read frames directly off the wire, below the ' +
  'application layer, so every header a protocol stack adds on the way ' +
  'down is still visible on the way back up. An Ethernet frame carries an ' +
  'IPv4 datagram, which carries a TCP segment, which carries whatever the ' +
  'application handed the socket. Reassembling a conversation means ' +
  'walking that chain outward again, one layer at a time, for every frame ' +
  'in the stream. '

/** Repeats the stock passage until it reaches exactly targetLength ASCII bytes. */
export function buildPlainTextBody(targetLength) {
  let text = ''
  while (text.length < targetLength) {
    text += PASSAGE
  }
  return text.slice(0, targetLength)
}
