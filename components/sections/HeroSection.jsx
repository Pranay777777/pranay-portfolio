'use client'

import { useEffect, useRef, Fragment } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { FaGithub, FaLinkedinIn, FaInstagram } from 'react-icons/fa'
import { FiArrowUpRight } from 'react-icons/fi'
import { gsap } from '@/lib/gsap'
import { subscribeIntroProgress, prefersReducedMotion } from '@/lib/introProgress'

import profile from '@/data/profile.json'
import content from '@/data/content.json'
import styles from '@/styles/sections/HeroSection.module.css'

const HeroBackground = dynamic(() => import('@/components/three/HeroBackground'), { ssr: false })

const SOCIAL_ICON_MAP = { GitHub: FaGithub, LinkedIn: FaLinkedinIn, Instagram: FaInstagram }
const SIDEBAR_LABELS  = ['Instagram', 'GitHub', 'LinkedIn']

function splitTagline(text, highlight) {
  if (!highlight) return [text]
  const parts = text.split(highlight)
  return parts.reduce((acc, part, i) => {
    acc.push(part)
    if (i < parts.length - 1) {
      acc.push(<span key={i} className={styles.taglineAccent}>{highlight}</span>)
    }
    return acc
  }, [])
}

// Scroll-linked entrance (by intro progress p): [start, span] for greeting, name, pills
const RISE = [[0.35, 0.4], [0.45, 0.4], [0.55, 0.4]]
const riseEase = gsap.parseEase('power2.out')

