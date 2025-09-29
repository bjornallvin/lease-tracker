'use client'

import { MileageReading } from '@/lib/types'
import { formatMileage, formatDate } from '@/lib/utils'
import { Trash2, Edit } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'

interface ReadingHistoryProps {
  readings: MileageReading[]
  onDelete: (id: string) => Promise<void>
  onEdit: (reading: MileageReading) => void
  isAuthenticated?: boolean
}

export default function ReadingHistory({ readings, onDelete, onEdit, isAuthenticated = false }: ReadingHistoryProps) {
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

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Date</th>
              <th className="text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Kilometers</th>
              <th className="text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-300">KM Added</th>
              <th className="text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Days</th>
              <th className="text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Avg Rate</th>
              <th className="text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Note</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sortedReadings.map((reading, index) => {
              const prevReading = sortedReadings[index + 1]
              const milesAdded = prevReading ? reading.mileage - prevReading.mileage : 0
              const isFuture = new Date(reading.date) > new Date()

              // Calculate days since last reading
              const daysSinceLast = prevReading
                ? differenceInDays(parseISO(reading.date), parseISO(prevReading.date))
                : 0

              // Calculate average rate during this period
              const avgRate = daysSinceLast > 0
                ? milesAdded / daysSinceLast
                : 0

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
                  <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                    {daysSinceLast > 0 ? daysSinceLast : '-'}
                  </td>
                  <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                    {avgRate > 0 ? `${avgRate.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km/day` : '-'}
                  </td>
                  <td className="py-3 text-sm text-gray-600 dark:text-gray-400">{reading.note}</td>
                  <td className="py-3">
                    {isAuthenticated ? (
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
                    ) : (
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Sign in to edit
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {sortedReadings.map((reading, index) => {
          const prevReading = sortedReadings[index + 1]
          const milesAdded = prevReading ? reading.mileage - prevReading.mileage : 0
          const isFuture = new Date(reading.date) > new Date()

          // Calculate days since last reading
          const daysSinceLast = prevReading
            ? differenceInDays(parseISO(reading.date), parseISO(prevReading.date))
            : 0

          // Calculate average rate during this period
          const avgRate = daysSinceLast > 0
            ? milesAdded / daysSinceLast
            : 0

          return (
            <div key={reading.id} className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 ${isFuture ? 'opacity-70' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(reading.date)}
                  {isFuture && (
                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">(Preliminary)</span>
                  )}
                </div>
                {isAuthenticated && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(reading)}
                      className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                      title="Edit reading"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    {index !== sortedReadings.length - 1 && (
                      <button
                        onClick={() => onDelete(reading.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                        title="Delete reading"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {formatMileage(reading.mileage)} km
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
                {milesAdded > 0 && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Added:</span>
                    <span className="ml-1 text-green-600 dark:text-green-400 font-medium">+{formatMileage(milesAdded)} km</span>
                  </div>
                )}
                {daysSinceLast > 0 && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Days:</span>
                    <span className="ml-1 font-medium">{daysSinceLast}</span>
                  </div>
                )}
                {avgRate > 0 && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Rate:</span>
                    <span className="ml-1 font-medium">{avgRate.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km/day</span>
                  </div>
                )}
                {reading.note && (
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">Note:</span>
                    <span className="ml-1 font-medium">{reading.note}</span>
                  </div>
                )}
              </div>

              {!isAuthenticated && (
                <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
                  Sign in to edit
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}