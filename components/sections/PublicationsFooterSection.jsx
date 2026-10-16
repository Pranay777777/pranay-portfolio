
'use client'

import { useEffect, useRef, useSyncExternalStore, Fragment } from 'react'
import Image from 'next/image'

import { gsap } from '@/lib/gsap'
import {
  FaGithub, FaLinkedinIn, FaInstagram, FaEnvelope,
} from 'react-icons/fa'
import { FiArrowUpRight } from 'react-icons/fi'
import profile from '@/data/profile.json'
import content from '@/data/content.json'
import styles from '@/styles/sections/PublicationsFooterSection.module.css'

const PUBS = profile.publications

const SOCIAL_ICONS = {
  GitHub:    <FaGithub    size={13} />,
  LinkedIn:  <FaLinkedinIn  size={13} />,
  Instagram: <FaInstagram size={13} />
}

const MOBILE_SOCIAL_ICONS = {
  GitHub:    <FaGithub    size={20} />,
  LinkedIn:  <FaLinkedinIn  size={20} />,
  Instagram: <FaInstagram size={20} />,
}
const HERO_SOCIAL_LABELS = ['GitHub', 'LinkedIn', 'Instagram']



function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// Time-dependent values must come from the visitor's clock, not the build server's:
// render nothing on the server, then the real value on the client (no hydration mismatch)
const noopSubscribe = () => () => {}
function useClientValue(getValue) {
  return useSyncExternalStore(noopSubscribe, getValue, () => '')
}
const getYear = () => new Date().getFullYear()

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

// Fade-cut back to the intro (via page.js goTo controller)
function backToTop() {
  window.dispatchEvent(new CustomEvent('goto-section', { detail: { index: 0, fade: true } }))
}

