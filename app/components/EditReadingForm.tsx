'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Save } from 'lucide-react'
import { MileageReading } from '@/lib/types'

interface EditReadingFormProps {
  reading: MileageReading
  readings: MileageReading[]
  onSubmit: (id: string, date: string, mileage: number, note?: string) => Promise<void>
  onCancel: () => void
}

export default function EditReadingForm({ reading, readings, onSubmit, onCancel }: EditReadingFormProps) {
  const [date, setDate] = useState(reading.date)
  const [mileage, setMileage] = useState(reading.mileage.toString())
  const [note, setNote] = useState(reading.note || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState('')

  const validateMileage = (selectedDate: string, mileageNum: number): string | null => {
    // Filter out the current reading from validation
    const otherReadings = readings.filter(r => r.id !== reading.id)

    if (otherReadings.length === 0) return null

    // Sort readings by date
    const sortedReadings = [...otherReadings].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Find readings before and after the selected date
    const readingsBefore = sortedReadings.filter(r => r.date < selectedDate)
    const readingsAfter = sortedReadings.filter(r => r.date > selectedDate)

    // Check if mileage is greater than any reading before this date
    if (readingsBefore.length > 0) {
      const maxBefore = Math.max(...readingsBefore.map(r => r.mileage))
      if (mileageNum < maxBefore) {
        return `Kilometers must be at least ${maxBefore} (reading on ${readingsBefore.find(r => r.mileage === maxBefore)?.date})`
      }
    }

    // Check if mileage is less than any reading after this date
    if (readingsAfter.length > 0) {
      const minAfter = Math.min(...readingsAfter.map(r => r.mileage))
      if (mileageNum > minAfter) {
        return `Kilometers must be at most ${minAfter} (reading on ${readingsAfter.find(r => r.mileage === minAfter)?.date})`
      }
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const mileageNum = parseInt(mileage)

    const error = validateMileage(date, mileageNum)
    if (error) {
      setValidationError(error)
      return
    }

    setIsSubmitting(true)
    setValidationError('')
    try {
      await onSubmit(reading.id, date, mileageNum, note || undefined)
    } catch (error) {
      console.error('Error updating reading:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDateChange = (newDate: string) => {
    setDate(newDate)
    setValidationError('')
    if (mileage) {
      const error = validateMileage(newDate, parseInt(mileage))
      if (error) setValidationError(error)
    }
  }

  const handleMileageChange = (newMileage: string) => {
    setMileage(newMileage)
    setValidationError('')
    if (newMileage) {
      const error = validateMileage(date, parseInt(newMileage))
      if (error) setValidationError(error)
    }
  }

  // Get min and max suggestions based on date
  const getMinMaxSuggestion = () => {
    const otherReadings = readings.filter(r => r.id !== reading.id)

    if (otherReadings.length === 0) return { min: 0, max: null }

    const sortedReadings = [...otherReadings].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const readingsBefore = sortedReadings.filter(r => r.date < date)
    const readingsAfter = sortedReadings.filter(r => r.date > date)

    const min = readingsBefore.length > 0
      ? Math.max(...readingsBefore.map(r => r.mileage))
      : 0

    const max = readingsAfter.length > 0
      ? Math.min(...readingsAfter.map(r => r.mileage))
      : null

    return { min, max }
  }

  const { min: suggestedMin, max: suggestedMax } = getMinMaxSuggestion()

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="edit-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Date
        </label>
        <input
          type="date"
          id="edit-date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
        {date && new Date(date) > new Date() && (
          <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">This is a preliminary future reading</p>
        )}
      </div>

      <div>
        <label htmlFor="edit-mileage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Kilometers
        </label>
        <input
          type="number"
          id="edit-mileage"
          value={mileage}
          onChange={(e) => handleMileageChange(e.target.value)}
          min={0}
          required
          placeholder={suggestedMax ? `${suggestedMin} - ${suggestedMax} km` : `Minimum: ${suggestedMin} km`}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
        {validationError && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationError}</p>
        )}
      </div>

      <div>
        <label htmlFor="edit-note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Note (optional)
        </label>
        <input
          type="text"
          id="edit-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g., Oil change, Road trip"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || !mileage || !!validationError}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="h-4 w-4" />
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}