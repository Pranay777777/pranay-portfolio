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
