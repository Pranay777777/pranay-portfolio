'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/reportError'

// Reports uncaught errors and unhandled promise rejections (renders nothing)
export default function ErrorReporter() {
  useEffect(() => {
    function onError(e) {
      reportError({ message: e.message || e.error?.message, source: e.filename, line: e.lineno })
    }
    function onRejection(e) {
      const r = e.reason
      reportError({ kind: 'unhandledrejection', message: r?.message ?? String(r) })
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
