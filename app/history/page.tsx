'use client'

import { useState, useEffect } from 'react'
import { LeaseInfo, MileageReading } from '@/lib/types'
import ReadingHistory from '../components/ReadingHistory'
import Navigation from '../components/Navigation'
import Modal from '../components/Modal'
import ReadingForm from '../components/ReadingForm'

export default function HistoryPage() {
  const [leaseInfo, setLeaseInfo] = useState<LeaseInfo | null>(null)
  const [readings, setReadings] = useState<MileageReading[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

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
    try {
      const response = await fetch('/api/readings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date, mileage, note }),
      })

      if (!response.ok) {
        throw new Error('Failed to add reading')
      }

      await fetchData()
      setIsModalOpen(false)
    } catch (error) {
      console.error('Error adding reading:', error)
      throw error
    }
  }

  const handleDeleteReading = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reading?')) {
      return
    }

    try {
      const response = await fetch(`/api/readings?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete reading')
      }

      await fetchData()
    } catch (error) {
      console.error('Error deleting reading:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  const currentMileage = readings.length > 0
    ? Math.max(...readings.map(r => r.mileage))
    : 0

  return (
    <>
      <Navigation onAddReading={() => setIsModalOpen(true)} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reading History</h1>
          <p className="text-gray-600">
            View and manage all your kilometer readings
          </p>
        </div>

        <ReadingHistory
          readings={readings}
          onDelete={handleDeleteReading}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Kilometer Reading"
      >
        <ReadingForm
          onSubmit={handleAddReading}
          currentMileage={currentMileage}
        />
      </Modal>
    </>
  )
}