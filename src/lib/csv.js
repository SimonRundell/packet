import { formatRelTime } from './format.js'

const CSV_COLUMNS = [
  { label: 'No.', value: (p) => p.number },
  { label: 'Time', value: (p) => formatRelTime(p.relTime) },
  { label: 'Source', value: (p) => p.srcAddr },
  { label: 'Destination', value: (p) => p.dstAddr },
  { label: 'Protocol', value: (p) => p.protocol },
  { label: 'Length', value: (p) => p.length },
  { label: 'Info', value: (p) => p.info },
]

function escapeCsvField(value) {
  const text = value == null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function packetsToCsv(packets) {
  const rows = [CSV_COLUMNS.map((c) => c.label), ...packets.map((p) => CSV_COLUMNS.map((c) => c.value(p)))]
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n') + '\r\n'
}

export function downloadCsv(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function csvFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `packettrace-${stamp}.csv`
}
