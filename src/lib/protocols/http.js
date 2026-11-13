import { ByteWriter } from '../bytes.js'

export function buildHttpRequest({ method = 'GET', path, host, userAgent = 'PacketTrace/1.0' }) {
  const lines = [
    `${method} ${path} HTTP/1.1`,
    `Host: ${host}`,
    `User-Agent: ${userAgent}`,
    'Accept: text/html,application/xhtml+xml',
    'Connection: keep-alive',
    '',
    '',
  ]
  const text = lines.join('\r\n')

  const w = new ByteWriter()
  w.ascii(text)

  const fields = [
    { label: 'Request Line', value: lines[0], offset: 0, length: lines[0].length + 2 },
    { label: 'Host', value: host, offset: text.indexOf('Host:'), length: lines[1].length + 2 },
    { label: 'Full request', value: text.trimEnd(), offset: 0, length: text.length },
  ]

  return {
    bytes: w.toUint8Array(),
    tree: { name: 'Hypertext Transfer Protocol', fields },
  }
}

export function buildHttpResponse({ status = 200, statusText = 'OK', contentType = 'text/html', body }) {
  const resolvedBody = body ?? '<html><body><h1>It works.</h1></body></html>'
  const lines = [
    `HTTP/1.1 ${status} ${statusText}`,
    `Content-Type: ${contentType}`,
    `Content-Length: ${resolvedBody.length}`,
    'Server: ExampleServer/2.4',
    '',
    '',
  ]
  const text = lines.join('\r\n') + resolvedBody

  const w = new ByteWriter()
  w.ascii(text)

  const fields = [
    { label: 'Status Line', value: lines[0], offset: 0, length: lines[0].length + 2 },
    { label: 'Content-Type', value: contentType, offset: text.indexOf('Content-Type:'), length: lines[1].length + 2 },
    { label: 'Content-Length', value: String(resolvedBody.length), offset: text.indexOf('Content-Length:'), length: lines[2].length + 2 },
    { label: 'Full response', value: text, offset: 0, length: text.length },
  ]

  return {
    bytes: w.toUint8Array(),
    tree: { name: 'Hypertext Transfer Protocol', fields },
  }
}
