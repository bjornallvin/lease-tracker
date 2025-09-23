'use client'

import { useState, useEffect } from 'react'
import { LeaseInfo, MileageReading, CalculatedStats } from '@/lib/types'
import { calculateLeaseStats, generateChartData } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import Dashboard from './Dashboard'
import ReadingForm from './ReadingForm'
import Modal from './Modal'
import Navigation from './Navigation'
import dynamic from 'next/dynamic'

const MileageChart = dynamic(() => import('./MileageChart'), {
  ssr: false,
  loading: () => <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 h-96 flex items-center justify-center">Loading chart...</div>
})

export default function MileageTracker() {
  const [leaseInfo, setLeaseInfo] = useState<LeaseInfo | null>(null)
  const [readings, setReadings] = useState<MileageReading[]>([])
  const [stats, setStats] = useState<CalculatedStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [includePreliminary, setIncludePreliminary] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (leaseInfo && readings) {
      // Filter out future readings if not including preliminary
      const filteredReadings = includePreliminary
        ? readings
        : readings.filter(r => new Date(r.date) <= new Date())

      const calculatedStats = calculateLeaseStats(filteredReadings, leaseInfo, selectedDate || undefined)
      setStats(calculatedStats)
    }
  }, [leaseInfo, readings, selectedDate, includePreliminary])

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

  const handleDataPointClick = (dateLabel: string, mileage: number) => {
    // Find the actual reading for this date label
    const filteredReadings = includePreliminary
      ? readings
      : readings.filter(r => new Date(r.date) <= new Date())

    const reading = filteredReadings.find(r => {
      const formattedDate = format(parseISO(r.date), 'MMM dd, yyyy')
      return formattedDate === dateLabel
    })

    if (reading) {
      setSelectedDate(reading.date)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-900 dark:text-white">Loading...</div>
      </div>
    )
  }

  if (!leaseInfo || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600 dark:text-red-400">Failed to load data</div>
      </div>
    )
  }

  return (
    <>
      <Navigation onAddReading={() => setIsModalOpen(true)} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor your vehicle usage and stay within your lease limits
          </p>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {selectedDate && (
              <p className="mb-1">
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  ← Reset to today
                </button>
              </p>
            )}
            {readings.length > 0 && (
              <p>Last reading: <span className="font-medium">{readings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date}</span></p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Dashboard stats={stats} totalLimit={leaseInfo.totalLimit} referenceDate={selectedDate || undefined} />

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Kilometers Over Time</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Use preliminary in calculations</span>
                <button
                  onClick={() => setIncludePreliminary(!includePreliminary)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    includePreliminary ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={includePreliminary}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      includePreliminary ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            <MileageChart
              data={generateChartData(
                readings,  // Always pass all readings to show them on chart
                leaseInfo,
                selectedDate || undefined,
                includePreliminary  // Pass flag to control calculations
              )}
              onDataPointClick={handleDataPointClick}
              readings={readings}
              selectedDate={selectedDate || undefined}
            />
          </div>
        </div>
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

    </>
  )
}