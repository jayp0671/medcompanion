export function formatTime(isoOrDateLike, settings) {
  const iso = typeof isoOrDateLike === 'string'
    ? isoOrDateLike
    : new Date(isoOrDateLike).toISOString()
  const { tz, use24h } = settings || {}
  return new Date(iso).toLocaleTimeString([], {
    timeZone: tz || undefined,
    hour: '2-digit',
    minute: '2-digit',
    hour12: use24h ? false : true,
  })
}

export function formatDateTime(iso, settings) {
  const { tz, use24h } = settings || {}
  return new Date(iso).toLocaleString([], {
    timeZone: tz || undefined,
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: use24h ? false : true,
  })
}
