'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { gsap } from '@/lib/gsap'
import { subscribeIntroProgress, prefersReducedMotion } from '@/lib/introProgress'
import { watchSectionVisibility } from '@/lib/sectionVisibility'
import profile from '@/data/profile.json'
import content from '@/data/content.json'
import styles from '@/styles/sections/VideoIntro.module.css'

const CinematicLayer = dynamic(() => import('@/components/three/CinematicLayer'), { ssr: false })

const LABELS = content.intro

// If the video can't load (error, or no frames this long after the loader), move on to the hero
const LOAD_TIMEOUT_MS = 5000

function scrollNext() {
  window.dispatchEvent(new CustomEvent('goto-section', { detail: 1 }))
}

// Only skip if the visitor is still on the intro
function skipIfOnIntro() {
  const main = document.querySelector('main')
  if (main && main.scrollTop < window.innerHeight * 0.4) scrollNext()
}

export default function VideoIntro() {
  const stageRef      = useRef(null)
  const videoRef      = useRef(null)
  const bgCanvasRef   = useRef(null)
  const greetRef      = useRef(null)
  const nameRef       = useRef(null)
  const roleRef       = useRef(null)
  const scrollRef     = useRef(null)
  const loaderDoneRef = useRef(false)

  // muted state drives icon only - DOM muted property is controlled exclusively via ref
  const [muted,    setMuted]    = useState(true)
  const [playing,  setPlaying]  = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // play(); if sound is refused (autoplay policy), retry muted and keep playing.
  // If even muted playback is refused, fall back to the paused overlay (Play button).
  function playWithFallback() {
    const v = videoRef.current
    if (!v) return
    v.play().catch(err => {
      if (err?.name !== 'NotAllowedError') return   // load failures are handled by onError / the timeout
      v.muted = true
      setMuted(true)
      return v.play().catch(() => setPlaying(false))
    })
  }

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 767px)').matches)
  }, [])

  // Entrance animation
  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.4 })
    tl.fromTo(greetRef.current,  { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' })
      .fromTo(nameRef.current,   { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out' }, '-=0.2')
      .fromTo(roleRef.current,   { opacity: 0, y:  20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.4')
      .fromTo(scrollRef.current, { opacity: 0 },         { opacity: 1, duration: 0.5 }, '-=0.1')
    return () => tl.kill()
  }, [])

  // Video fade-in; starts muted, unmuted by the "Step Inside" click below
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    // Guarantee muted on mount regardless of browser attribute handling
    v.muted = true
    const t = gsap.fromTo(v, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' })
    return () => t.kill()
  }, [])

  // Unmute when screen loader is dismissed (fires inside user gesture - Safari safe)
  useEffect(() => {
    function onLoaderDismissed() {
      const v = videoRef.current
      if (!v) return
      v.muted = false
      setMuted(false)
    }
    window.addEventListener('loader-dismissed', onLoaderDismissed)
    return () => window.removeEventListener('loader-dismissed', onLoaderDismissed)
  }, [])

  // Play video after shatter animation finishes; skip to the hero if it never loads
  useEffect(() => {
    let timeoutId
    function onAnimationDone() {
      loaderDoneRef.current = true
      const v = videoRef.current
      if (!v) return
      if (v.error) { skipIfOnIntro(); return }
      playWithFallback()
      timeoutId = setTimeout(() => {
        if (v.readyState < 2) skipIfOnIntro()   // no frame decoded yet
      }, LOAD_TIMEOUT_MS)
    }
    window.addEventListener('loader-animation-done', onAnimationDone)
    return () => {
      window.removeEventListener('loader-animation-done', onAnimationDone)
      clearTimeout(timeoutId)
    }
  }, [])

  // Ambient background: draw main video to tiny offscreen canvas at ~5 fps.
  // The 48×27 resolution naturally blurs when CSS scales it to viewport size,
  // so we only need a light 4 px filter blur to smooth block edges.
  // This replaces the duplicate <video> element — saves one full video decoder
  // and removes the heavy per-frame blur(28px) GPU compositing.
  useEffect(() => {
    const v = videoRef.current
    const c = bgCanvasRef.current
    if (!v || !c) return

    const W = 48, H = 27
    c.width = W
    c.height = H
    const ctx = c.getContext('2d')
    let intervalId

    function draw() {
      if (v.readyState >= 2) {
        try { ctx.drawImage(v, 0, 0, W, H) } catch {}
      }
    }

    let loaded = false
    let visible = true
    function sync() {
      clearInterval(intervalId)
      intervalId = undefined
      if (loaded && visible) { draw(); intervalId = setInterval(draw, 200) }
    }
    function onLoaded() { loaded = true; sync() }

    if (v.readyState >= 2) onLoaded()
    else v.addEventListener('loadeddata', onLoaded, { once: true })

    // Stop redrawing while the hero covers the intro
    const unwatch = watchSectionVisibility(c, isVisible => { visible = isVisible; sync() })

    return () => {
      clearInterval(intervalId)
      unwatch()
      v.removeEventListener('loadeddata', onLoaded)
    }
  }, [])

  // Pause the video while the hero covers it; resume when scrolling back (if it was playing)
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    let resumeOnShow = false
    return watchSectionVisibility(v, isVisible => {
      if (!isVisible) {
        if (!v.paused && !v.ended) { resumeOnShow = true; v.pause() }
      } else if (resumeOnShow) {
        resumeOnShow = false
        playWithFallback()
      }
    })
  }, [])

  // Scroll-linked hand-off to the hero: the video "screen" recedes as p goes 0 → 1
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    if (prefersReducedMotion()) return   // hero simply crossfades over it (see HeroSection)

    // Blur is the expensive part: desktop only, and skipped on low-end hardware
    const canBlur = window.matchMedia('(min-width: 768px)').matches
      && (navigator.hardwareConcurrency ?? 8) > 4
      && (navigator.deviceMemory ?? 8) > 4
    const set = gsap.quickSetter(stage, 'css')

    return subscribeIntroProgress(p => {
      if (p === 0) {
        set({ scale: 1, borderRadius: 0, filter: 'none' })
        return
      }
      const blur = canBlur ? ` blur(${(6 * p).toFixed(2)}px)` : ''
      set({
        scale:        1 - 0.08 * p,
        borderRadius: 24 * p,
        filter:       `brightness(${(1 - 0.6 * p).toFixed(3)})${blur}`,
      })
    })
  }, [])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (playing) { v.pause(); setPlaying(false) }
    else         { playWithFallback(); setPlaying(true) }
  }

  function toggleMute() {
    const v = videoRef.current
    if (!v) return
    // Set DOM property synchronously inside click gesture - Safari requires this.
    // React never updates `v.muted` on re-renders (known React limitation for video),
    // so the static `muted` attr in JSX does not fight with this.
    v.muted = !v.muted
    setMuted(v.muted)
  }

  function handleEnded() {
    skipIfOnIntro()
  }

  // Source failed to load: move on if the loader is already gone (otherwise the loader-done handler checks v.error)
  function handleError() {
    if (loaderDoneRef.current) skipIfOnIntro()
  }

  return (
    <section className={styles.section}>
      <div ref={stageRef} className={styles.stage}>

      {/* 1 - Blurred ambient background (tiny canvas — no second video decoder) */}
      <canvas
        ref={bgCanvasRef}
        aria-hidden="true"
        className={styles.bgVideo}
      />

      {/* 2 - Main video: static `muted` attr so React never touches the DOM property on re-renders */}
      <video
        ref={videoRef}
        data-testid="intro-video"
        src="/assets/about-me.mp4"
        muted playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={handleEnded}
        onError={handleError}
        className={styles.mainVideo}
      />

      {/* 3 - Cinematic gradient overlay */}
      <div className={styles.overlay} />

      {/* 4 - Three.js cinematic bokeh layer (desktop only) */}
      {!isMobile && <CinematicLayer />}

      {/* 5 - Landing text */}
      <div className={styles.heroContent}>
        <p ref={greetRef} className={styles.eyebrow}>{content.site.tagline}</p>
        <h1 ref={nameRef} className={styles.name}>
          {profile.name.first}<br />{profile.name.last}
        </h1>
        <p ref={roleRef} className={styles.role}>{profile.roles.detailed}</p>
      </div>

      {/* 6 - Paused overlay */}
      {!playing && (
        <button className={styles.playOverlay} onClick={togglePlay} aria-label="Play video">
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <circle cx="36" cy="36" r="35" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
            <polygon points="29,20 56,36 29,52" fill="white" />
          </svg>
        </button>
      )}

      {/* 7 - Unmute button: shown whenever the video is muted (e.g. autoplay with sound was blocked) */}
      {muted && (
        <button type="button" className={styles.unmuteBtn} onClick={toggleMute} aria-label={LABELS.unmuteLabel}>
          <span className={styles.soundPulse} aria-hidden="true" />
          <span>{LABELS.unmuteHint}</span>
        </button>
      )}

      {/* 8 - Controls (bottom-right) */}
      <div className={styles.controls}>
        <button className={styles.ctrlBtn} onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing
            ? /* Pause icon */
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect x="2" y="1" width="4" height="12" rx="1" />
                <rect x="8" y="1" width="4" height="12" rx="1" />
              </svg>
            : /* Play icon */
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <polygon points="2,1 13,7 2,13" />
              </svg>
          }
        </button>

        <button className={styles.ctrlBtn} onClick={toggleMute} aria-label={muted ? LABELS.unmuteLabel : LABELS.muteLabel}>
          {muted
            ? /* Muted icon */
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <path d="M2 5.5h2.5L8 3v10l-3.5-2.5H2V5.5z" fill="currentColor" stroke="none" />
                <line x1="10" y1="5" x2="14" y2="11" />
                <line x1="14" y1="5" x2="10" y2="11" />
              </svg>
            : /* Sound icon */
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <path d="M2 5.5h2.5L8 3v10l-3.5-2.5H2V5.5z" fill="currentColor" stroke="none" />
                <path d="M10.5 5.5C11.8 6.5 12.5 7.2 12.5 8s-.7 1.5-2 2.5" />
                <path d="M12 3.5C14 5 15 6.4 15 8s-1 3-3 4.5" />
              </svg>
          }
        </button>
      </div>

      {/* 9 - Scroll cue */}
      <button
        ref={scrollRef}
        className={styles.scrollCue}
        onClick={scrollNext}
        aria-label="Scroll to next section"
      >
        <span className={styles.scrollLabel}>Scroll</span>
        <span className={styles.scrollLine} />
      </button>

      </div>
    </section>
  )
}
