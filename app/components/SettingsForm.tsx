'use client'

import { useState } from 'react'
import { LeaseInfo } from '@/lib/types'
import { format, parseISO, addYears } from 'date-fns'

interface SettingsFormProps {
  leaseInfo: LeaseInfo
  onSubmit: (settings: Partial<LeaseInfo>) => Promise<void>
}

export default function SettingsForm({ leaseInfo, onSubmit }: SettingsFormProps) {
  const [startDate, setStartDate] = useState(leaseInfo.startDate)
  const [leaseLengthYears, setLeaseLengthYears] = useState(() => {
    const start = parseISO(leaseInfo.startDate)
    const end = parseISO(leaseInfo.endDate)
    const diff = end.getFullYear() - start.getFullYear()
    return diff
  })
  const [totalLimit, setTotalLimit] = useState(leaseInfo.totalLimit)
  const [overageCostPerKm, setOverageCostPerKm] = useState(leaseInfo.overageCostPerKm || 0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Calculate end date based on start date + lease length
      const start = parseISO(startDate)
      const end = addYears(start, leaseLengthYears)
      const endDate = format(end, 'yyyy-MM-dd')

      // Calculate annual limit
      const annualLimit = Math.round(totalLimit / leaseLengthYears)

      await onSubmit({
        startDate,
        endDate,
        totalLimit,
        annualLimit,
        overageCostPerKm: overageCostPerKm > 0 ? overageCostPerKm : undefined
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Lease Start Date
        </label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          required
        />
      </div>

      <div>
        <label htmlFor="leaseLengthYears" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Lease Length (Years)
        </label>
        <input
          type="number"
          id="leaseLengthYears"
          value={leaseLengthYears}
          onChange={(e) => setLeaseLengthYears(parseInt(e.target.value))}
          min="1"
          max="10"
          step="1"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          required
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          End date: {format(addYears(parseISO(startDate), leaseLengthYears), 'yyyy-MM-dd')}
        </p>
      </div>

      <div>
        <label htmlFor="totalLimit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Total Kilometer Limit
        </label>
        <input
          type="number"
          id="totalLimit"
          value={totalLimit}
          onChange={(e) => setTotalLimit(parseInt(e.target.value))}
          min="1000"
          max="200000"
          step="1000"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          required
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Annual limit: {Math.round(totalLimit / leaseLengthYears).toLocaleString('sv-SE')} km/year
        </p>
      </div>

      <div>
        <label htmlFor="overageCostPerKm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Cost per KM Over Limit (SEK)
        </label>
        <input
          type="number"
          id="overageCostPerKm"
          value={overageCostPerKm}
          onChange={(e) => setOverageCostPerKm(parseFloat(e.target.value))}
          min="0"
          step="0.01"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Optional: Cost per kilometer if you exceed the limit
        </p>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}
