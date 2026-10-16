// Client error log sink: validates, truncates and rate-limits beacons from
// lib/reportError.js, then writes them to the function log (Vercel → Logs).
const MAX_BYTES  = 2048
const WINDOW_MS  = 60_000
const PER_WINDOW = 10            // reports per IP per minute
const hits = new Map()           // in-memory, per server instance — good enough here

const FIELDS = { kind: 40, message: 500, source: 300, ua: 300, path: 200 }

function rateLimited(ip) {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 })
    if (hits.size > 5000) hits.clear()   // keep memory bounded
    return false
  }
  entry.count += 1
  return entry.count > PER_WINDOW
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  if (rateLimited(ip)) return new Response(null, { status: 429 })

  const declared = Number(request.headers.get('content-length') || 0)
  if (declared > MAX_BYTES) return new Response(null, { status: 413 })
  const raw = await request.text()
  if (!raw || raw.length > MAX_BYTES) return new Response(null, { status: 413 })

  let body
  try { body = JSON.parse(raw) } catch { return new Response(null, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.message !== 'string' || !body.message.trim()) {
    return new Response(null, { status: 400 })
  }

  const entry = {}
  for (const [key, max] of Object.entries(FIELDS)) {
    if (typeof body[key] === 'string') entry[key] = body[key].slice(0, max)
  }
  entry.line = Number.isFinite(body.line) ? Math.trunc(body.line) : 0
  if (entry.path && !entry.path.startsWith('/')) delete entry.path

  console.error('[client-error]', JSON.stringify(entry))
  return new Response(null, { status: 204 })
}
