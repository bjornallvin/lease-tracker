'use client'

import { useState, useEffect } from 'react'
import { LeaseInfo } from '@/lib/types'
import { createAuthHeaders } from '@/lib/auth'
import SettingsForm from '../components/SettingsForm'
import Navigation from '../components/Navigation'
import Modal from '../components/Modal'
import LoginForm from '../components/LoginForm'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [leaseInfo, setLeaseInfo] = useState<LeaseInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const { isAuthenticated, token } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetchLeaseInfo()
  }, [])

  const fetchLeaseInfo = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/lease')
      if (!response.ok) {
        throw new Error('Failed to fetch lease info')
      }
      const data = await response.json()
      setLeaseInfo(data)
    } catch (error) {
      console.error('Error fetching lease info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (settings: Partial<LeaseInfo>) => {
    if (!isAuthenticated || !token) {
      throw new Error('Authentication required')
    }

    try {
      const response = await fetch('/api/lease', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...createAuthHeaders(token),
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication expired. Please sign in again.')
        }
        throw new Error('Failed to save settings')
      }

      const updatedLease = await response.json()
      setLeaseInfo(updatedLease)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      throw error
    }
  }

  const handleAddReadingClick = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-900 dark:text-white">Loading...</div>
      </div>
    )
  }

  if (!leaseInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600 dark:text-red-400">Failed to load settings</div>
      </div>
    )
  }

  return (
    <>
      <Navigation onAddReading={handleAddReadingClick} />

      <div className="max-w-2xl mx-auto px-4 py-4 md:py-8">
        <div className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure your lease parameters and tracking preferences
          </p>
        </div>

        {saveSuccess && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-green-700 dark:text-green-400">
            Settings saved successfully!
          </div>
        )}

        {!isAuthenticated ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You must be signed in to modify settings.
            </p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Sign In
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <SettingsForm leaseInfo={leaseInfo} onSubmit={handleSubmit} />
          </div>
        )}
      </div>

      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        title="Admin Sign In"
      >
        <LoginForm onClose={() => setIsLoginModalOpen(false)} />
      </Modal>
    </>
  )
}
