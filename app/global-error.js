'use client' // Error boundaries must be Client Components

import './globals.css'
import ErrorFallback from '@/components/ui/ErrorFallback'
import content from '@/data/content.json'

// Replaces the root layout when it fails, so it brings its own <html>/<body> and styles
export default function GlobalError({ error }) {
  return (
    <html lang="en">
      <body>
        <title>{content.errorPage.eyebrow}</title>
        <ErrorFallback error={error} kind="global-error" />
      </body>
    </html>
  )
}