export default function PublicationsFooterSection() {
  const wrapperRef = useRef(null)
  const stickyRef  = useRef(null)

  // image
  const imageWrapRef    = useRef(null)
  const imageOverlayRef = useRef(null)

  // publication content
  const pubContentRef = useRef(null)
  const labelRef      = useRef(null)
  const headingRef    = useRef(null)
  const dividerRef    = useRef(null)
  const itemRefs      = useRef([])

  // image-only interstitial
  const interstitialRef = useRef(null)

  // footer
  const footerContentRef  = useRef(null)
  const leftRef         = useRef(null)
  const rightRef        = useRef(null)
  const bigNameRef      = useRef(null)
  const bottomBarRef    = useRef(null)

  useEffect(() => {
    const wrapper       = wrapperRef.current
    const sticky        = stickyRef.current
    const scroller      = document.querySelector('main')
    if (!wrapper || !sticky || !scroller) return

    const isMobile = window.innerWidth < 768

    // ── Publication entry animation ───────────────────────────
    let pubAnimDone = false

    function resetPubAnim() {
      pubAnimDone = false
      gsap.killTweensOf([labelRef.current, headingRef.current, dividerRef.current, ...itemRefs.current].filter(Boolean))
      gsap.set(labelRef.current,   { opacity: 0, y: -16, rotateX: 40, transformPerspective: 500, transformOrigin: '50% 0%' })
      gsap.set(headingRef.current, { opacity: 0, y: -30, rotateX: 35, transformPerspective: 700, transformOrigin: '50% 0%' })
      gsap.set(dividerRef.current, { scaleX: 0, transformOrigin: 'left center' })
      itemRefs.current.forEach(el => {
        if (el) gsap.set(el, { opacity: 0, y: 28, rotateX: 18, transformPerspective: 900, transformOrigin: '50% 0%' })
      })
    }

    function playPubAnim() {
      if (pubAnimDone) return
      pubAnimDone = true
      gsap.to(labelRef.current,   { opacity: 1, y: 0, rotateX: 0, duration: 0.55, ease: 'power3.out' })
      gsap.to(headingRef.current, { opacity: 1, y: 0, rotateX: 0, duration: 0.75, ease: 'expo.out', delay: 0.08 })
      gsap.to(dividerRef.current, { scaleX: 1, duration: 0.7, ease: 'power2.inOut', delay: 0.25 })
      itemRefs.current.forEach((el, i) => {
        if (el) gsap.to(el, { opacity: 1, y: 0, rotateX: 0, duration: 0.6, ease: 'power3.out', delay: 0.32 + i * 0.1 })
      })
    }

    // ── Initial image position (full-width background) ───────
    function setImageLeft() {
      const vw = window.innerWidth
      gsap.set(imageWrapRef.current, { width: vw, x: 0, opacity: 1 })
      if (imageOverlayRef.current) gsap.set(imageOverlayRef.current, { opacity: 1 })
    }

    // ── Scroll-driven animation ───────────────────────────────
    // Skip work that would re-apply identical values (e.g. while the section is far away)
    let isReset = false
    let lastP, lastVw

    function onScroll() {
      const vh   = window.innerHeight
      // getBoundingClientRect is reliable regardless of offsetParent chain or navbar
      const dist = -wrapper.getBoundingClientRect().top

      // Entry: play pub animation when section first enters view
      if (dist > -vh * 0.5 && dist < vh * 0.35) {
        playPubAnim()
        isReset = false
      } else if (dist < -vh * 0.4 && !isReset) {
        resetPubAnim()
        setImageLeft()
        isReset = true
      }

      // 300vh/svh wrapper → 2 viewports of scroll travel (same for mobile + desktop)
      const p = Math.max(0, Math.min(1, dist / (2 * vh)))
      if (p === lastP && window.innerWidth === lastVw) return
      lastP  = p
      lastVw = window.innerWidth

      // ── Phase 1: pub text fades out ──────────────────────
      // Mobile: p 0 → 0.25 | Desktop: p 0 → 0.28
      const pubFadeEnd = isMobile ? 0.25 : 0.28
      const pubFade = 1 - Math.max(0, Math.min(1, p / pubFadeEnd))
      gsap.set(pubContentRef.current, { opacity: pubFade, pointerEvents: pubFade > 0.05 ? 'auto' : 'none' })

      const vw = window.innerWidth

      if (isMobile) {
        // footer-mobile.webp static background - interstitial fades between pub and footer
        const interIn  = Math.max(0, Math.min(1, (p - 0.28) / 0.17))
        const interOut = Math.max(0, Math.min(1, (p - 0.60) / 0.12))
        gsap.set(interstitialRef.current, { opacity: interIn * (1 - interOut), pointerEvents: 'none' })

      } else {
        // ── Phase 2: image shrinks full-width → centered (p 0.12 → 0.65) ──
        const imgRaw = Math.max(0, Math.min(1, (p - 0.12) / 0.53))
        const imgP   = easeInOut(imgRaw)

        const startW  = vw
        const endW    = vw * 0.46
        const w       = startW + imgP * (endW - startW)
        const centerX = imgP * (vw - w) / 2

        // Dark overlay fades as image shrinks
        if (imageOverlayRef.current) {
          gsap.set(imageOverlayRef.current, { opacity: 1 - imgP })
        }

        // ── Interstitial: fade in after pub, fade out before crossfade ──
        const interIn  = Math.max(0, Math.min(1, (p - 0.25) / 0.15))
        const interOut = Math.max(0, Math.min(1, (p - 0.54) / 0.14))
        gsap.set(interstitialRef.current, { opacity: interIn * (1 - interOut), pointerEvents: 'none' })

        // ── Phase 3: image fades out to reveal gradient (p 0.65 → 0.92) ──
        const xfadeRaw = Math.max(0, Math.min(1, (p - 0.65) / 0.27))
        const xfade    = 0.5 - 0.5 * Math.cos(Math.PI * xfadeRaw)

        gsap.set(imageWrapRef.current, { width: w, x: centerX, opacity: 1 - xfade })
      }

      // ── Footer text fades in ──────────────────────────────
      // Mobile: p 0.72 → 0.92 | Desktop: p 0.75 → 1.0
      const footerStart = isMobile ? 0.72 : 0.75
      const footerRange = isMobile ? 0.20 : 0.25
      const footerFade = Math.max(0, Math.min(1, (p - footerStart) / footerRange))
      gsap.set(footerContentRef.current, { opacity: footerFade, pointerEvents: footerFade > 0.05 ? 'auto' : 'none' })
    }

    resetPubAnim()
    setImageLeft()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => {
      scroller.removeEventListener('scroll', onScroll)
    }
  }, [])

  const year     = useClientValue(getYear)
  const greeting = useClientValue(getGreeting)
  const initials = `${profile.name.first[0]}${profile.name.last[0]}`

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <div ref={stickyRef} className={styles.sticky}>

        {/* ── Footer gradient background (desktop) ── */}
        <div className={styles.footerBg} aria-hidden />

        {/* ── Mobile background image (footer phase - mobile only) ── */}
        <div className={styles.mobileFooterBg}>
          <Image
            src="/assets/footer-mobile.webp"
            alt=""
            fill
            quality={85}
            className={styles.mobileFooterBgImg}
            sizes="100vw"
            priority={false}
          />
        </div>

        {/* ── Mobile permanent dark overlay - keeps image visually identical across all 3 sections ── */}
        <div className={styles.mobileDarkOverlay} aria-hidden />

        {/* ── Floating image: starts left, moves to center ── */}
        <div ref={imageWrapRef} className={styles.imageWrap}>
          <Image
            src="/assets/footer.png"
            alt=""
            fill
            quality={85}
            className={styles.imageEl}
            sizes="(max-width: 767px) 100vw, 50vw"
            priority={false}
          />
          <div ref={imageOverlayRef} className={styles.imageOverlay} />
        </div>

        {/* ── Publication content (right of image) ── */}
        <div ref={pubContentRef} className={styles.pubContent}>
          <span className={styles.watermark} aria-hidden>WRITING</span>

          <div className={styles.pubHero}>
            <p  ref={labelRef}   className={styles.label}>Research &amp; Writing</p>
            <h2 ref={headingRef} className={styles.heading}>Publications</h2>
          </div>

          <div ref={dividerRef} className={styles.divider} />

          <div className={styles.list}>
            {PUBS.map((pub, i) => (
              <a
                key={pub.id}
                href={pub.link}
                target="_blank"
                rel="noopener noreferrer"
                ref={el => { itemRefs.current[i] = el }}
                className={styles.item}
              >
                <div className={styles.num}>0{i + 1}.</div>
                <div className={styles.itemBody}>
                  <div className={styles.itemTop}>
                    <h3 className={styles.title}>{pub.title}</h3>
                    <span className={styles.platform}>{pub.platform}</span>
                  </div>
                  <p className={styles.desc}>{pub.desc}</p>
                </div>
                <div className={styles.itemRight}>
                  <span className={styles.year}>{pub.year}</span>
                  <span className={styles.readBtn}>
                    Read <FiArrowUpRight size={11} />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* ── Image-only interstitial (step 2) ── */}
        <div ref={interstitialRef} className={styles.interstitial} aria-hidden>

          <div className={styles.interstitialLeft}>
            <div className={styles.interStat}>
              <span className={styles.interLabel}>{content.interstitial.availabilityLabel}</span>
              <span className={styles.interBig}>{profile.location.availability}</span>
            </div>
            <div className={styles.interDividerH} />
            <div className={styles.interStat}>
              <span className={styles.interLabel}>{content.interstitial.basedInLabel}</span>
              <span className={styles.interBig}>{profile.location.based}</span>
            </div>
          </div>

          <div className={styles.interstitialRight}>
            {profile.stats.map((stat, i) => (
              <Fragment key={stat.label}>
                {i > 0 && <div className={styles.interDividerV} />}
                <div className={styles.interNum}>
                  <span className={styles.interCount}>{stat.value}</span>
                  <span className={styles.interNumLabel}>
                    {/* First word on line 1, the rest on line 2 */}
                    {stat.label.split(' ').map((word, j) => (
                      <Fragment key={j}>{j === 1 ? <br /> : j > 1 && ' '}{word}</Fragment>
                    ))}
                  </span>
                </div>
              </Fragment>
            ))}
          </div>

          <div className={styles.interstitialBottom}>
            <span className={styles.interScrollText}>Continue</span>
            <span className={styles.interScrollLine} />
          </div>

        </div>

        {/* ── Radial vignette (footer phase) ── */}
        <div className={styles.vignetteOverlay} aria-hidden />

        {/* ── Footer content ── */}
        <div ref={footerContentRef} className={styles.footerContent}>

          {/* ── Mobile: hero-like layout ── */}
          <div className={styles.mobileLayout}>
            <h2 className={styles.mobileName}>
              {profile.name.first.toUpperCase()}
              <br />
              <span className={styles.mobileNameGhost}>{profile.name.last.toUpperCase()}</span>
            </h2>
            <p className={styles.mobileDesc}>{profile.description}</p>
            <div className={styles.mobileCtas}>
              <a href={`mailto:${profile.email}`} className={styles.mobileTalkBtn}>
                Let&apos;s talk <FiArrowUpRight />
              </a>
            </div>
            <div className={styles.mobileSocialRow}>
              {HERO_SOCIAL_LABELS.map((label, i) => {
                const s = profile.socials.find(s => s.label === label)
                if (!s) return null
                return (
                  <Fragment key={label}>
                    {i > 0 && <div className={styles.mobileSocialDivider} aria-hidden />}
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className={styles.mobileSocialLink} aria-label={label}>
                      <span className={styles.mobileSocialIconEl}>{MOBILE_SOCIAL_ICONS[label]}</span>
                      <span className={styles.mobileSocialLabelEl}>{label.toUpperCase()}</span>
                    </a>
                  </Fragment>
                )
              })}
            </div>
          </div>

          <div className={styles.mainGrid}>

            <div ref={leftRef} className={styles.leftCol}>
              <div className={styles.identityBlock}>
                <p className={styles.greetLine}>
                  <span className={styles.greetDot} />
                  {greeting}
                </p>
                <h2 className={styles.nameHeading}>
                  {profile.name.first}
                  <br />
                  <span className={styles.nameGhost}>{profile.name.last}</span>
                </h2>
              </div>

              <div className={styles.footerInfo}>
                <p className={styles.footerDescription}>{profile.description}</p>
                <div className={styles.footerLinks}>
                  {profile.socials.slice(0, 4).map((s, i) => (
                    <span key={s.label} className={styles.footerLinkWrap}>
                      {i > 0 && <span className={styles.footerPipe}>|</span>}
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.footerLink}
                      >
                        {SOCIAL_ICONS[s.label] && (
                          <span className={styles.socialIcon}>{SOCIAL_ICONS[s.label]}</span>
                        )}
                        {s.label}
                      </a>
                    </span>
                  ))}
                </div>
                <a href={`mailto:${profile.email}`} className={styles.footerMail}>
                  <FaEnvelope size={12} />
                  {profile.email}
                </a>
              </div>
            </div>

            <div className={styles.centerSpace} />

            <div ref={rightRef} className={styles.rightCol}>
              <div className={styles.ctaBlock}>
                <p className={styles.ctaEyebrow}>{content.footer.eyebrow}</p>
                <p className={styles.ctaHeading}>
                  {content.footer.ctaLines.map((line, i) => (
                    <span key={i}>{line}<br /></span>
                  ))}
                  <span className={styles.ctaAccent}>{content.footer.ctaAccent}</span>
                </p>
                <a href={`mailto:${profile.email}`} className={styles.talkBtn}>
                  Let&apos;s talk →
                </a>
                <button
                  type="button"
                  className={styles.resumeBtn}
                  onClick={async () => {
                    const { default: generateResume } = await import('@/lib/generateResume')
                    generateResume(profile)
                  }}
                >
                  Download CV ↓
                </button>
              </div>
            </div>

          </div>

          <div ref={bigNameRef} className={styles.signatureWrap}>
            <h2 className={styles.signatureText}>{profile.name.full.toUpperCase()}</h2>
          </div>

          <div ref={bottomBarRef} className={styles.bottomBar}>
            <div className={styles.bottomLeft}>
              <div className={styles.monogram}>
                <span className={styles.monoLetters}>{initials}</span>
                <span className={styles.monoDot} />
              </div>
              <span className={styles.leftDivider} />
              <div className={styles.copyBlock}>
                <p className={styles.copy}>© {year} {profile.name.full.toUpperCase()}</p>
                <p className={styles.copyAll}>ALL RIGHTS RESERVED</p>
              </div>
            </div>
            <div className={styles.bottomRight}>
              <button
                type="button"
                className={styles.backToTop}
                onClick={backToTop}
                aria-label={content.footer.backToTopLabel}
              >
                <span className={styles.backToTopText}>{content.footer.backToTop}</span>
                <span aria-hidden="true">↑</span>
              </button>
              <span className={styles.barDivider} />
              <span className={styles.builtWith}>
                DESIGNED &amp; DEVELOPED
                <br />
                WITH PRECISION.
              </span>
              <span className={styles.barDivider} />
              <span className={styles.sunIcon}>✺</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
