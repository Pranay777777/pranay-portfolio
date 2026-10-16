'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/reportError'
import profile from '@/data/profile.json'
import content from '@/data/content.json'
import styles from '@/styles/ui/ErrorFallback.module.css'

const COPY = content.errorPage

// Shared fallback for app/error.js and app/global-error.js
export default function ErrorFallback({ error, kind }) {
  useEffect(() => {
    reportError({ kind, message: error?.digest ? `${error.message} (digest ${error.digest})` : error?.message })
  }, [error, kind])

  return (
    <main className={styles.wrap}>
      <p className={styles.eyebrow}>{COPY.eyebrow}</p>
      <h1 className={styles.title}>{COPY.title}</h1>
      <p className={styles.body}>{COPY.body}</p>
      <div className={styles.actions}>
        {/* Full reload: the site is static, so this is the most reliable recovery */}
        <button type="button" className={styles.reload} onClick={() => window.location.reload()}>
          {COPY.reload}
        </button>
        <a className={styles.contact} href={`mailto:${profile.email}`}>{COPY.contact}</a>
      </div>
    </main>
  )
}
