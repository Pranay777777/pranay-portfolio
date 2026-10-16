'use client' // Error boundaries must be Client Components

import ErrorFallback from '@/components/ui/ErrorFallback'

export default function Error({ error }) {
  return <ErrorFallback error={error} kind="error-boundary" />
}
