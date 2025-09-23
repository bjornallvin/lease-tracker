'use client'

import { MileageReading } from '@/lib/types'
import { formatMileage, formatDate } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

interface ReadingHistoryProps {
  readings: MileageReading[]
  onDelete: (id: string) => Promise<void>
}

export default function ReadingHistory({ readings, onDelete }: ReadingHistoryProps) {
  const sortedReadings = [...readings].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold mb-4">Reading History</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 text-sm font-medium text-gray-700">Date</th>
              <th className="text-left py-2 text-sm font-medium text-gray-700">Kilometers</th>
              <th className="text-left py-2 text-sm font-medium text-gray-700">KM Added</th>
              <th className="text-left py-2 text-sm font-medium text-gray-700">Note</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sortedReadings.map((reading, index) => {
              const prevReading = sortedReadings[index + 1]
              const milesAdded = prevReading ? reading.mileage - prevReading.mileage : 0

              return (
                <tr key={reading.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 text-sm">{formatDate(reading.date)}</td>
                  <td className="py-3 text-sm font-medium">{formatMileage(reading.mileage)}</td>
                  <td className="py-3 text-sm">
                    {milesAdded > 0 && (
                      <span className="text-green-600">+{formatMileage(milesAdded)}</span>
                    )}
                  </td>
                  <td className="py-3 text-sm text-gray-600">{reading.note}</td>
                  <td className="py-3">
                    {index !== sortedReadings.length - 1 && (
                      <button
                        onClick={() => onDelete(reading.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete reading"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
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