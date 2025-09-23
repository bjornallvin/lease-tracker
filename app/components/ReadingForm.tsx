'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'

interface ReadingFormProps {
  onSubmit: (date: string, mileage: number, note?: string) => Promise<void>
  currentMileage: number
}

export default function ReadingForm({ onSubmit, currentMileage }: ReadingFormProps) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [mileage, setMileage] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const mileageNum = parseInt(mileage)

    if (mileageNum < currentMileage) {
      alert('New kilometers must be greater than or equal to current kilometers')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(date, mileageNum, note || undefined)
      setMileage('')
      setNote('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
    } catch (error) {
      console.error('Error submitting reading:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={format(new Date(), 'yyyy-MM-dd')}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="mileage" className="block text-sm font-medium text-gray-700 mb-1">
          Kilometers
        </label>
        <input
          type="number"
          id="mileage"
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
          min={currentMileage}
          required
          placeholder={`Minimum: ${currentMileage} km`}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
          Note (optional)
        </label>
        <input
          type="text"
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g., Oil change, Road trip"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !mileage}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Plus className="h-4 w-4" />
        {isSubmitting ? 'Adding...' : 'Add Reading'}
      </button>
    </form>
  )
}