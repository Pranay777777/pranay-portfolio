'use client'

import { jsPDF } from 'jspdf'

// Colors matching the LaTeX template
const BLUE = [0, 51, 102]   // #003366
const BLACK = [0, 0, 0]
const GRAY = [80, 80, 80]

const PAGE_W = 210 // A4mm
const MARGIN_L = 10.7
const MARGIN_R = 10.7
const MARGIN_T = 12.7
const MARGIN_B = 8.1
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R

/**
 * Start a new page if fewer than `need` mm are left above the bottom margin.
 */
function ensureSpace(doc, y, need) {
  if (y + need > 297 - MARGIN_B - 4) { doc.addPage(); return MARGIN_T }
  return y
}

/**
 * Draw a section heading with a horizontal rule (matching LaTeX \section)
 */
function sectionHeading(doc, y, title) {
  y = ensureSpace(doc, y, 14)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...BLUE)
  doc.text(title, MARGIN_L, y)
  y += 1.2
  doc.setDrawColor(...BLUE)
  doc.setLineWidth(0.4)
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y)
  y += 4
  return y
}

/**
 * Print wrapped text and return new Y. Auto-adds pages.
 */
function printWrapped(doc, x, y, text, maxW, lineH = 4.2) {
  const lines = doc.splitTextToSize(text, maxW)
  for (const line of lines) {
    y = ensureSpace(doc, y, lineH)
    doc.text(line, x, y)
    y += lineH
  }
  return y
}

/**
 * Print a bullet point
 */
function printBullet(doc, y, text, indent = MARGIN_L + 4) {
  y = ensureSpace(doc, y, 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...BLACK)
  // bullet dot
  doc.circle(indent - 2, y - 1, 0.6, 'F')
  const maxW = CONTENT_W - (indent - MARGIN_L) - 2
  y = printWrapped(doc, indent, y, text, maxW, 3.8)
  return y
}

/**
 * Print a row of text segments starting at x; segments with a `url` become
 * clickable links (blue). Returns the x after the last segment.
 * The link box is drawn tight around the glyphs (textWithLink's box reaches
 * up into the previous line).
 */
function printSegments(doc, x, y, segments) {
  const fontMm = doc.getFontSize() * 25.4 / 72
  for (const seg of segments) {
    const w = doc.getTextWidth(seg.text)
    doc.setTextColor(...(seg.url ? BLUE : (seg.color ?? GRAY)))
    doc.text(seg.text, x, y)
    if (seg.url) doc.link(x, y - fontMm * 0.8, w, fontMm, { url: seg.url })
    x += w
  }
  return x
}

/**
 * Join segments with a separator, e.g. [a, ' · ', b, ' · ', c]
 */
function joinSegments(items, sep) {
  return items.flatMap((item, i) => (i ? [{ text: sep }, item] : [item]))
}

/**
 * Generate and download a PDF resume from profile data
 */
