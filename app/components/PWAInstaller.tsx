'use client'

import { useEffect } from 'react'

export default function PWAInstaller() {
  useEffect(() => {
    // Temporarily disable service worker for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Service worker disabled in development')
      return
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration)
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError)
        })
    }
  }, [])

  return null
}