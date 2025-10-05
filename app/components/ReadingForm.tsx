'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { MileageReading } from '@/lib/types'
import { isReadingInFuture, compareReadings, getReadingDateTime } from '@/lib/utils'

interface ReadingFormProps {
  onSubmit: (date: string, mileage: number, note?: string, time?: string) => Promise<void>
  readings?: MileageReading[]
}

export default function ReadingForm({ onSubmit, readings = [] }: ReadingFormProps) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('')
  const [mileage, setMileage] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState('')

  const validateMileage = (selectedDate: string, mileageNum: number, selectedTime?: string): string | null => {
    if (readings.length === 0) return null

    // Sort readings by date and time
    const sortedReadings = [...readings].sort(compareReadings)

    // Create datetime for current reading
    const currentDateTime = getReadingDateTime(selectedDate, selectedTime)

    // Find readings before and after the current datetime
    const readingsBefore = sortedReadings.filter(r =>
      getReadingDateTime(r.date, r.time).getTime() < currentDateTime.getTime()
    )
    const readingsAfter = sortedReadings.filter(r =>
      getReadingDateTime(r.date, r.time).getTime() > currentDateTime.getTime()
    )

    // Check if mileage is greater than any reading before this datetime
    if (readingsBefore.length > 0) {
      const maxBefore = Math.max(...readingsBefore.map(r => r.mileage))
      if (mileageNum < maxBefore) {
        const maxReading = readingsBefore.find(r => r.mileage === maxBefore)
        const timeStr = maxReading?.time ? ` ${maxReading.time}` : ''
        return `Kilometers must be at least ${maxBefore} (reading on ${maxReading?.date}${timeStr})`
      }
    }

    // Check if mileage is less than any reading after this datetime
    if (readingsAfter.length > 0) {
      const minAfter = Math.min(...readingsAfter.map(r => r.mileage))
      if (mileageNum > minAfter) {
        const minReading = readingsAfter.find(r => r.mileage === minAfter)
        const timeStr = minReading?.time ? ` ${minReading.time}` : ''
        return `Kilometers must be at most ${minAfter} (reading on ${minReading?.date}${timeStr})`
      }
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const mileageNum = parseFloat(mileage)

    const error = validateMileage(date, mileageNum, time)
    if (error) {
      setValidationError(error)
      return
    }

    setIsSubmitting(true)
    setValidationError('')
    try {
      await onSubmit(date, mileageNum, note || undefined, time || undefined)
      setMileage('')
      setNote('')
      setTime('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
    } catch (error) {
      console.error('Error submitting reading:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDateChange = (newDate: string) => {
    setDate(newDate)
    setValidationError('')
    if (mileage) {
      const error = validateMileage(newDate, parseInt(mileage), time)
      if (error) setValidationError(error)
    }
  }

  const handleMileageChange = (newMileage: string) => {
    setMileage(newMileage)
    setValidationError('')
    if (newMileage) {
      const error = validateMileage(date, parseFloat(newMileage), time)
      if (error) setValidationError(error)
    }
  }

  const handleTimeChange = (newTime: string) => {
    setTime(newTime)
    setValidationError('')
    if (mileage) {
      const error = validateMileage(date, parseInt(mileage), newTime)
      if (error) setValidationError(error)
    }
  }

  // Get min and max suggestions based on date and time
  const getMinMaxSuggestion = () => {
    if (readings.length === 0) return { min: 0, max: null }

    // Sort readings by date and time
    const sortedReadings = [...readings].sort(compareReadings)

    // Create datetime for current reading
    const currentDateTime = getReadingDateTime(date, time)

    // Find readings before and after the current datetime
    const readingsBefore = sortedReadings.filter(r =>
      getReadingDateTime(r.date, r.time).getTime() < currentDateTime.getTime()
    )
    const readingsAfter = sortedReadings.filter(r =>
      getReadingDateTime(r.date, r.time).getTime() > currentDateTime.getTime()
    )

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
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Date
        </label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
        {date && isReadingInFuture(date, time) && (
          <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">This is a preliminary future reading</p>
        )}
      </div>

      <div>
        <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Time (optional)
        </label>
        <input
          type="time"
          id="time"
          value={time}
          onChange={(e) => handleTimeChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
      </div>

      <div>
        <label htmlFor="mileage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Kilometers
        </label>
        <input
          type="number"
          id="mileage"
          value={mileage}
          onChange={(e) => handleMileageChange(e.target.value)}
          min={0}
          step="0.1"
          required
          placeholder={suggestedMax ? `${suggestedMin} - ${suggestedMax} km` : `Minimum: ${suggestedMin} km`}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
        {validationError && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationError}</p>
        )}
      </div>

      <div>
        <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Note (optional)
        </label>
        <input
          type="text"
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g., Oil change, Road trip"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !mileage || !!validationError}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Plus className="h-4 w-4" />
        {isSubmitting ? 'Adding...' : 'Add Reading'}
      </button>
    </form>
  )
}