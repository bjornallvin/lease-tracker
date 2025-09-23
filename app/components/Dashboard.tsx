'use client'

import { CalculatedStats } from '@/lib/types'
import { formatMileage } from '@/lib/utils'
import { TrendingUp, TrendingDown, Gauge, Calendar, AlertCircle, CheckCircle } from 'lucide-react'

interface DashboardProps {
  stats: CalculatedStats
  totalLimit: number
}

export default function Dashboard({ stats, totalLimit }: DashboardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Current Kilometers</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatMileage(stats.currentMileage)} km
            </p>
            <p className="text-xs text-gray-500 mt-1">
              of {formatMileage(totalLimit)} km total
            </p>
          </div>
          <Gauge className="h-8 w-8 text-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Budget Status</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.variance > 0 ? '+' : ''}{formatMileage(Math.abs(stats.variance))}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.isOnTrack ? 'Under budget' : 'Over budget'}
            </p>
          </div>
          {stats.isOnTrack ? (
            <CheckCircle className="h-8 w-8 text-green-500" />
          ) : (
            <AlertCircle className="h-8 w-8 text-red-500" />
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Daily Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.currentRate.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              km/day (budget: {stats.dailyBudget.toFixed(1)})
            </p>
          </div>
          {stats.currentRate > stats.dailyBudget ? (
            <TrendingUp className="h-8 w-8 text-orange-500" />
          ) : (
            <TrendingDown className="h-8 w-8 text-green-500" />
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Projected Total</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatMileage(stats.projectedTotal)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              at current rate
            </p>
          </div>
          <TrendingUp className="h-8 w-8 text-purple-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Days Remaining</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.daysRemaining}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              of {stats.totalDays} total
            </p>
          </div>
          <Calendar className="h-8 w-8 text-indigo-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Usage</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.percentageUsed.toFixed(1)}%
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  stats.isOnTrack ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, stats.percentageUsed)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}