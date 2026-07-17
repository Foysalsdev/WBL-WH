'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to console (production: replace with Sentry/LogRocket)
    console.error('[Global Error]', error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '2rem',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          background: 'oklch(0.985 0.002 240)',
        }}>
          <div style={{
            maxWidth: '500px',
            textAlign: 'center',
            padding: '2rem',
            borderRadius: '1rem',
            background: 'white',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              An unexpected error occurred. The development team has been notified.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <pre style={{
                background: '#f3f4f6',
                padding: '1rem',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                overflow: 'auto',
                marginBottom: '1rem',
                textAlign: 'left',
              }}>
                {error.message}
                {error.stack && '\n\n' + error.stack}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <Button onClick={reset} variant="outline">
                Try Again
              </Button>
              <Button onClick={() => window.location.href = '/'}>
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