export default function HeroSection() {
  const sectionRef     = useRef(null)
  const stageRef       = useRef(null)
  const greetingRef    = useRef(null)
  const nameBlockRef   = useRef(null)
  const photoRef       = useRef(null)
  const pillsRef       = useRef(null)
  const ctaBtnRef      = useRef(null)
  const statsRef       = useRef(null)
  const taglineCardRef = useRef(null)
  const availCardRef   = useRef(null)
  const socialRef      = useRef(null)

  function handleViewProjects() {
    const scroller = document.querySelector('main')
    if (scroller) {
      gsap.to(scroller, { scrollTop: 3 * window.innerHeight, duration: 1.0, ease: 'power3.inOut' })
    }
  }

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    // Greeting, name and pills are driven by scroll (effect below); the rest plays once on entry
    const fadeY = [ctaBtnRef.current, statsRef.current].filter(Boolean)

    const fadeX = [taglineCardRef.current, availCardRef.current].filter(Boolean)

    gsap.set(fadeY, { opacity: 0, y: 30 })
    gsap.set(fadeX, { opacity: 0, x: 20 })
    if (photoRef.current)  gsap.set(photoRef.current,  { opacity: 0, x: 80 })
    if (socialRef.current) gsap.set(socialRef.current, { opacity: 0, x: -20 })

    const tl = gsap.timeline({ paused: true })
    tl.to(photoRef.current,       { opacity: 1, x: 0, duration: 0.7,  ease: 'power2.out' })
      .to(ctaBtnRef.current,      { opacity: 1, y: 0, duration: 0.4,  ease: 'power2.out' }, '-=0.2')
      .to(statsRef.current,       { opacity: 1, y: 0, duration: 0.5,  ease: 'power2.out' }, '-=0.2')
      .to(taglineCardRef.current, { opacity: 1, x: 0, duration: 0.5,  ease: 'power2.out' }, '-=0.5')
      .to(availCardRef.current,   { opacity: 1, x: 0, duration: 0.5,  ease: 'power2.out' }, '-=0.3')
      .to(socialRef.current,      { opacity: 1, x: 0, duration: 0.5,  ease: 'power2.out' }, '-=0.4')

    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { tl.play(); observer.disconnect() } },
      { threshold: 0.3 },
    )
    observer.observe(section)
    return () => { observer.disconnect(); tl.kill() }
  }, [])

  // Scroll-linked reveal from the intro video (p: 0 = on the video, 1 = hero fully in place).
  // The stage is held still (translated up against the section's own slide) and uncovered
  // from the bottom with a clip-path; greeting, name and pills rise in, staggered by p.
  // Reduced motion: a plain opacity crossfade instead.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const reduced = prefersReducedMotion()
    const setStage = gsap.quickSetter(stage, 'css')
    const risers = [greetingRef.current, nameBlockRef.current, pillsRef.current]
      .map(el => el && gsap.quickSetter(el, 'css'))

    return subscribeIntroProgress(p => {
      const y = -(1 - p) * window.innerHeight
      if (reduced) {
        setStage({ y, opacity: p, clipPath: 'none' })
        return
      }
      setStage({ y, clipPath: p >= 1 ? 'none' : `inset(${((1 - p) * 100).toFixed(3)}% 0% 0% 0%)` })
      risers.forEach((set, i) => {
        if (!set) return
        const [start, span] = RISE[i]
        const t = riseEase(Math.min(Math.max((p - start) / span, 0), 1))
        set({ y: 40 * (1 - t), opacity: t })
      })
    })
  }, [])

  const sidebarSocials = SIDEBAR_LABELS
    .map(label => profile.socials.find(s => s.label === label))
    .filter(Boolean)

  return (
    <section ref={sectionRef} className={styles.section}>
      <div ref={stageRef} className={styles.stage}>

      <HeroBackground />

      {/* Photo */}
      <div ref={photoRef} className={styles.photo}>
        <Image
          src="/assets/hero.png" alt={profile.name.full}
          fill priority quality={85}
          sizes="(min-width: 768px) 55vw, 100vw"
          className={styles.photoImg}
        />
      </div>

      {/* Social Sidebar */}
      <div ref={socialRef} className={styles.socialSidebar}>
        {sidebarSocials.map(social => {
          const Icon = SOCIAL_ICON_MAP[social.label]
          if (!Icon) return null
          return (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label={social.label}
            >
              <Icon size={15} />
              <span className={styles.socialLabel}>{social.label}</span>
            </a>
          )
        })}
        <div className={styles.scrollIndicator}>
          <span className={styles.scrollText}>Scroll down</span>
          <svg width="14" height="22" viewBox="0 0 14 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="1" y="1" width="12" height="20" rx="6" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="7" cy="6" r="2" fill="currentColor"/>
          </svg>
        </div>
      </div>

      {/* Left Content Column */}
      <div className={styles.content}>

        {/* Greeting */}
        <div ref={greetingRef} className={styles.greeting}>
          <p className={styles.greetText}>{"Hi, I'm"}</p>
          <p className={styles.roleText}>{profile.roles.short}</p>
        </div>

        {/* Stacked Name */}
        <div ref={nameBlockRef} className={styles.nameBlock}>
          <p className={styles.name}>{profile.name.first}</p>
          <p className={styles.name}>{profile.name.last}</p>
        </div>

        {/* Tag Pills */}
        <div ref={pillsRef} className={styles.pills}>
          {content.hero.pills.map((tag, i) => (
            <Fragment key={tag}>
              <span className={styles.pill}>{tag}</span>
              {i < content.hero.pills.length - 1 && (
                <span className={styles.pillDot} aria-hidden="true" />
              )}
            </Fragment>
          ))}
        </div>

        {/* View Projects CTA */}
        <button ref={ctaBtnRef} type="button" className={styles.viewBtn} onClick={handleViewProjects}>
           View Projects <FiArrowUpRight />
        </button>

        {/* Stats Row */}
        <div ref={statsRef} className={styles.stats}>
          {[...profile.stats.slice(0, 2), content.hero.specialistStat].map(s => (
            <div key={s.label} className={styles.statCard}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

      </div>

      {/* Tagline + Availability Cards */}
      <div className={styles.cardsCol}>
        <div ref={taglineCardRef} className={styles.taglineCard}>
          <p className={styles.taglineText}>
            {splitTagline(profile.tagline, content.hero.taglineHighlight)}
          </p>
          <p className={styles.freelanceNote}>{content.hero.freelanceNote}</p>
        </div>

        {profile.available && (
          <div ref={availCardRef} className={styles.availCard}>
            <div className={styles.availHeader}>
              <span className={styles.availDot} />
              <span className={styles.availStatus}>{content.hero.availableLabel}</span>
            </div>
            <p className={styles.locationLine}>{content.hero.basedInPrefix} {profile.location.based}</p>
            <p className={styles.locationLine}>{content.hero.availablePrefix} {profile.location.availability}</p>
          </div>
        )}
      </div>

      </div>
    </section>
  )
}
