// Sections are `position: sticky; top: 0` and stack on top of each other, so a
// section that has been covered by the next one is still "in the viewport" as far
// as IntersectionObserver is concerned. This checks real visibility instead:
// the section overlaps the viewport AND the next section hasn't slid over it.
export function watchSectionVisibility(el, onChange) {
  const section  = el.closest('section') ?? el
  const scroller = document.querySelector('main')
  let visible

  function check() {
    const rect = section.getBoundingClientRect()
    const next = section.nextElementSibling
    const covered = next ? next.getBoundingClientRect().top <= 1 : false
    const now = rect.top < window.innerHeight && rect.bottom > 0 && !covered
    if (now !== visible) {
      visible = now
      onChange(now)
    }
  }

  scroller?.addEventListener('scroll', check, { passive: true })
  window.addEventListener('resize', check)
  check()

  return () => {
    scroller?.removeEventListener('scroll', check)
    window.removeEventListener('resize', check)
  }
}

// For a layer *inside* a long sticky block (e.g. the publications backdrop in the
// 300vh publications → interstitial → footer section): visible while it overlaps the
// viewport AND hasn't been faded out by its parent. Checked one frame after each scroll,
// so the parent's own scroll handler has already set this frame's opacity.
export function watchLayerVisibility(el, onChange) {
  const scroller = document.querySelector('main')
  const fader    = el.parentElement ?? el
  let visible, frame = 0

  function check() {
    frame = 0
    const rect = el.getBoundingClientRect()
    const onScreen = rect.top < window.innerHeight && rect.bottom > 0
    const now = onScreen && parseFloat(getComputedStyle(fader).opacity) > 0.01
    if (now !== visible) {
      visible = now
      onChange(now)
    }
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(check)
  }

  scroller?.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
  schedule()

  return () => {
    cancelAnimationFrame(frame)
    scroller?.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
  }
}
