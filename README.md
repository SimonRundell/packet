# PacketTrace

PacketTrace is a browser-based simulation of a packet-capture analyzer, styled after Wireshark. It is a teaching and demo tool: there is no real network interface behind it, no raw sockets, nothing is sniffed. Instead it runs a small virtual network in memory and generates realistic, byte-accurate synthetic traffic — ARP resolutions, ICMP pings, DNS lookups, full HTTP sessions and full TLS handshakes — so the three-pane Wireshark workflow (packet list → protocol tree → hex dump) can be explored and taught without needing a live capture, admin privileges, or a network to point it at.

## Quick start

```powershell
npm install
npm run dev      # Vite dev server on http://localhost:5173
npm test         # Vitest: protocol-building, filter engine and scenario tests
npm run build    # static site in dist/
```

## What it simulates

Every "packet" is built byte-by-byte by the same kind of code a real stack would use: Ethernet framing, an IPv4 header with a real one's-complement checksum, TCP/UDP headers with real pseudo-header checksums, and application payloads (DNS wire format, raw HTTP/1.1 text, framed TLS records). Clicking a packet shows:

- **Packet list** — colour-coded by protocol, the way Wireshark's default coloring rules work.
- **Details tree** — an expandable Frame → Ethernet → IP → TCP/UDP → application layer breakdown.
- **Hex dump** — the packet's actual bytes; hovering or clicking a field in the tree highlights the exact bytes it occupies.

A small virtual network (one "local machine", a router, a few LAN hosts, a handful of remote servers and a DNS resolver — see `src/config/network.js`) provides consistent, plausible addresses, and `src/lib/scenarios.js` plays out whole conversations (a full TCP three-way handshake → HTTP GET → response → four-way close, for example) rather than isolated, unrelated packets.

## Display filters

The filter bar understands a useful subset of Wireshark's display filter syntax (see `src/lib/filter.js`):

- Protocol barewords: `tcp`, `udp`, `dns`, `http`, `tls`, `arp`, `icmp`, `ip`
- Field comparisons: `ip.addr`, `ip.src`, `ip.dst`, `eth.addr`, `tcp.port`, `tcp.srcport`/`dstport`, `udp.port`, `frame.len`, with `==`/`eq`, `!=`/`ne`, `>`, `<`, `>=`, `<=`
- Combinators: `&&`/`and`, `||`/`or`, `!`/`not`, and parentheses

Click the **?** button next to the filter field for worked examples.

## Project layout

```
src/
  lib/protocols/   byte-level builders for each protocol (ethernet, ip, tcp, udp, icmp, arp, dns, http, tls)
  lib/             packet composition, the filter engine, hex/byte helpers, the scenario generator
  hooks/           useCapture (the discrete-event traffic engine), useResizableLayout (pane dividers)
  state/           reducer + context holding captured packets, selection, filter text, UI state
  components/      Toolbar, FilterBar, PacketListPane, DetailsPane, HexDumpPane, StatusBar
  config/          the virtual network's hosts/ports and the protocol colour palette
```

## Licence

This software is released under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International licence.

- **You may** copy and share the material, and adapt or build on it.
- **Attribution:** you must credit Simon Rundell, link to the licence, and say if you changed anything.
- **NonCommercial:** you may not use it for commercial purposes.
- **ShareAlike:** if you adapt it, you must release your version under the same licence.
- No extra legal or technical restrictions may be added.

Full licence: https://creativecommons.org/licenses/by-nc-sa/4.0/
