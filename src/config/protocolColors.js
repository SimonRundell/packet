// Wireshark-inspired coloring rules: each protocol tag gets a background and
// border tint so the packet list reads at a glance, the way Wireshark's own
// default coloring rules do.

export const PROTOCOL_COLORS = {
  ARP: { bg: '#fdf6b2', border: '#d8c45a' },
  ICMP: { bg: '#ffd9b3', border: '#e0a062' },
  DNS: { bg: '#cde7ff', border: '#7fb2dd' },
  UDP: { bg: '#eaf4ff', border: '#b8d9f5' },
  TCP: { bg: '#ece9ff', border: '#bdb0ee' },
  HTTP: { bg: '#d9f2d0', border: '#99cf85' },
  TLS: { bg: '#f0dcff', border: '#cb9aef' },
}

export function colorsForProtocol(protocol) {
  return PROTOCOL_COLORS[protocol] ?? { bg: '#ffffff', border: '#d0d0d0' }
}
