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
 * Draw a section heading with a horizontal rule (matching LaTeX \section)
 */
function sectionHeading(doc, y, title) {
  if (y > 270) { doc.addPage(); y = MARGIN_T }
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
    if (y > 285) { doc.addPage(); y = MARGIN_T }
    doc.text(line, x, y)
    y += lineH
  }
  return y
}

/**
 * Print a bullet point
 */
function printBullet(doc, y, text, indent = MARGIN_L + 4) {
  if (y > 282) { doc.addPage(); y = MARGIN_T }
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

  // Contact line
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY)
  const contactParts = []
  if (profile.phone) contactParts.push(profile.phone)
  if (profile.email) contactParts.push(profile.email)
  if (profile.location?.based) contactParts.push(profile.location.based)
  const linkedIn = profile.socials?.find(s => s.label === 'LinkedIn')
  if (linkedIn) contactParts.push(linkedIn.href.replace(/^https?:\/\//, ''))
  doc.text(contactParts.join('  ·  '), PAGE_W / 2, y, { align: 'center' })
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
      if (y > 280) { doc.addPage(); y = MARGIN_T }
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BLACK)
      const label = `${category}:`
      doc.text(label, MARGIN_L, y)
      const labelW = doc.getTextWidth(label)
      doc.setFont('helvetica', 'normal')
      doc.text(value, MARGIN_L + labelW + 2, y)
      y += 4.2
    }
    y += 2
  }

  // ── EDUCATION ───────────────────────────────────────
  if (profile.education?.length) {
    y = sectionHeading(doc, y, 'Education')
    doc.setFontSize(9.5)

    for (const edu of profile.education) {
      if (y > 278) { doc.addPage(); y = MARGIN_T }
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

  // ── EXPERIENCE ──────────────────────────────────────
  if (profile.experience?.length) {
    y = sectionHeading(doc, y, 'Experience')

    for (const exp of profile.experience) {
      if (y > 270) { doc.addPage(); y = MARGIN_T }
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
      if (y > 270) { doc.addPage(); y = MARGIN_T }
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BLACK)
      doc.text(`${proj.title} (${proj.tech.join(', ')})`, MARGIN_L, y)

      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.text(proj.type, PAGE_W - MARGIN_R, y, { align: 'right' })
      y += 4.5

      // Description as bullet
      if (proj.desc) {
        y = printBullet(doc, y, proj.desc)
      }
      if (proj.subtitle) {
        y = printBullet(doc, y, proj.subtitle)
      }
      y += 2
    }
    y += 1
  }

  // ── CERTIFICATIONS ──────────────────────────────────
  if (profile.certifications?.length) {
    y = sectionHeading(doc, y, 'Certifications')

    for (const cert of profile.certifications) {
      if (y > 282) { doc.addPage(); y = MARGIN_T }
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

  // ── POSITIONS OF RESPONSIBILITY ─────────────────────
  if (profile.responsibility?.length) {
    y = sectionHeading(doc, y, 'Positions of Responsibility')

    for (const pos of profile.responsibility) {
      if (y > 270) { doc.addPage(); y = MARGIN_T }
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

  // ── PUBLICATIONS ────────────────────────────────────
  if (profile.publications?.length) {
    y = sectionHeading(doc, y, 'Publications')

    for (const pub of profile.publications) {
      if (y > 282) { doc.addPage(); y = MARGIN_T }
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...BLACK)
      doc.circle(MARGIN_L + 2, y - 1, 0.6, 'F')
      doc.text(pub.title, MARGIN_L + 4, y)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.text(pub.year, PAGE_W - MARGIN_R, y, { align: 'right' })
      y += 4.5
    }
  }

  // ── Download ────────────────────────────────────────
  const fileName = `${profile.name.first}_${profile.name.last}_Resume.pdf`
  doc.save(fileName)
}
