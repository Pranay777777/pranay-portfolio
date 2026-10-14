import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { SITE_URL } from '@/lib/siteConfig'
import profile from '@/data/profile.json'

export const alt = `${profile.name.full} | ${profile.roles.headline}`

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

const ACCENT = '#f7931e'

// Tags and stats shown on the card
const TAGS  = profile.keywords.filter(k => !['Portfolio', 'India'].includes(k)).slice(0, 6)
const STATS = profile.stats.map(s => [s.value, s.label])
const [CURRENT] = profile.experience

export default async function Image() {
  // ImageResponse can't decode webp, so a JPEG crop of about.webp lives in /assets
  const photo    = await readFile(join(process.cwd(), 'assets/og-photo.jpg'), 'base64')
  const photoSrc = `data:image/jpeg;base64,${photo}`

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          background: '#050505',
          color: 'white',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            right: -120,
            top: -120,
            width: 500,
            height: 500,
            borderRadius: 999,
            background: 'rgba(247,147,30,0.15)',
          }}
        />

        {/* LEFT CONTENT */}
        <div
          style={{
            flex: 1,
            padding: '70px 60px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {/* TOP LABEL */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: ACCENT,
                marginRight: 12,
              }}
            />

            <span
              style={{
                color: ACCENT,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 4,
                textTransform: 'uppercase',
              }}
            >
              {profile.roles.headline}
            </span>
          </div>

          {/* NAME */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              lineHeight: 0.88,
              marginBottom: 24,
            }}
          >
            <span
              style={{
                fontSize: 92,
                fontWeight: 900,
                letterSpacing: -4,
              }}
            >
              {profile.name.first.toUpperCase()}
            </span>

            <span
              style={{
                fontSize: 92,
                fontWeight: 900,
                color: '#2d2d2d',
                letterSpacing: -4,
              }}
            >
              {profile.name.last.toUpperCase()}
            </span>
          </div>

          {/* DESCRIPTION */}
          <div
            style={{
              fontSize: 24,
              lineHeight: 1.5,
              color: '#9d9d9d',
              maxWidth: 540,
              marginBottom: 34,
            }}
          >
            {CURRENT ? `${CURRENT.role} at ${CURRENT.company}.` : profile.description}
          </div>

          {/* TAGS */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginBottom: 36,
              flexWrap: 'wrap',
            }}
          >
            {TAGS.map((tag) => (
              <div
                key={tag}
                style={{
                  padding: '10px 18px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 999,
                  color: ACCENT,
                  fontSize: 14,
                  fontWeight: 700,
                  display: 'flex',
                }}
              >
                {tag}
              </div>
            ))}
          </div>

          {/* STATS */}
          <div
            style={{
              display: 'flex',
              gap: 32,
            }}
          >
            {STATS.map(([value, label]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <span
                  style={{
                    fontSize: 34,
                    fontWeight: 900,
                    color: 'white',
                  }}
                >
                  {value}
                </span>

                <span
                  style={{
                    fontSize: 14,
                    color: '#7a7a7a',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div
          style={{
            width: 420,
            height: 630,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* IMAGE */}
          <img
            src={photoSrc}
            width={420}
            height={630}
            alt={profile.name.full}
            style={{
              objectFit: 'cover',
            }}
          />

          {/* OVERLAY */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to left, transparent, rgba(5,5,5,0.9))',
            }}
          />
        </div>

        {/* FOOTER URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 36,
            left: 60,
            fontSize: 16,
            color: '#5f5f5f',
            letterSpacing: 2,
          }}
        >
          {new URL(SITE_URL).host}
        </div>
      </div>
    ),
    size
  )
}