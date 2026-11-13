// Defines the small virtual network that the simulated capture runs on.

export const LOCAL_HOST = {
  name: 'this-machine',
  mac: '3c:22:fb:4a:9e:01',
  ip: '192.168.1.23',
}

export const ROUTER = {
  name: 'router.lan',
  mac: 'f4:5e:ab:10:7c:02',
  ip: '192.168.1.1',
}

export const LAN_HOSTS = [
  { name: 'printer.lan', mac: 'b8:27:eb:7a:11:5d', ip: '192.168.1.45' },
  { name: 'nas.lan', mac: '00:11:32:9c:48:aa', ip: '192.168.1.50' },
  { name: 'phone.lan', mac: 'a4:c3:f0:66:2b:1e', ip: '192.168.1.67' },
]

// Remote hosts the local machine talks to "over the internet". Each entry
// may optionally include a hostname used for DNS lookups.
export const REMOTE_HOSTS = [
  { name: 'example.com', ip: '93.184.216.34', mac: generatedWanMac(1) },
  { name: 'api.example.net', ip: '151.101.65.69', mac: generatedWanMac(2) },
  { name: 'cdn.example.org', ip: '104.21.44.18', mac: generatedWanMac(3) },
  { name: 'mail.example.com', ip: '172.67.142.9', mac: generatedWanMac(4) },
]

export const DNS_SERVER = { name: 'dns.resolver', ip: '8.8.8.8', mac: generatedWanMac(9) }

function generatedWanMac(n) {
  const hex = n.toString(16).padStart(2, '0')
  return `52:54:00:ab:cd:${hex}`
}

export const SERVICE_PORTS = {
  http: 80,
  https: 443,
  dns: 53,
}

// Standard Ethernet MTU (the IPv4 payload budget) and the resulting maximum
// TCP segment size once the IPv4 and TCP headers are accounted for. Used to
// generate bulk-transfer packets that land right at this ceiling.
export const ETHERNET_MTU = 1500
export const TCP_MSS = ETHERNET_MTU - 20 - 20

export function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

let nextEphemeralPort = 49152
export function nextEphemeralPortNumber() {
  nextEphemeralPort += 1
  if (nextEphemeralPort > 65535) nextEphemeralPort = 49152
  return nextEphemeralPort
}
