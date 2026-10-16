// Shared progress of the intro-video → hero hand-off:
// p = clamp(main.scrollTop / innerHeight, 0, 1) — 0 on the video, 1 once the hero covers it.
// One passive scroll listener, throttled to one update per animation frame, for every
// subscriber. Reads scroll position only, so it follows goTo tweens, native mobile
// scroll and scrolling back up alike.
const subscribers = new Set()
let scroller = null
let frame = 0
let last = -1
let force = false

function read() {
  if (!scroller) return 0
  return Math.min(Math.max(scroller.scrollTop / window.innerHeight, 0), 1)
}

function flush() {
  frame = 0
  const p = read()
  if (p === last && !force) return   // deep in the page p stays 1 — nothing to do
  last = p
  force = false
  subscribers.forEach(cb => cb(p))
}

function onScroll() {
  if (!frame) frame = requestAnimationFrame(flush)
}

function onResize() {
  force = true   // pixel offsets depend on innerHeight even when p is unchanged
  onScroll()
}

export function subscribeIntroProgress(cb) {
  if (subscribers.size === 0) {
    scroller = document.querySelector('main')
    scroller?.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
  }
  subscribers.add(cb)
  cb(read())

  return () => {
    subscribers.delete(cb)
    if (subscribers.size > 0) return
    scroller?.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    cancelAnimationFrame(frame)
    frame = 0
    last = -1
    scroller = null
  }
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
