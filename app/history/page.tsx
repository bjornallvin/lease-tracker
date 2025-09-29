'use client'

import { useState, useEffect } from 'react'
import { LeaseInfo, MileageReading } from '@/lib/types'
import { createAuthHeaders } from '@/lib/auth'
import ReadingHistory from '../components/ReadingHistory'
import Navigation from '../components/Navigation'
import Modal from '../components/Modal'
import ReadingForm from '../components/ReadingForm'
import EditReadingForm from '../components/EditReadingForm'
import LoginForm from '../components/LoginForm'
import { useAuth } from '../contexts/AuthContext'

export default function HistoryPage() {
  const [leaseInfo, setLeaseInfo] = useState<LeaseInfo | null>(null)
  const [readings, setReadings] = useState<MileageReading[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [editingReading, setEditingReading] = useState<MileageReading | null>(null)
  const { isAuthenticated, token } = useAuth()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [leaseRes, readingsRes] = await Promise.all([
        fetch('/api/lease'),
        fetch('/api/readings')
      ])

      if (!leaseRes.ok || !readingsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const leaseData = await leaseRes.json()
      const readingsData = await readingsRes.json()

      setLeaseInfo(leaseData)
      setReadings(readingsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddReading = async (date: string, mileage: number, note?: string) => {
    if (!isAuthenticated || !token) {
      throw new Error('Authentication required')
    }

    try {
      const response = await fetch('/api/readings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...createAuthHeaders(token),
        },
        body: JSON.stringify({ date, mileage, note }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication expired. Please sign in again.')
        }
        throw new Error('Failed to add reading')
      }

      await fetchData()
      setIsModalOpen(false)
    } catch (error) {
      console.error('Error adding reading:', error)
      throw error
    }
  }

  const handleEditReading = async (id: string, date: string, mileage: number, note?: string) => {
    if (!isAuthenticated || !token) {
      throw new Error('Authentication required')
    }

    try {
      const response = await fetch('/api/readings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...createAuthHeaders(token),
        },
        body: JSON.stringify({ id, date, mileage, note }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication expired. Please sign in again.')
        }
        throw new Error('Failed to update reading')
      }

      await fetchData()
      setEditingReading(null)
    } catch (error) {
      console.error('Error updating reading:', error)
      throw error
    }
  }

  const handleDeleteReading = async (id: string) => {
    if (!isAuthenticated || !token) {
      alert('Authentication required to delete readings')
      return
    }

    if (!confirm('Are you sure you want to delete this reading?')) {
      return
    }

    try {
      const response = await fetch(`/api/readings?id=${id}`, {
        method: 'DELETE',
        headers: {
          ...createAuthHeaders(token),
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          alert('Authentication expired. Please sign in again.')
          return
        }
        throw new Error('Failed to delete reading')
      }

      await fetchData()
    } catch (error) {
      console.error('Error deleting reading:', error)
    }
  }

  const handleAddReadingClick = () => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true)
    } else {
      setIsModalOpen(true)
    }
  }

  const handleEditClick = (reading: MileageReading) => {
    if (!isAuthenticated) {
      alert('Please sign in to edit readings')
      return
    }
    setEditingReading(reading)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-900 dark:text-white">Loading...</div>
      </div>
    )
  }

  const currentMileage = readings.length > 0
    ? Math.max(...readings.map(r => r.mileage))
    : 0

  return (
    <>
      <Navigation onAddReading={handleAddReadingClick} />

      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        <div className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Reading History</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage all your kilometer readings
          </p>
        </div>

        <ReadingHistory
          readings={readings}
          onDelete={handleDeleteReading}
          onEdit={handleEditClick}
          isAuthenticated={isAuthenticated}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Kilometer Reading"
      >
        <ReadingForm
          onSubmit={handleAddReading}
          readings={readings}
        />
      </Modal>

      <Modal
        isOpen={!!editingReading}
        onClose={() => setEditingReading(null)}
        title="Edit Kilometer Reading"
      >
        {editingReading && (
          <EditReadingForm
            reading={editingReading}
            readings={readings}
            onSubmit={handleEditReading}
            onCancel={() => setEditingReading(null)}
          />
        )}
      </Modal>

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