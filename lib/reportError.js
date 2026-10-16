// Tiny client-side error reporter → POST /api/log via sendBeacon (shows up in Vercel
// function logs). Sends only technical details: message, source, line, user agent and
// path — no personal data, no query string or hash.
const MAX_REPORTS = 10   // per page load
const sent = new Set()

export function reportError({ message, source = '', line = 0, kind = 'error' }) {
  if (typeof window === 'undefined' || !navigator.sendBeacon) return
  const msg = String(message ?? '').slice(0, 500)
  if (!msg) return
  const key = `${kind}|${msg}|${source}|${line}`
  if (sent.has(key) || sent.size >= MAX_REPORTS) return   // no repeats, no floods
  sent.add(key)

  const payload = {
    kind,
    message: msg,
    source:  String(source).slice(0, 300),
    line:    Number(line) || 0,
    ua:      navigator.userAgent.slice(0, 300),
    path:    window.location.pathname.slice(0, 200),
  }
  try {
    navigator.sendBeacon('/api/log', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  } catch {}
}
