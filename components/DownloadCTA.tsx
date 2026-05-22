import React from 'react'

export function DownloadCTA() {
  return (
    <div style={{
      background: '#000',
      borderRadius: '16px',
      padding: '2.5rem 2rem',
      marginTop: '3rem',
      textAlign: 'center',
      color: '#fff',
    }}>
      <h2 style={{ color: '#FFD700', fontSize: '1.6rem', marginBottom: '0.75rem' }}>
        Stop Guessing. Start Dominating.
      </h2>
      <p style={{ color: '#bbb', marginBottom: '1.75rem', maxWidth: '520px', margin: '0 auto 1.75rem' }}>
        MR. WORKOUT tracks your CNS score, builds your progressive overload
        blueprint, and coaches every rep across 89 exercises. Zero excuses. Free to start.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <a
          href="https://apps.apple.com/app/mr-workout"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: '#FFD700', color: '#000',
            padding: '0.85rem 2.25rem', borderRadius: '8px',
            fontWeight: 800, fontSize: '0.95rem', textDecoration: 'none',
          }}
        >
          ↓ Download on App Store
        </a>
        <a
          href="https://play.google.com/store/apps/mr-workout"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            border: '2px solid #FFD700', color: '#FFD700',
            padding: '0.85rem 2.25rem', borderRadius: '8px',
            fontWeight: 800, fontSize: '0.95rem', textDecoration: 'none',
          }}
        >
          ↓ Get on Google Play
        </a>
      </div>
    </div>
  )
}
