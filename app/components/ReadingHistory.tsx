'use client'

import { MileageReading } from '@/lib/types'
import { formatMileage, formatDate } from '@/lib/utils'
import { Trash2, Edit } from 'lucide-react'

interface ReadingHistoryProps {
  readings: MileageReading[]
  onDelete: (id: string) => Promise<void>
  onEdit: (reading: MileageReading) => void
}

export default function ReadingHistory({ readings, onDelete, onEdit }: ReadingHistoryProps) {
  const sortedReadings = [...readings].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  if (readings.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Reading History</h2>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-2">No readings yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Add your first kilometer reading to start tracking</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Reading History</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Date</th>
              <th className="text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Kilometers</th>
              <th className="text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-300">KM Added</th>
              <th className="text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Note</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sortedReadings.map((reading, index) => {
              const prevReading = sortedReadings[index + 1]
              const milesAdded = prevReading ? reading.mileage - prevReading.mileage : 0
              const isFuture = new Date(reading.date) > new Date()

              return (
                <tr key={reading.id} className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${isFuture ? 'opacity-70' : ''}`}>
                  <td className="py-3 text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(reading.date)}
                    {isFuture && (
                      <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">(Preliminary)</span>
                    )}
                  </td>
                  <td className="py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{formatMileage(reading.mileage)}</td>
                  <td className="py-3 text-sm">
                    {milesAdded > 0 && (
                      <span className="text-green-600 dark:text-green-400">+{formatMileage(milesAdded)}</span>
                    )}
                  </td>
                  <td className="py-3 text-sm text-gray-600 dark:text-gray-400">{reading.note}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(reading)}
                        className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                        title="Edit reading"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {index !== sortedReadings.length - 1 && (
                        <button
                          onClick={() => onDelete(reading.id)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                          title="Delete reading"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}