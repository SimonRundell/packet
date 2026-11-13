# PacketTrace

PacketTrace is a browser-based simulation of a packet-capture analyzer, styled after Wireshark. It is a teaching and demo tool: there is no real network interface behind it, no raw sockets, nothing is sniffed. Instead it runs a small virtual network in memory and generates realistic, byte-accurate synthetic traffic — ARP resolutions, ICMP pings, DNS lookups, full HTTP sessions and full TLS handshakes — so the three-pane Wireshark workflow (packet list → protocol tree → hex dump) can be explored and taught without needing a live capture, admin privileges, or a network to point it at.

## Contents

- [Quick start](#quick-start)
- [What it simulates](#what-it-simulates)
- [Display filters](#display-filters)
- [Teaching guide](#teaching-guide)
  - [Why use a simulator?](#why-use-a-simulator)
  - [Who it is for and curriculum links](#who-it-is-for-and-curriculum-links)
  - [Learning objectives](#learning-objectives)
  - [Classroom setup](#classroom-setup)
  - [A tour of the interface](#a-tour-of-the-interface)
  - [The virtual network (reference card)](#the-virtual-network-reference-card)
  - [What each conversation looks like](#what-each-conversation-looks-like)
  - [Suggested lesson sequence](#suggested-lesson-sequence)
  - [Student activities](#student-activities)
  - [Answers and teacher notes](#answers-and-teacher-notes)
  - [Common misconceptions to target](#common-misconceptions-to-target)
  - [Differentiation](#differentiation)
  - [Assessment ideas](#assessment-ideas)
  - [How PacketTrace differs from real Wireshark](#how-packettrace-differs-from-real-wireshark)
  - [Moving on to real Wireshark](#moving-on-to-real-wireshark)
  - [Glossary](#glossary)
- [Project layout](#project-layout)
- [Licence](#licence)

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

- Protocol barewords: `tcp`, `udp`, `dns`, `http`, `tls` (or `ssl`), `arp`, `icmp`, `ip`
- Field comparisons: `ip.addr`, `ip.src`, `ip.dst`, `eth.addr`, `eth.src`, `eth.dst`, `tcp.port`, `tcp.srcport`/`dstport`, `udp.port`, `udp.srcport`/`dstport`, `port`, `frame.len`, with `==`/`eq`, `!=`/`ne`, `>`, `<`, `>=`, `<=`
- Combinators: `&&`/`and`, `||`/`or`, `!`/`not`, and parentheses

Click the **?** button next to the filter field for worked examples.

---

# Teaching guide

## Why use a simulator?

Real packet capture in a classroom is awkward: Wireshark needs installing and usually admin rights, college networks often forbid sniffing (and rightly so), most real traffic is now encrypted and noisy, and every student sees something different. PacketTrace removes all of that:

- **Safe and legal.** Nothing is captured. There is no personal data, no one else's traffic, nothing to breach an acceptable-use policy. The status bar says so on every screen: *"Simulated capture — no real network traffic is read or sent."*
- **Runs anywhere.** It is a static web page. Any browser on any device — including Chromebooks and locked-down lab PCs — will run it.
- **Clean, readable traffic.** Only a handful of protocols appear, each as a complete, correctly-ordered conversation, so students can follow a story from start to finish.
- **Real bytes.** The headers are not drawings; they are genuine byte layouts with genuine checksums, so the hex dump tells the truth.
- **The same skills transfer.** The three-pane layout, the colour coding and the filter syntax all match Wireshark, so time spent here is not wasted when students move to the real tool.

## Who it is for and curriculum links

PacketTrace is pitched at learners aged roughly 15–19 and at adult/foundation learners new to networking. It fits:

| Course | Relevant content |
|---|---|
| **GCSE Computer Science** | Protocols (TCP/IP, HTTP, HTTPS), the idea of layers, packets, IP and MAC addresses, encryption at a basic level |
| **A level Computer Science** (AQA / OCR) | TCP/IP stack and the four layers, packet switching, the role of protocols, MAC vs IP addressing, ports and sockets, DNS, client–server model, TLS, hexadecimal |
| **T Level Digital** (Infrastructure / Support / Software) | Network protocols and the OSI/TCP-IP models, troubleshooting tools, security fundamentals |
| **BTEC / Cambridge Technical IT** | Networking units: protocols, addressing, network monitoring and diagnostic tools |
| **Cisco NetAcad / CompTIA Network+ style courses** | Ethernet framing, ARP, ICMP, TCP handshake, UDP vs TCP, common ports, protocol analysis |

Check the exact wording against your own specification; the activities below are written to be adaptable rather than tied to one exam board.

## Learning objectives

By the end of a sequence of lessons using PacketTrace, students should be able to:

1. **Describe** a packet capture as a record of frames, each with a number, timestamp, source, destination, protocol, length and summary.
2. **Explain** encapsulation: how an application message is wrapped in a transport header, then an IP header, then an Ethernet frame.
3. **Match** each layer of the TCP/IP model to the header that implements it in a real packet.
4. **Distinguish** MAC addresses (local, hop-by-hop) from IP addresses (end-to-end), using evidence from the capture.
5. **Explain** what ARP, ICMP, DNS, TCP, UDP, HTTP and TLS each do, and identify each in a capture.
6. **Trace** a TCP connection through its three-way handshake, data transfer and four-way close, and explain sequence and acknowledgement numbers.
7. **Compare** HTTP and HTTPS by showing what an eavesdropper can and cannot read in each.
8. **Use** display filters to isolate traffic by protocol, address, port and size, combining conditions with Boolean logic.
9. **Read** hexadecimal in a hex dump and convert between hex, decimal and ASCII for real header fields.
10. **Explain** the MTU and why large transfers are split into several TCP segments.

## Classroom setup

**Option A — one hosted copy (recommended).** Run `npm run build` and put the contents of `dist/` on any static web host (college intranet, GitHub Pages, a shared drive served over HTTP). Give students the URL. Nothing else is needed on their machines.

**Option B — run locally.** On a machine with Node.js installed: `npm install`, then `npm run dev`, then open <http://localhost:5173>. Use `npm run build` followed by `npm run preview` for a production-like copy.

**Before the lesson:**

- Open the page on the projector and press **Start** for 20–30 seconds so there is traffic to talk about. Press **Stop** to freeze it while you explain.
- Decide whether students work alone or in pairs. Pairs work well: one "drives", one records answers, swapping each activity.
- Print or share the [reference card](#the-virtual-network-reference-card) below. Students find the activities far easier when they can tell at a glance which address belongs to which machine.

**Practical tips:**

- Traffic is random, so no two students will see identical captures. This is a feature: questions should ask students to *find an example of* something, not *look at packet 17*.
- The capture keeps the most recent **800** packets and drops older ones. For a long, careful activity, capture for a minute, press **Stop**, and work on that frozen set.
- **Clear** wipes the packets but keeps the filter, sort order and settings.
- Untick **Auto-scroll** if the list keeps jumping away while students are reading.
- The **Interface** menu (eth0 / wlan0 / lo) only changes the label recorded on each frame; the simulated traffic is the same. It can be changed only while stopped.

## A tour of the interface

```
┌──────────────────────────────────────────────────────────────────┐
│ ▶ Start  ⟲ Clear   Interface [eth0 ▾]   ☑ Auto-scroll   ● Idle   │  Toolbar
├──────────────────────────────────────────────────────────────────┤
│ Filter: [ tcp.port == 443                              ]  ?      │  Filter bar
├──────────────────────────────────────────────────────────────────┤
│ No. Time   Source        Destination   Protocol Length Info      │
│ 41  3.204  192.168.1.23  93.184.216.34 TCP      54     [SYN] ... │  Packet list
│ 42  3.231  93.184.216.34 192.168.1.23  TCP      54     [SYN,ACK] │
├──────────────────────────────────────────────────────────────────┤
│ ▸ Frame 41                                                       │
│ ▸ Ethernet II                                                    │  Details tree
│ ▾ Internet Protocol Version 4                                    │
│     Time to Live: 64                                             │
├──────────────────────────────────────────────────────────────────┤
│ 0000  f4 5e ab 10 7c 02 3c 22 fb 4a 9e 01 08 00 45 00  .^..|<"   │  Hex dump
└──────────────────────────────────────────────────────────────────┘
  eth0 · 120 displayed / 342 captured · Frame 41, 54 bytes            Status bar
```

| Part | What students should notice |
|---|---|
| **Toolbar** | Start/Stop the capture, Clear it, choose an interface label, toggle auto-scroll. |
| **Filter bar** | Type a display filter and the list narrows immediately. Invalid filters are reported rather than silently ignored. **?** shows worked examples. |
| **Packet list** | One row per frame. Click any column heading to sort by it (click again to reverse). Rows are coloured by protocol. Rows can be selected by click or by keyboard (Tab, then Enter/Space). |
| **Details tree** | The selected frame broken into layers, outermost first. Expand a layer to see its fields. |
| **Hex dump** | The raw bytes of the frame. Hover over or click a field in the tree and the bytes it occupies light up. |
| **Status bar** | How many packets are shown vs captured, and the size of the selected frame. |

**Colour key** (mirrors Wireshark's defaults in spirit):

| Colour | Protocol |
|---|---|
| Yellow | ARP |
| Orange | ICMP |
| Mid blue | DNS |
| Pale blue | UDP |
| Lavender | TCP |
| Green | HTTP |
| Purple | TLS |

## The virtual network (reference card)

```
                      ┌───────────────────────── "The Internet" ─────────────────────────┐
                      │  example.com       93.184.216.34                                  │
                      │  api.example.net   151.101.65.69                                  │
  LAN 192.168.1.0/24  │  cdn.example.org   104.21.44.18                                   │
                      │  mail.example.com  172.67.142.9                                   │
                      │  dns.resolver      8.8.8.8   (DNS server)                         │
                      └───────────────────────────────▲──────────────────────────────────┘
                                                      │
 ┌───────────────┐                           ┌────────┴────────┐
 │ this-machine  │───────────────────────────│   router.lan    │
 │ 192.168.1.23  │          Ethernet         │  192.168.1.1    │
 │ 3c:22:fb:4a:9e:01                         │  f4:5e:ab:10:7c:02
 └───────────────┘                           └─────────────────┘
        │
        ├── printer.lan  192.168.1.45  b8:27:eb:7a:11:5d
        ├── nas.lan      192.168.1.50  00:11:32:9c:48:aa
        └── phone.lan    192.168.1.67  a4:c3:f0:66:2b:1e
```

- **This machine** is the computer "running the capture". Every conversation starts or ends here.
- **Ports used:** HTTP 80, HTTPS 443, DNS 53. The local machine uses ephemeral (temporary) client ports counting up from 49153.
- **MTU:** 1500 bytes, so the largest TCP payload (MSS) is 1460 bytes and the largest frame is 1514 bytes.

## What each conversation looks like

PacketTrace generates whole conversations ("scenarios"), chosen at random and interleaved, so packets from different conversations can appear between each other — exactly as in a real capture. Rough frequencies are shown in brackets.

### ARP resolution (≈8%)

```
this-machine → Broadcast    ARP  Who has 192.168.1.1? Tell 192.168.1.23
router.lan   → this-machine ARP  192.168.1.1 is at f4:5e:ab:10:7c:02
```

The request goes to the Ethernet broadcast address `ff:ff:ff:ff:ff:ff` because the sender does not yet know the target's MAC address; the target MAC field inside the ARP message is all zeros. The reply is sent directly (unicast). ARP sits directly on Ethernet — there is **no IP header**. Frame length: 42 bytes.

### ICMP ping (≈13%)

Three to five Echo Request / Echo Reply pairs to the router or to a remote server, roughly one second apart, sharing one identifier and counting the sequence number up. The payload is 32 bytes of repeating letters (`abcdefg…`), which can be read in the hex dump. ICMP rides directly on IP (protocol number 1) — **no ports**.

### DNS lookup (≈17%)

```
192.168.1.23 → 8.8.8.8   DNS  Standard query 0x1a2b A example.com
8.8.8.8      → 192.168.1.23 DNS  Standard query response 0x1a2b A example.com A 93.184.216.34
```

One UDP datagram each way, client port ephemeral → server port 53. The transaction ID ties the response to its query. The hostname appears in DNS's length-prefixed label format (`07 example 03 com 00`) — a nice hex-reading exercise.

### HTTP session (≈25%)

```
[SYN] → [SYN, ACK] ← [ACK] →          three-way handshake
GET /index.html HTTP/1.1 →            request (readable text)
[ACK] ←
HTTP/1.1 200 OK ←                     response (readable text)
[ACK] →
[FIN, ACK] → [ACK] ← [FIN, ACK] ← [ACK] →   four-way close
```

Twelve packets, all on TCP port 80, the request and response fully readable as plain text in the hex dump.

### HTTPS / TLS session (≈25%)

The same TCP handshake and close, on port 443, but in the middle:

```
Client Hello →                (Server Name Indication shows the hostname)
Server Hello ←
Certificate, Server Hello Done ←
Finished →
Application Data →            (encrypted request — unreadable)
Application Data ←            (encrypted response — unreadable)
```

### Bulk HTTP download (≈13%)

An HTTP GET for a text file around 3 KB long. The response is too big for one frame, so it is split into several full-size TCP segments (1460 bytes of payload, 1514 bytes on the wire) followed by a shorter final segment. The first segment carries the HTTP headers; later ones are marked `[TCP segment of a reassembled PDU]`. The body is readable English text explaining packet capture.

## Suggested lesson sequence

Five lessons of about an hour each. Each can stand alone; lessons 1 and 2 are prerequisites for the rest.

### Lesson 1 — What is a packet capture?

- **Starter (10 min):** "When you load a web page, what actually travels down the cable?" Collect ideas. Introduce the parcel-in-a-parcel analogy for encapsulation.
- **Demo (10 min):** Start a capture on the projector. Stop it. Walk through the toolbar, the three panes and the colour key. Click one HTTP packet and expand each layer in turn.
- **Activity (30 min):** [Activity 1](#activity-1--first-look) and [Activity 2](#activity-2--layers-and-encapsulation).
- **Plenary (10 min):** Students label the four TCP/IP layers on a diagram of a packet using names they saw in the details tree.

### Lesson 2 — Addresses: MAC, IP and ports

- **Starter:** "Your postal address and your name — which changes if you move house?" Link to IP vs MAC.
- **Activity:** [Activity 3](#activity-3--mac-addresses-versus-ip-addresses), [Activity 4](#activity-4--arp-who-has) and [Activity 5](#activity-5--ports-and-sockets).
- **Plenary:** Exit ticket — "Why does the destination MAC address of a packet to example.com belong to the router?"

### Lesson 3 — TCP: reliable connections

- **Starter:** The phone-call analogy: "Hello?" / "Hello, I can hear you" / "Great, let's talk" — then a goodbye from each side.
- **Activity:** [Activity 7](#activity-7--the-tcp-three-way-handshake), [Activity 8](#activity-8--sequence-and-acknowledgement-numbers) and [Activity 10](#activity-10--mtu-and-segmentation).
- **Plenary:** Compare with DNS over UDP ([Activity 6](#activity-6--dns-and-udp)): what does UDP skip, and why is that fine for DNS?

### Lesson 4 — HTTP vs HTTPS

- **Starter:** "Is it safe to type your password into a website on café Wi-Fi?"
- **Activity:** [Activity 9](#activity-9--http-versus-https).
- **Discussion:** What does HTTPS hide? What does it *not* hide (IP addresses, ports, timings, sizes, the hostname in SNI)? Link to privacy and the role of encryption.
- **Plenary:** Students write a two-sentence explanation of HTTPS for a younger sibling.

### Lesson 5 — Filters, hex and investigation

- **Starter:** Quick Boolean logic recap: AND, OR, NOT.
- **Activity:** [Activity 11](#activity-11--display-filters), [Activity 12](#activity-12--reading-hex) and the [investigation challenge](#activity-13--investigation-challenge).
- **Plenary:** Pairs swap their best filter with another pair, who must predict what it shows before trying it.

## Student activities

Activities are written to be copied straight onto a worksheet. Answers follow in the [next section](#answers-and-teacher-notes).

### Activity 1 — First look

Press **Start**, wait 30 seconds, then press **Stop**.

1. How many packets have you captured? (Look at the status bar.)
2. Name four different protocols in the Protocol column.
3. Which colour is used for DNS? Which for TLS?
4. Click the **Length** column heading. What is the largest packet? What is the smallest?
5. Click the **No.** heading to put the list back in order. Why might numbers be missing if you capture for a long time?

### Activity 2 — Layers and encapsulation

Select any **HTTP** packet.

1. List the layers in the details tree, in order from top to bottom.
2. Match each layer to the TCP/IP model: Link, Internet, Transport, Application.
3. Expand **Ethernet II** and click **Type**. What value is highlighted in the hex dump? What does it tell the receiver?
4. Expand **Internet Protocol Version 4** and click **Protocol**. What number is it, and what does it mean?
5. Now select an **ARP** packet. Which layers are missing compared with the HTTP packet? Why?
6. Explain in your own words what *encapsulation* means, using this capture as evidence.

### Activity 3 — MAC addresses versus IP addresses

Use the filter `ip.addr == 93.184.216.34` (or any remote server's address that appears in your capture). Select a packet sent **from** this machine.

1. Write down the source and destination **IP** addresses.
2. Expand **Ethernet II**. Write down the source and destination **MAC** addresses.
3. Use the reference card: whose MAC address is the destination? Is it the server's?
4. Explain why the IP destination and MAC destination point at different machines.
5. Now find a packet sent **to** this machine from that server. Whose MAC address is the source?

### Activity 4 — ARP: "Who has…?"

Filter: `arp`

1. What is the destination MAC address of an ARP request? Why is it sent to everyone?
2. In the ARP request's details, what is the **Target MAC Address**? Why?
3. Which machine sends the ARP reply, and is it broadcast or sent to one machine?
4. What does this machine learn from the reply, and what will it do with that information?
5. Try `arp && ip`. Why do you get no results?

### Activity 5 — Ports and sockets

Filter: `tcp.port == 80 || tcp.port == 443`

1. Pick an HTTP packet. What are its source and destination ports? Which one is the well-known server port?
2. Look at several conversations. Does the client port stay the same between conversations? Within one conversation?
3. Write the full *socket pair* for one conversation in the form `IP:port ↔ IP:port`.
4. Why does the client need a different port for every connection?

### Activity 6 — DNS and UDP

Filter: `dns`

1. Which transport protocol carries DNS here? How can you tell from the details tree?
2. What is the server's port number? What is the IP address of the DNS server?
3. Find a query and its response. What links them together? (Hint: look for a matching number.)
4. Which hostname was looked up, and what IP address came back?
5. Click the **Query** field and look at the hex. The hostname has numbers in it that are not dots. What are they?
6. Count the packets in one DNS lookup and one HTTP session. Why does DNS need so few?

### Activity 7 — The TCP three-way handshake

Filter: `tcp.port == 80` and find the start of a conversation (`[SYN]`).

1. Write down the flags of the first three packets of the conversation.
2. Who sends the first packet, client or server?
3. What does SYN mean? What does ACK mean?
4. Select each of the three packets and expand **Transmission Control Protocol**. Click **Flags** — which single byte changes in the hex dump?
5. Find the end of the same conversation. How many packets does it take to close? Why does each side send its own FIN?
6. Why does TCP bother with a handshake at all, when UDP doesn't?

### Activity 8 — Sequence and acknowledgement numbers

Use one HTTP conversation.

1. The Info column says `Seq=0` for the SYN. Expand the TCP layer: what is the *actual* Sequence Number?
2. Write down the server's sequence number in the SYN, ACK. Now look at the client's next ACK. What is its Acknowledgement Number? What is the difference?
3. Find the client's HTTP GET. Note its Sequence Number and the length of its TCP payload. Predict the Acknowledgement Number in the server's next ACK, then check.
4. Explain what an acknowledgement number tells the other side.

### Activity 9 — HTTP versus HTTPS

1. Filter `http`. Select a GET request and look at the hex dump's right-hand (ASCII) column. What can you read?
2. Select the `200 OK` response. What can you read?
3. Filter `tls`. Select an **Application Data** packet. What can you read in the ASCII column now?
4. Select a **Client Hello** and expand the TLS layer. What does **Server Name Indication** show? Why might that matter for privacy?
5. List three things an eavesdropper can still learn about an HTTPS connection, using evidence from the capture.
6. Put the TLS handshake messages in order and explain, in simple terms, the job of the **Certificate** message.

### Activity 10 — MTU and segmentation

Filter: `frame.len > 1000`

1. What is the length of the largest frames? Why does nothing get bigger than this?
2. Expand the IP layer of one of these frames. What is its **Total Length**? Where did the other 14 bytes of the frame go?
3. How many bytes of TCP payload are in a full segment? Show your working from 1514.
4. Find the HTTP response that starts a bulk download. How many segments did it need? Check this against its Content-Length.
5. Why are the later segments labelled `TCP` rather than `HTTP`?

### Activity 11 — Display filters

Write a filter for each, test it, and record how many packets it shows:

1. Only ICMP pings.
2. All traffic to or from the DNS server.
3. All TCP traffic *except* HTTPS.
4. Packets smaller than 60 bytes.
5. HTTP or TLS traffic to example.com only.
6. Everything sent *by* this machine that is not ARP.
7. Explain the difference between `ip.addr == 8.8.8.8` and `ip.src == 8.8.8.8`.
8. Type `tcp.prt == 80` (deliberately misspelt). What happens? Why is that helpful?

### Activity 12 — Reading hex

Select any IPv4 packet.

1. Click **Time to Live** in the details tree. What hex value is highlighted? Convert it to decimal.
2. Click **Version** / **Header Length**. The byte is `45`. Explain what each hex digit means.
3. Click **Source Address**. Convert each of the four highlighted bytes to decimal and check they match the dotted address.
4. Select an HTTP request. Find the bytes `47 45 54`. What do they spell in ASCII?
5. In an Ethernet header, click **Type**. What is the hex value for IPv4? For ARP?

### Activity 13 — Investigation challenge

Capture for two minutes, then stop. Write a short "incident report" about this machine's activity:

- Which remote servers did it contact, and using which protocols?
- For each website visited over plain HTTP, which page was requested?
- For HTTPS sites, what can and can't you tell about what was done?
- Which local devices did it need to find with ARP?
- Which servers did it ping, and roughly what was the round-trip time? (Use the Time column.)
- Support every claim with a frame number and the filter you used to find it.

## Answers and teacher notes

Captures are random, so specific numbers will vary; these are the patterns to look for.

**Activity 1.** Protocols: ARP, ICMP, DNS, TCP, HTTP, TLS. DNS is mid-blue, TLS purple. The largest frames are 1514 bytes (bulk downloads); the smallest are 42-byte ARP frames. Numbers disappear from the start because only the most recent 800 packets are kept.

**Activity 2.** Frame → Ethernet II → Internet Protocol Version 4 → Transmission Control Protocol → Hypertext Transfer Protocol. Link = Ethernet; Internet = IPv4; Transport = TCP; Application = HTTP. *Frame* is not a protocol layer — it is information the capture tool records about the packet. Ethernet type `08 00` = IPv4 (ARP is `08 06`): it tells the receiver which protocol to hand the payload to. IP protocol `06` = TCP (`11` hex = 17 = UDP, `01` = ICMP). ARP has no IP, transport or application layer: it works *below* IP to find MAC addresses on the local network.

**Activity 3.** IP destination = the remote server; Ethernet destination = `f4:5e:ab:10:7c:02`, the **router**. Ethernet only delivers to the next machine on the same local network; IP carries the end-to-end destination across many networks. On the way back, the source MAC is again the router's. This is the single most valuable insight in the tool — spend time on it.

**Activity 4.** Destination `ff:ff:ff:ff:ff:ff` (broadcast) because the sender doesn't know who has the IP address. Target MAC is `00:00:00:00:00:00` — it's the unknown being asked for. The reply is unicast from the device that owns the address. This machine stores the IP→MAC mapping in its ARP cache so it can address Ethernet frames. `arp && ip` gives nothing because ARP packets have no IP header.

**Activity 5.** Server ports 80/443; the client port is ephemeral (49153 upwards), constant within a conversation and new for each conversation. Example socket pair: `192.168.1.23:49158 ↔ 93.184.216.34:80`. A unique client port lets the machine keep several simultaneous connections apart, even to the same server.

**Activity 6.** UDP (the details tree shows *User Datagram Protocol*). Port 53, server 8.8.8.8. The **Transaction ID** links query and response. The numbers in the name are label lengths: `07` "example" `03` "com" `00` (end). DNS needs only two packets because UDP has no handshake or close; if a reply is lost, the client just asks again.

**Activity 7.** `[SYN]`, `[SYN, ACK]`, `[ACK]`; the client starts. SYN = synchronise (start a connection and pick a starting sequence number); ACK = acknowledge received data. The flags byte is at TCP offset 13: `02` (SYN), `12` (SYN+ACK), `10` (ACK). Closing takes four packets because each direction is closed separately. The handshake lets both sides agree starting sequence numbers and confirm the other end is listening before sending data — the basis of TCP's reliability.

**Activity 8.** The real sequence number is a large random value; the Info column shows numbers *relative* to the start (as Wireshark does by default) to make them readable. The client's ACK = server's sequence number + 1 (a SYN counts as one byte). After the GET, the server's ACK = client's sequence + payload length. An acknowledgement number means "I have received everything up to here; send me this byte next". *Teacher note:* the Info column of some later packets shows only flags rather than Seq/Ack, so use the details tree for these questions.

**Activity 9.** HTTP: the request line, `Host`, `User-Agent`, and the full response headers and body are all readable. TLS Application Data: random-looking bytes, nothing readable. SNI shows the hostname being visited — even under HTTPS, an observer can see *which site* you are visiting (though not which page). An eavesdropper can still see: IP addresses, ports, the hostname (SNI), when connections happen, how long they last and how much data moves. The Certificate proves the server's identity so the client knows it isn't talking to an impostor. *Teacher note:* the SNI hostname appears in the details tree, but the handshake bytes in the hex dump are filler, so don't set a task to find the hostname in the hex.

**Activity 10.** 1514 bytes: the Ethernet MTU is 1500 bytes of payload, plus a 14-byte Ethernet header. IP Total Length = 1500; the other 14 bytes are the Ethernet header. Payload = 1514 − 14 (Ethernet) − 20 (IP) − 20 (TCP) = **1460** (the MSS). A ~3 KB response needs three segments (two full, one partial). Later segments carry no HTTP headers — they are just the continuation of the body, which only makes sense once reassembled.

**Activity 11.** Sample answers (others are valid):
1. `icmp`
2. `ip.addr == 8.8.8.8`
3. `tcp && !(tcp.port == 443)` or `tcp and not tcp.port == 443`
4. `frame.len < 60` (ARP frames and bare TCP control packets — 42 and 54 bytes)
5. `(http || tls) && ip.addr == 93.184.216.34`
6. `eth.src == 3c:22:fb:4a:9e:01 && !arp` or `ip.src == 192.168.1.23` (ask students why these two are *nearly* the same)
7. `ip.addr` matches either end; `ip.src` only the sender — so the first includes queries *and* replies.
8. The filter bar reports an unknown field rather than silently showing nothing, so you know the filter is wrong rather than that there is no matching traffic.

*Teacher note:* in this simulator `tcp.port` and `udp.port` both look at whichever transport header is present, so `tcp.port == 53` will match DNS over UDP. Real Wireshark would not. Use it as a stretch question: "Why is `tcp.port == 53 && udp` contradictory in real Wireshark?"

**Activity 12.** TTL `40` hex = 64. `45`: `4` = IP version 4, `5` = header length in 32-bit words (5 × 4 = 20 bytes). Each address byte converts to one dotted number (e.g. `c0 a8 01 17` = 192.168.1.23). `47 45 54` = "GET". Ethernet type: IPv4 `08 00`, ARP `08 06`.

**Activity 13.** Assess on use of evidence: every claim should cite a frame number and filter. Strong answers note that HTTP paths are visible but HTTPS paths are not, use the DNS responses to name IP addresses, and calculate ping round-trip times by subtracting request time from reply time.

## Common misconceptions to target

| Misconception | How PacketTrace challenges it |
|---|---|
| "A packet goes straight from my computer to the website." | Activity 3: the Ethernet destination is the router, not the server. |
| "MAC and IP addresses do the same job." | Compare the Ethernet and IP layers of the same packet; ARP exists to translate between them. |
| "The internet uses domain names." | Every packet carries an IP address; names only appear inside DNS (and HTTP Host / TLS SNI). |
| "HTTPS hides everything." | IPs, ports, sizes, timings and the SNI hostname all remain visible. |
| "HTTP means the data is encrypted a bit." | The HTTP request is readable byte-for-byte in the hex dump. |
| "Ports are physical sockets on the computer." | Ports are just 16-bit numbers in a header; the client picks a new one per connection. |
| "TCP sends one packet per message." | Bulk downloads are split into many segments; small messages still need handshake and close packets. |
| "Every packet is TCP." | DNS uses UDP; ARP and ICMP use neither. |
| "Hex is a different kind of data." | Hex is just a way of writing bytes; the same bytes appear as hex, decimal fields and ASCII text. |
| "Layers are a theory, not something real." | Clicking each layer highlights a real, separate block of bytes in the hex dump. |

## Differentiation

**Support:**

- Give students the reference card and colour key on paper.
- Start with fixed filters typed for them (`http`, `dns`, `arp`) before asking them to write their own.
- Use Activities 1, 2, 4 and 9 as a core set; they rely on reading rather than calculating.
- Provide a partly-completed encapsulation diagram to fill in.
- Pair less confident students with a "driver" role so they can focus on recording what they see.

**Stretch:**

- Activities 8, 10 and 12 involve calculation and hex conversion.
- Ask students to verify the IPv4 header checksum by hand (add the ten 16-bit words using one's-complement arithmetic — the result should be `ffff`).
- Ask why a ping reply from example.com arrives with the *router's* MAC address as its source, or why the TTL is always 64 here when it would be lower on real packets arriving from the internet.
- Ask students to critique the simulator using the [differences list](#how-packettrace-differs-from-real-wireshark): what is missing, and what would a real capture show?
- For programming students: read `src/lib/scenarios.js` and design a new scenario (e.g. a failed connection with `RST`, or a DNS lookup followed by HTTP to the resolved address). The `src/lib/protocols/` builders are short and well commented.

## Assessment ideas

**Quick-fire / exit tickets:**

- What layer does each of these belong to: MAC address, port number, IP address, `GET /`?
- Why is an ARP request sent to `ff:ff:ff:ff:ff:ff`?
- Name the three packets of a TCP handshake in order.
- Which port does HTTPS use? DNS?
- What can an eavesdropper see in an HTTPS connection?

**Exam-style questions:**

1. *A student captures a packet sent from their computer to a web server. The destination MAC address belongs to the router, but the destination IP address belongs to the web server. Explain why.* (3 marks)
2. *Describe the steps of a TCP three-way handshake and explain why it is needed.* (4 marks)
3. *Explain how DNS is used before a web page can be requested, and why DNS uses UDP rather than TCP.* (4 marks)
4. *A frame is 1514 bytes long. State the size of each header and calculate the maximum size of the application data it can carry.* (3 marks)
5. *Compare what is visible to an observer for an HTTP request and an HTTPS request.* (6 marks)

**Practical assessment:** give students a printed screenshot of a capture (or have them capture their own and screenshot it) and ask them to annotate every column and every layer, then write three filters and explain what each would show.

## How PacketTrace differs from real Wireshark

Being honest about simplifications is itself good teaching. PacketTrace deliberately leaves out:

- **Real traffic.** All traffic is synthetic. There is no loss, retransmission, reordering, congestion, `RST`, or failed connection.
- **TCP options.** Real SYN packets carry options (MSS, window scaling, SACK, timestamps); here every TCP header is the minimum 20 bytes, and window sizes are fixed.
- **A simplified TLS 1.2 handshake.** Real handshakes also include Client Key Exchange and Change Cipher Spec messages, and most modern sites use TLS 1.3, which looks different again. Handshake contents are filler bytes, not real cryptography or certificates.
- **No IPv6, no DHCP, no Wi-Fi (802.11) headers, no QUIC/HTTP3.** The *wlan0* interface label is cosmetic.
- **TTL is always 64**, even on packets "from the internet" where a real TTL would have been reduced by each router.
- **No ARP before every conversation.** In reality this machine would need the router's MAC before sending anything off-LAN; here ARP is just another random scenario.
- **No Ethernet padding or frame check sequence**, so small frames show their true header length (e.g. 42 bytes for ARP).
- **Filters are a subset.** Only the fields listed under [Display filters](#display-filters) work, and `tcp.port`/`udp.port` match either transport.
- **No saving or loading `.pcap` files**, no "Follow TCP Stream", no statistics windows.

## Moving on to real Wireshark

When students are confident here, the transition is smooth:

1. Show the same three-pane layout in Wireshark itself (on a teacher machine, on a network you are authorised to capture).
2. Open a sample capture from the Wireshark project's public *SampleCaptures* collection rather than capturing live — they are designed for teaching and contain no one's private data.
3. Reuse the same filters: everything learned in PacketTrace works in Wireshark.
4. Point out what is new: TCP options, TLS 1.3, IPv6, retransmissions, QUIC.

**Always remind students:** capturing traffic on a network you don't own or haven't been given permission to monitor may break the law (in the UK, the Computer Misuse Act 1990 and the Investigatory Powers Act 2016) and your college's acceptable-use policy. PacketTrace exists so they can learn these skills without that risk.

## Glossary

| Term | Meaning |
|---|---|
| **ACK** | TCP flag: "I have received your data up to this point". |
| **ARP** | Address Resolution Protocol — finds the MAC address for an IP address on the local network. |
| **Broadcast** | A message to every device on the local network (`ff:ff:ff:ff:ff:ff`). |
| **Checksum** | A number calculated from the bytes of a header, used to detect corruption. |
| **DNS** | Domain Name System — turns hostnames into IP addresses. |
| **Encapsulation** | Wrapping data from one layer inside the header of the layer below. |
| **Ephemeral port** | A temporary port number chosen by the client for one connection. |
| **Ethernet frame** | The link-layer unit sent on a local network, addressed by MAC address. |
| **FIN** | TCP flag: "I have finished sending". |
| **Hex dump** | The raw bytes of a packet written in hexadecimal, with an ASCII view alongside. |
| **HTTP / HTTPS** | The web's request–response protocol; HTTPS is HTTP inside TLS encryption. |
| **ICMP** | Internet Control Message Protocol — used by `ping` to test reachability. |
| **IP address** | A logical, end-to-end address used to route packets between networks. |
| **MAC address** | A hardware address used for delivery on one local network. |
| **MSS** | Maximum Segment Size — the largest TCP payload in one segment (1460 bytes here). |
| **MTU** | Maximum Transmission Unit — the largest IP packet a link can carry (1500 bytes). |
| **Port** | A 16-bit number identifying which application on a host a segment is for. |
| **Segment** | A TCP unit of data (UDP's equivalent is a *datagram*). |
| **Sequence number** | TCP's count of bytes sent, used to order data and detect loss. |
| **SNI** | Server Name Indication — the hostname a TLS client asks for, sent unencrypted. |
| **SYN** | TCP flag: "let's start a connection". |
| **TCP** | Transmission Control Protocol — reliable, ordered, connection-based transport. |
| **TLS** | Transport Layer Security — encrypts and authenticates a connection. |
| **TTL** | Time to Live — a hop count that stops packets circulating forever. |
| **UDP** | User Datagram Protocol — fast, connectionless transport with no guarantees. |

---

## Project layout

```
src/
  lib/protocols/   byte-level builders for each protocol (ethernet, ip, tcp, udp, icmp, arp, dns, http, tls)
  lib/             packet composition, the filter engine, hex/byte helpers, the scenario generator
  hooks/           useCapture (the discrete-event traffic engine), useResizableLayout (pane dividers)
  state/           reducer + context holding captured packets, selection, filter text, UI state
  components/      Toolbar, FilterBar, PacketListPane, DetailsPane, HexDumpPane, StatusBar
  config/          the virtual network's hosts/ports and the protocol colour palette
  content/         filter cheat-sheet examples and the sample text used for bulk transfers
```

To change the virtual network, edit `src/config/network.js`. To change how often each kind of conversation appears, edit the `weight` values in the `SCENARIOS` list at the bottom of `src/lib/scenarios.js`.

## Licence

This software is released under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International licence.

- **You may** copy and share the material, and adapt or build on it.
- **Attribution:** you must credit Simon Rundell, link to the licence, and say if you changed anything.
- **NonCommercial:** you may not use it for commercial purposes.
- **ShareAlike:** if you adapt it, you must release your version under the same licence.
- No extra legal or technical restrictions may be added.

Full licence: https://creativecommons.org/licenses/by-nc-sa/4.0/
