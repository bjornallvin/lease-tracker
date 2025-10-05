'use client'

import { useState } from 'react'
import { formatKilometers, parseSwedishNumber } from '@/lib/formatters'

interface TripEntryFormProps {
  authToken: string | null
  onTripCreated?: () => void
}

export default function TripEntryForm({ authToken, onTripCreated }: TripEntryFormProps) {
  const [distance, setDistance] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!authToken) {
      setError('Authentication required')
      return
    }

    // Parse distance (handle Swedish format with spaces)
    const parsedDistance = parseSwedishNumber(distance)

    // Client-side validation
    if (!distance || isNaN(parsedDistance)) {
      setError('Distance is required')
      return
    }

    if (parsedDistance < 1 || parsedDistance > 2000) {
      setError('Trip distance must be between 1 and 2 000 km')
      return
    }

    if (note.length > 200) {
      setError('Note exceeds maximum length (200 characters)')
      return
    }

    // Validate end time > start time if both provided
    if (startTime && endTime) {
      const startDate = new Date(startTime)
      const endDate = new Date(endTime)
      if (endDate <= startDate) {
        setError('End time must be after start time')
        return
      }
    }

    setIsSubmitting(true)

    try {
      const body: { distance: number; startTime?: string; endTime?: string; note?: string } = {
        distance: parsedDistance
      }

      if (startTime) {
        // Convert datetime-local to ISO 8601
        body.startTime = new Date(startTime).toISOString()
      }

      if (endTime) {
        // Convert datetime-local to ISO 8601
        body.endTime = new Date(endTime).toISOString()
      }

      if (note) {
        body.note = note
      }

      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create trip')
        return
      }

      // Success! - data is an array of created readings (1 or 2)
      setSuccess(true)
      setDistance('')
      setStartTime('')
      setEndTime('')
      setNote('')

      // Call parent callback to refresh readings
      if (onTripCreated) {
        onTripCreated()
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)

    } catch (err) {
      console.error('Error creating trip:', err)
      setError('Failed to create trip. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format current datetime for input default
  const getCurrentDateTimeLocal = () => {
    const now = new Date()
    // Format: YYYY-MM-DDTHH:MM
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Add Trip
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Distance Input */}
        <div>
          <label htmlFor="trip-distance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Distance (km) *
          </label>
          <input
            id="trip-distance"
            type="text"
            inputMode="decimal"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="e.g., 45 or 1 234,5"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px]"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Enter trip distance (1-2 000 km, decimals allowed)
          </p>
        </div>

        {/* Trip Start Time (Optional) */}
        <div>
          <label htmlFor="trip-start-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Trip Start Time (optional)
          </label>
          <input
            id="trip-start-time"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px]"
            disabled={isSubmitting}
          />
        </div>

        {/* Trip End Time (Optional) */}
        <div>
          <label htmlFor="trip-end-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Trip End Time (optional)
          </label>
          <input
            id="trip-end-time"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px]"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Leave times empty to use current time. Default: end = now, start = 1 minute before end.
          </p>
        </div>

        {/* Note Input (Optional) */}
        <div>
          <label htmlFor="trip-note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Note (optional)
          </label>
          <input
            id="trip-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., To office"
            maxLength={200}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px]"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {note.length}/200 characters
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg">
            Trip added successfully!
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !authToken}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors min-h-[44px] disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Adding Trip...' : 'Add Trip'}
        </button>
      </form>
    </div>
  )
}
