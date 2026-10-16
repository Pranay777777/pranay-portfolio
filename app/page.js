'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from '@/lib/gsap'
import Navbar                from '@/components/ui/Navbar'
import VideoIntro            from '@/components/sections/VideoIntro'
import HeroSection           from '@/components/sections/HeroSection'
import AboutSection          from '@/components/sections/AboutSection'
import ProjectsSection       from '@/components/sections/ProjectsSection'
import WorkExperienceSection from '@/components/sections/WorkExperienceSection'
import PublicationsFooterSection from '@/components/sections/PublicationsFooterSection'
import ScreenLoader from '@/components/sections/ScreenLoader'
import profile               from '@/data/profile.json'

// Snap: 0=video 1=hero 2=about 3..(2+N)=projects, then work-exp, publications, interstitial, footer (N = project count)
const PROJECT_SLIDES = profile.projects.length
const TOTAL          = 7 + PROJECT_SLIDES  // 9

export default function Home() {
  const mainRef        = useRef(null)
  const idxRef         = useRef(0)
  const busyRef        = useRef(false)
  const tweenRef       = useRef(null)
  const loopOverlayRef = useRef(null)
  const loaderOpenRef  = useRef(true)
  const [showLoader, setShowLoader] = useState(true)

  useEffect(() => {
    const el = mainRef.current
    if (!el) return

    // Fade to black → instant scrollTop jump → fade in
    // Used by "Back to top" (footer → first section) instead of scrolling back through everything
    function fadeLoop(targetScrollTop, targetIdx) {
      busyRef.current = true
      tweenRef.current?.kill()
      gsap.to(loopOverlayRef.current, {
        opacity: 1,
        duration: 0.55,
        ease: 'power2.in',
        onComplete: () => {
          el.scrollTop    = targetScrollTop
          idxRef.current  = targetIdx
          gsap.to(loopOverlayRef.current, {
            opacity: 0,
            duration: 0.7,
            ease: 'power2.out',
            delay: 0.05,
            onComplete: () => {
              setTimeout(() => { busyRef.current = false }, 300)
            },
          })
        },
      })
    }

    // Destination of the move in flight (idxRef tracks the live position while scrolling)
    let moveTarget = 0

    // The only scroll mover. Stops at the first/last section (no wrap-around);
    // ignored while a move is in progress (busyRef), so nothing can double-jump.
    function goTo(idx) {
      if (idx < 0 || idx >= TOTAL) return
      if (idx === idxRef.current || busyRef.current) return

      idxRef.current = idx
      moveTarget = idx
      busyRef.current = true
      tweenRef.current?.kill()
      tweenRef.current = gsap.to(el, {
        scrollTop: idx * window.innerHeight,
        duration: 1.0,
        ease: 'power3.inOut',
        onComplete: () => { setTimeout(() => { busyRef.current = false }, 600) },
      })
    }

    // Same as goTo, but with the black fade-cut (for long jumps such as "Back to top")
    function fadeTo(idx) {
      if (idx < 0 || idx >= TOTAL) return
      if (idx === idxRef.current || busyRef.current) return
      fadeLoop(idx * window.innerHeight, idx)
    }

    // ── Wheel / trackpad: one gesture = one section ─────────────────────
    // A mouse notch is one big event; a trackpad flick is a stream that rises,
    // then decays (momentum) for up to ~1–2 s. Accumulate until the threshold,
    // move once, then ignore the rest of that gesture.
    const WHEEL_THRESHOLD = 50    // px of accumulated deltaY before moving
    const GESTURE_GAP_MS  = 200   // this long without wheel events ends a gesture
    const LINE_PX         = 40    // deltaMode 1 (lines) → px; Firefox notch = 3 lines = 120 px
    let wheelAcc     = 0
    let lastWheelAt  = -Infinity
    let lastWheelAbs = 0
    let gestureUsed  = false      // this gesture already moved a section
    let sawDecay     = false      // deltas have started shrinking since that move

    function onWheel(e) {
      e.preventDefault()
      const now = performance.now()
      const gap = now - lastWheelAt
      lastWheelAt = now

      const unit = e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? window.innerHeight : 1
      const dy = e.deltaY * unit
      const dx = e.deltaX * unit
      if (Math.abs(dx) > Math.abs(dy)) return              // sideways swipe: do nothing
      const abs = Math.abs(dy)

      // A new gesture starts after a quiet gap, when the delta clearly rises again
      // after decaying (a fresh flick during momentum), or — once the move has
      // finished — with a full-size, non-decaying event (a mouse wheel kept rolling).
      if (gestureUsed && abs < lastWheelAbs) sawDecay = true
      const quietGap  = gap > GESTURE_GAP_MS
      const reFlick   = gestureUsed && sawDecay && abs >= Math.max(lastWheelAbs * 1.6, lastWheelAbs + 8)
      const kept      = gestureUsed && !busyRef.current && abs >= WHEEL_THRESHOLD && abs >= lastWheelAbs
      lastWheelAbs = abs
      if (quietGap || reFlick || kept) { wheelAcc = 0; gestureUsed = false; sawDecay = false }

      if (gestureUsed || busyRef.current) return
      wheelAcc += dy
      if (Math.abs(wheelAcc) < WHEEL_THRESHOLD) return

      const dir = Math.sign(wheelAcc)
      wheelAcc = 0
      gestureUsed = true
      goTo(idxRef.current + dir)
    }

    // Desktop touchscreens: one swipe = one section (stops at the ends)
    let touchY = 0
    function onTouchStart(e) { touchY = e.touches[0].clientY }
    function onTouchEnd(e) {
      const dy = touchY - e.changedTouches[0].clientY
      if (Math.abs(dy) < 40 || busyRef.current) return
      goTo(idxRef.current + (dy > 0 ? 1 : -1))
    }

    function onScroll() {
      if (resizeIdx !== null) return   // mid-resize: innerHeight changed, keep the section we were on
      idxRef.current = Math.round(el.scrollTop / window.innerHeight)
    }

    // Components request a jump via `goto-section` so goTo stays the only scroll mover.
    // detail: a section index, or { index, fade: true } for the fade-cut
    function onGotoSection(e) {
      const d = e.detail
      if (typeof d === 'number') goTo(d)
      else if (d?.fade) fadeTo(d.index)
      else goTo(d?.index)
    }

    // ── Resize / rotation: re-snap to the current section (desktop; mobile scrolls natively) ──
    let resizeIdx = null
    let resizeTimer
    function onResize() {
      if (window.matchMedia('(max-width: 767px)').matches) return
      if (resizeIdx === null) resizeIdx = tweenRef.current?.isActive() ? moveTarget : idxRef.current
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (tweenRef.current?.isActive()) {          // a move was in flight: land on its target
          tweenRef.current.kill()
          busyRef.current = false
        }
        idxRef.current = resizeIdx
        el.scrollTop = resizeIdx * window.innerHeight
        resizeIdx = null
      }, 150)
    }

    // Keyboard: ↑ / ↓ (and Page Up / Down) move one section, Home / End jump to the
    // first / last; all stop at the ends. ← / → do nothing. Inactive until "Step Inside".
    const NEXT_KEYS = ['ArrowDown', 'PageDown']
    const PREV_KEYS = ['ArrowUp', 'PageUp']
    function onKeyDown(e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const t = e.target
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); return }
      let next
      if (e.key === 'Home')     next = 0
      else if (e.key === 'End') next = TOTAL - 1
      else {
        const dir = NEXT_KEYS.includes(e.key) ? 1 : PREV_KEYS.includes(e.key) ? -1 : 0
        if (!dir) return
        next = idxRef.current + dir
      }
      e.preventDefault()                              // no native scroll
      if (loaderOpenRef.current || busyRef.current) return
      goTo(next)                                      // goTo ignores indexes past the ends
    }

    const isMobile = window.matchMedia('(max-width: 767px)').matches

    el.addEventListener('wheel',  onWheel,  { passive: false })
    el.addEventListener('scroll', onScroll, { passive: true  })
    // Mobile keeps native scrolling (no touch handlers, no looping at the ends)
    if (!isMobile) {
      el.addEventListener('touchstart', onTouchStart, { passive: true })
      el.addEventListener('touchend',   onTouchEnd,   { passive: true })
    }
    window.addEventListener('goto-section', onGotoSection)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)

    return () => {
      el.removeEventListener('wheel',  onWheel)
      el.removeEventListener('scroll', onScroll)
      if (!isMobile) {
        el.removeEventListener('touchstart', onTouchStart)
        el.removeEventListener('touchend',   onTouchEnd)
      }
      window.removeEventListener('goto-section', onGotoSection)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
      clearTimeout(resizeTimer)
      tweenRef.current?.kill()
    }
  }, [])

  return (
    <>
      {showLoader && (
        <ScreenLoader onDismiss={() => { loaderOpenRef.current = false; setShowLoader(false) }} />
      )}

      {/* Full-screen fade overlay for the "Back to top" fade-cut */}
      <div
        ref={loopOverlayRef}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000',
          zIndex: 9999,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      <Navbar />
      <main ref={mainRef} style={{ height: '100vh', overflowY: 'scroll', overscrollBehavior: 'none' }}>
        <div>
          <VideoIntro />
          <HeroSection />
          <AboutSection />
          <ProjectsSection />
          <WorkExperienceSection />
          <PublicationsFooterSection />
        </div>
      </main>
    </>
  )
}