export default function generateResume(profile) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.setFont('helvetica')

  let y = MARGIN_T

  // ── HEADER ──────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...BLUE)
  doc.text(profile.name.full.toUpperCase(), PAGE_W / 2, y, { align: 'center' })
  y += 6

  // Contact line (GitHub + LinkedIn are clickable)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  const contact = []
  if (profile.email) contact.push({ text: profile.email })
  if (profile.location?.based) contact.push({ text: profile.location.based })
  for (const label of ['GitHub', 'LinkedIn']) {
    const s = profile.socials?.find(s => s.label === label)
    if (s) contact.push({ text: s.href.replace(/^https?:\/\/(www\.)?/, ''), url: s.href })
  }
  const contactSegs = joinSegments(contact, '  ·  ')
  const contactW = contactSegs.reduce((w, s) => w + doc.getTextWidth(s.text), 0)
  printSegments(doc, (PAGE_W - contactW) / 2, y, contactSegs)
  y += 6

  // ── PROFESSIONAL SUMMARY ────────────────────────────
  if (profile.bio) {
    y = sectionHeading(doc, y, 'Professional Summary')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...BLACK)
    y = printWrapped(doc, MARGIN_L, y, profile.bio, CONTENT_W, 3.8)
    y += 3
  }

  // ── TECHNICAL SKILLS ────────────────────────────────
  const skills = profile.resumeSkills
  if (skills && Object.keys(skills).length > 0) {
    y = sectionHeading(doc, y, 'Technical Skills')
    doc.setFontSize(9.5)

    for (const [category, value] of Object.entries(skills)) {
      y = ensureSpace(doc, y, 4.2)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BLACK)
      const label = `${category}:`
      doc.text(label, MARGIN_L, y)
      const labelW = doc.getTextWidth(label) + 2
      doc.setFont('helvetica', 'normal')
      y = printWrapped(doc, MARGIN_L + labelW, y, value, CONTENT_W - labelW, 4.2)
    }
    y += 2
  }

  // ── EXPERIENCE ──────────────────────────────────────
  if (profile.experience?.length) {
    y = sectionHeading(doc, y, 'Experience')

    for (const exp of profile.experience) {
      y = ensureSpace(doc, y, 12)
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BLACK)
      doc.text(`${exp.role} — ${exp.company}`, MARGIN_L, y)

      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.text(`${exp.period} - ${exp.periodEnd}`, PAGE_W - MARGIN_R, y, { align: 'right' })
      y += 4.5

      // Bullets
      if (exp.bullets?.length) {
        for (const bullet of exp.bullets) {
          y = printBullet(doc, y, bullet)
        }
      }
      y += 2
    }
    y += 1
  }

  // ── PROJECTS ────────────────────────────────────────
  if (profile.projects?.length) {
    y = sectionHeading(doc, y, 'Projects')

    for (const proj of profile.projects) {
      // Keep each project's block (title, desc, key result, links) on one page
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      const descLines = proj.desc ? doc.splitTextToSize(proj.desc, CONTENT_W - 6).length : 0
      y = ensureSpace(doc, y, 4.5 + descLines * 3.8 + (proj.metric ? 3.8 : 0) + (proj.links ? 3.8 : 0))
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BLACK)
      doc.text(proj.title, MARGIN_L, y)
      let x = MARGIN_L + doc.getTextWidth(proj.title)

      // Tech after the title when it fits next to the right-aligned type, else on its own line
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      const typeW = proj.type ? doc.getTextWidth(proj.type) : 0
      if (proj.type) doc.text(proj.type, PAGE_W - MARGIN_R, y, { align: 'right' })
      const tech = (proj.tech || []).join(', ')
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRAY)
      if (tech) {
        const inline = ` (${tech})`
        if (x + doc.getTextWidth(inline) < PAGE_W - MARGIN_R - typeW - 3) {
          doc.text(inline, x, y)
        } else {
          y += 4
          y = printWrapped(doc, MARGIN_L, y, tech, CONTENT_W, 3.8) - 4
        }
      }
      y += 4.5

      if (proj.desc) {
        y = printBullet(doc, y, proj.desc)
      }

      if (proj.metric) {
        y = ensureSpace(doc, y, 3.8)
        doc.setFontSize(9.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BLACK)
        const label = 'Key result:'
        doc.text(label, MARGIN_L + 4, y)
        const labelW = doc.getTextWidth(label) + 1.5   // measured in bold, before switching font
        doc.setFont('helvetica', 'normal')
        doc.text(proj.metric, MARGIN_L + 4 + labelW, y)
        y += 3.8
      }

      const links = [
        proj.links?.demo && { text: 'Live demo', url: proj.links.demo },
        proj.links?.code && { text: 'Code', url: proj.links.code },
        proj.links?.log  && { text: 'Build log', url: proj.links.log },
      ].filter(Boolean)
      if (links.length) {
        y = ensureSpace(doc, y, 3.8)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        printSegments(doc, MARGIN_L + 4, y, joinSegments(links, '  ·  '))
        y += 3.8
      }
      y += 2
    }
    y += 1
  }

  // ── EDUCATION ───────────────────────────────────────
  if (profile.education?.length) {
    y = sectionHeading(doc, y, 'Education')
    doc.setFontSize(9.5)

    for (const edu of profile.education) {
      y = ensureSpace(doc, y, 9)
      // Institution + period
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BLACK)
      doc.text(edu.institution, MARGIN_L, y)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.text(edu.period, PAGE_W - MARGIN_R, y, { align: 'right' })
      y += 4

      // Degree + score
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.text(edu.degree, MARGIN_L, y)
      if (edu.score) {
        doc.setFont('helvetica', 'bold')
        doc.text(edu.score, PAGE_W - MARGIN_R, y, { align: 'right' })
      }
      y += 5
    }
    y += 1
  }

  // ── CERTIFICATIONS ──────────────────────────────────
  if (profile.certifications?.length) {
    y = sectionHeading(doc, y, 'Certifications')

    for (const cert of profile.certifications) {
      y = ensureSpace(doc, y, 4.5)
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...BLACK)
      doc.circle(MARGIN_L + 2, y - 1, 0.6, 'F')
      doc.text(`${cert.title} — ${cert.org}`, MARGIN_L + 4, y)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.text(cert.year, PAGE_W - MARGIN_R, y, { align: 'right' })
      y += 4.5
    }
    y += 2
  }

  // ── PUBLICATIONS ────────────────────────────────────
  if (profile.publications?.length) {
    y = sectionHeading(doc, y, 'Publications')

    for (const pub of profile.publications) {
      y = ensureSpace(doc, y, 4.5)
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...BLACK)
      doc.circle(MARGIN_L + 2, y - 1, 0.6, 'F')
      const x = printSegments(doc, MARGIN_L + 4, y, [{ text: pub.title, url: pub.link, color: BLACK }])

      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(...BLACK)
      doc.text(pub.year, PAGE_W - MARGIN_R, y, { align: 'right' })
      if (pub.platform) {
        const platform = `— ${pub.platform}`
        doc.setTextColor(...GRAY)
        if (x + 1.5 + doc.getTextWidth(platform) < PAGE_W - MARGIN_R - doc.getTextWidth(pub.year) - 3) {
          doc.text(platform, x + 1.5, y)
        } else {
          y += 3.8
          doc.text(pub.platform, MARGIN_L + 4, y)
        }
      }
      y += 4.5
    }
    y += 2
  }

  // ── POSITIONS OF RESPONSIBILITY ─────────────────────
  if (profile.responsibility?.length) {
    y = sectionHeading(doc, y, 'Positions of Responsibility')

    for (const pos of profile.responsibility) {
      y = ensureSpace(doc, y, 12)
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BLACK)
      doc.text(`${pos.title} — ${pos.org}`, MARGIN_L, y)

      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.text(pos.period, PAGE_W - MARGIN_R, y, { align: 'right' })
      y += 4.5

      if (pos.bullets?.length) {
        for (const bullet of pos.bullets) {
          y = printBullet(doc, y, bullet)
        }
      }
      y += 2
    }
  }

  // ── Download ────────────────────────────────────────
  const fileName = `${profile.name.first}_${profile.name.last}_Resume.pdf`
  doc.save(fileName)
}
