'use client'

import { useState, useEffect } from 'react'
import { LeaseInfo, MileageReading, CalculatedStats } from '@/lib/types'
import { calculateLeaseStats } from '@/lib/utils'
import Dashboard from './Dashboard'
import ReadingForm from './ReadingForm'
import ReadingHistory from './ReadingHistory'

export default function MileageTracker() {
  const [leaseInfo, setLeaseInfo] = useState<LeaseInfo | null>(null)
  const [readings, setReadings] = useState<MileageReading[]>([])
  const [stats, setStats] = useState<CalculatedStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (leaseInfo && readings) {
      const calculatedStats = calculateLeaseStats(readings, leaseInfo)
      setStats(calculatedStats)
    }
  }, [leaseInfo, readings])

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

  if (!leaseInfo || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Failed to load data</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Lease Mileage Tracker</h1>
        <p className="text-gray-600">
          Track your vehicle mileage against your lease limits
        </p>
      </div>

      <div className="space-y-6">
        <Dashboard stats={stats} totalLimit={leaseInfo.totalLimit} />
        <ReadingForm onSubmit={handleAddReading} currentMileage={stats.currentMileage} />
        <ReadingHistory readings={readings} onDelete={handleDeleteReading} />
      </div>
    </div>
  )
}