'use client'

import { CalculatedStats } from '@/lib/types'
import { formatMileage } from '@/lib/utils'
import { TrendingUp, TrendingDown, Gauge, Calendar, AlertCircle, CheckCircle } from 'lucide-react'

interface DashboardProps {
  stats: CalculatedStats
  totalLimit: number
  referenceDate?: string
}

export default function Dashboard({ stats, totalLimit, referenceDate }: DashboardProps) {
  const dateLabel = referenceDate || new Date().toLocaleDateString('sv-SE')

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Showing data calculated for: <span className="font-semibold">{dateLabel}</span>
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
          Click any data point on the graph to change the reference date
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Kilometers at Date</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatMileage(stats.currentMileage)} km
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              of {formatMileage(totalLimit)} km total
            </p>
          </div>
          <Gauge className="h-8 w-8 text-blue-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Budget Status</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.variance > 0 ? '+' : ''}{formatMileage(Math.abs(stats.variance))}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats.isOnTrack ? 'Under budget' : 'Over budget'}
            </p>
            {stats.daysToOptimal > 0 && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Park for {stats.daysToOptimal} days to reach optimal
              </p>
            )}
          </div>
          {stats.isOnTrack ? (
            <CheckCircle className="h-8 w-8 text-green-500" />
          ) : (
            <AlertCircle className="h-8 w-8 text-red-500" />
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg daily rate since start</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.currentRate.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km/day
            </p>
            <div className="space-y-1 mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Optimal: {stats.dailyBudget.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km/day
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Available from now: {stats.remainingDailyBudget.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km/day
              </p>
            </div>
          </div>
          {stats.currentRate > stats.remainingDailyBudget ? (
            <TrendingUp className="h-8 w-8 text-orange-500" />
          ) : (
            <TrendingDown className="h-8 w-8 text-green-500" />
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Projected Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatMileage(stats.projectedTotal)}
            </p>
            <div className="space-y-1 mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                At current rate
              </p>
              <p className={`text-xs ${stats.projectedTotal > totalLimit ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {stats.projectedTotal > totalLimit ? '+' : ''}{formatMileage(stats.projectedTotal - totalLimit)} km from limit
              </p>
            </div>
          </div>
          <TrendingUp className="h-8 w-8 text-purple-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Days Remaining</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.daysRemaining}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              of {stats.totalDays} total
            </p>
          </div>
          <Calendar className="h-8 w-8 text-indigo-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="w-full">
            <p className="text-sm text-gray-600 dark:text-gray-400">Usage</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.percentageUsed.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Optimal: {stats.optimalPercentage.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
            </p>
            <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mt-2">
              <div
                className={`h-3 rounded-full ${
                  stats.isOnTrack ? 'bg-green-500' : 'bg-red-500'
                } absolute top-0 left-0`}
                style={{ width: `${Math.min(100, stats.percentageUsed)}%` }}
              />
              {/* Optimal indicator */}
              <div
                className="absolute top-0 h-3 w-0.5 bg-blue-600 dark:bg-blue-400"
                style={{ left: `${Math.min(100, stats.optimalPercentage)}%` }}
                title={`Optimal: ${stats.optimalPercentage.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>0%</span>
              <span className="text-blue-600 dark:text-blue-400">↑ Optimal</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}