export function formatRelTime(seconds) {
  return seconds.toFixed(6)
}

export function formatClockTime(epochMs) {
  const d = new Date(epochMs)
  return d.toLocaleTimeString('en-GB', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return `${minutes}m ${rest}s`
}
