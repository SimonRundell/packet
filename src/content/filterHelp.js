export const FILTER_EXAMPLES = [
  { filter: 'tcp', note: 'Only TCP segments (incl. HTTP and TLS)' },
  { filter: 'http', note: 'Only HTTP request/response packets' },
  { filter: 'tls', note: 'Only TLS handshake / application data records' },
  { filter: 'dns', note: 'Only DNS queries and responses' },
  { filter: 'arp || icmp', note: 'ARP or ICMP packets' },
  { filter: 'ip.addr == 93.184.216.34', note: 'Either endpoint matches this address' },
  { filter: 'tcp.port == 443', note: 'Either TCP port matches 443' },
  { filter: 'ip.src == 192.168.1.23 && tcp', note: 'Outbound TCP traffic from this host' },
  { filter: 'frame.len > 500', note: 'Packets larger than 500 bytes' },
  { filter: 'not arp', note: 'Everything except ARP' },
]
