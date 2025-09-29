'use client'

import { useState, useEffect } from 'react'
import { LeaseInfo, MileageReading, CalculatedStats } from '@/lib/types'
import { calculateLeaseStats } from '@/lib/utils'
import { createAuthHeaders } from '@/lib/auth'
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  addDays,
  differenceInDays,
  isSameWeek,
  isAfter,
  isBefore,
  isToday,
  addWeeks,
  subWeeks
} from 'date-fns'
import Navigation from '../components/Navigation'
import Modal from '../components/Modal'
import ReadingForm from '../components/ReadingForm'
import LoginForm from '../components/LoginForm'
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface WeeklyStats {
  weekStart: Date
  weekEnd: Date
  weeklyBudget: number
  usedThisWeek: number
  remainingThisWeek: number
  dailyBudget: number
  isCurrentWeek: boolean
  daysIntoWeek: number
  projectedWeeklyUsage: number
  isOnTrack: boolean
}

export default function WeeklyPage() {
  const [leaseInfo, setLeaseInfo] = useState<LeaseInfo | null>(null)
  const [readings, setReadings] = useState<MileageReading[]>([])
  const [stats, setStats] = useState<CalculatedStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null)
  const { isAuthenticated, token, isLoading: authLoading } = useAuth()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (leaseInfo && readings && readings.length > 0) {
      const calculatedStats = calculateLeaseStats(readings, leaseInfo)
      setStats(calculatedStats)

      // Calculate weekly stats using recommended rate
      const weekly = calculateWeeklyStats(readings, leaseInfo, currentWeek, calculatedStats)
      setWeeklyStats(weekly)
    }
  }, [leaseInfo, readings, currentWeek])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [leaseRes, readingsRes] = await Promise.all([
        fetch('/api/lease'),
        fetch('/api/readings')
      ])

      if (!leaseRes.ok || !readingsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const leaseData = await leaseRes.json()
      const readingsData = await readingsRes.json()

      setLeaseInfo(leaseData)
      setReadings(readingsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateWeeklyStats = (
    readings: MileageReading[],
    leaseInfo: LeaseInfo,
    weekDate: Date,
    stats?: CalculatedStats
  ): WeeklyStats => {
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 }) // Monday
    const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 }) // Sunday
    const today = new Date()
    const isCurrentWeek = isSameWeek(weekDate, today, { weekStartsOn: 1 })

    // Use recommended daily budget (based on remaining km and days) if available
    // Otherwise fall back to optimal rate
    const leaseStart = parseISO(leaseInfo.startDate)
    const leaseEnd = parseISO(leaseInfo.endDate)
    const totalDays = differenceInDays(leaseEnd, leaseStart)
    const optimalDailyBudget = leaseInfo.totalLimit / totalDays

    // Use recommended rate from stats if available, otherwise use optimal rate
    const dailyBudget = stats?.remainingDailyBudget || optimalDailyBudget
    const weeklyBudget = dailyBudget * 7

    // Find readings at start and end of week
    const sortedReadings = [...readings].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Get mileage at start of week
    const weekStartMileage = getMileageAtDate(sortedReadings, weekStart, leaseStart)

    // Get mileage at end of week (or current date if it's the current week)
    const endDate = isCurrentWeek ? today : weekEnd
    const weekEndMileage = getMileageAtDate(sortedReadings, endDate, leaseStart)

    const usedThisWeek = Math.max(0, weekEndMileage - weekStartMileage)
    const remainingThisWeek = Math.max(0, weeklyBudget - usedThisWeek)

    // Calculate days into the week
    const daysIntoWeek = isCurrentWeek
      ? Math.min(differenceInDays(today, weekStart) + 1, 7)
      : 7

    // Project weekly usage based on current rate
    const projectedWeeklyUsage = isCurrentWeek && daysIntoWeek > 0
      ? (usedThisWeek / daysIntoWeek) * 7
      : usedThisWeek

    const isOnTrack = projectedWeeklyUsage <= weeklyBudget

    return {
      weekStart,
      weekEnd,
      weeklyBudget,
      usedThisWeek,
      remainingThisWeek,
      dailyBudget,
      isCurrentWeek,
      daysIntoWeek,
      projectedWeeklyUsage,
      isOnTrack
    }
  }

  const getMileageAtDate = (
    readings: MileageReading[],
    date: Date,
    leaseStart: Date
  ): number => {
    const dateStr = format(date, 'yyyy-MM-dd')

    // Check for exact reading
    const exactReading = readings.find(r => r.date === dateStr)
    if (exactReading) return exactReading.mileage

    // Find readings before and after the date
    const beforeReadings = readings.filter(r =>
      new Date(r.date) <= date
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const afterReadings = readings.filter(r =>
      new Date(r.date) > date
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    if (beforeReadings.length > 0 && afterReadings.length > 0) {
      // Interpolate between readings
      const prevReading = beforeReadings[0]
      const nextReading = afterReadings[0]
      const prevDate = parseISO(prevReading.date)
      const nextDate = parseISO(nextReading.date)
      const totalDays = differenceInDays(nextDate, prevDate)
      const daysFromPrev = differenceInDays(date, prevDate)

      if (totalDays > 0) {
        const ratio = daysFromPrev / totalDays
        return prevReading.mileage + (nextReading.mileage - prevReading.mileage) * ratio
      }
      return prevReading.mileage
    } else if (beforeReadings.length > 0) {
      return beforeReadings[0].mileage
    } else if (afterReadings.length > 0) {
      // If date is before any readings and before lease start, return 0
      if (isBefore(date, leaseStart)) return 0
      // Otherwise estimate based on rate to first reading
      const firstReading = afterReadings[0]
      const daysFromStart = differenceInDays(parseISO(firstReading.date), leaseStart)
      const rate = daysFromStart > 0 ? firstReading.mileage / daysFromStart : 0
      const daysFromStartToDate = Math.max(0, differenceInDays(date, leaseStart))
      return rate * daysFromStartToDate
    }

    return 0
  }

  const handleAddReading = async (date: string, mileage: number, note?: string) => {
    if (!isAuthenticated || !token) {
      throw new Error('Authentication required')
    }

    try {
      const response = await fetch('/api/readings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...createAuthHeaders(token),
        },
        body: JSON.stringify({ date, mileage, note }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication expired. Please sign in again.')
        }
        throw new Error('Failed to add reading')
      }

      await fetchData()
      setIsModalOpen(false)
    } catch (error) {
      console.error('Error adding reading:', error)
      throw error
    }
  }

  const handleAddReadingClick = () => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true)
    } else {
      setIsModalOpen(true)
    }
  }

  const goToPreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1))
  }

  const goToNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1))
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-900 dark:text-white">Loading...</div>
      </div>
    )
  }

  if (!leaseInfo || !weeklyStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600 dark:text-red-400">Failed to load data</div>
      </div>
    )
  }

  const progressPercentage = Math.min((weeklyStats.usedThisWeek / weeklyStats.weeklyBudget) * 100, 100)
  const projectedPercentage = Math.min((weeklyStats.projectedWeeklyUsage / weeklyStats.weeklyBudget) * 100, 100)

  return (
    <>
      <Navigation onAddReading={handleAddReadingClick} />

      <div className="max-w-4xl mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Weekly Tracker</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your weekly progress and stay on target
          </p>
        </div>

        {/* Week Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          {/* Compact Week Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousWeek}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="text-center flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {format(weeklyStats.weekStart, 'MMM d')} - {format(weeklyStats.weekEnd, 'MMM d, yyyy')}
              </h2>
              {weeklyStats.isCurrentWeek && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full mt-1">
                  <Calendar className="h-3 w-3" />
                  Current Week
                </span>
              )}
            </div>

            <button
              onClick={goToNextWeek}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Next week"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {!weeklyStats.isCurrentWeek && (
            <div className="text-center mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={goToCurrentWeek}
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                Go to current week
              </button>
            </div>
          )}
        </div>

        {/* Weekly Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Used This Week */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Used This Week</h3>
              <TrendingUp className={`h-4 w-4 ${weeklyStats.usedThisWeek > weeklyStats.weeklyBudget ? 'text-red-500' : 'text-blue-500'}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(weeklyStats.usedThisWeek).toLocaleString()} km
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              of {Math.round(weeklyStats.weeklyBudget).toLocaleString()} km budget
            </p>
          </div>

          {/* Remaining This Week */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Remaining</h3>
              <TrendingDown className={`h-4 w-4 ${weeklyStats.remainingThisWeek < 0 ? 'text-red-500' : 'text-green-500'}`} />
            </div>
            <p className={`text-2xl font-bold ${weeklyStats.remainingThisWeek < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
              {Math.round(weeklyStats.remainingThisWeek).toLocaleString()} km
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {weeklyStats.remainingThisWeek < 0 ? 'over budget' : 'left this week'}
            </p>
          </div>

          {/* Daily Budget */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Daily Budget</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(weeklyStats.dailyBudget).toLocaleString()} km
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              per day average
            </p>
          </div>

          {/* Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</h3>
            </div>
            <p className={`text-lg font-semibold ${weeklyStats.isOnTrack ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {weeklyStats.isOnTrack ? 'On Track' : 'Over Budget'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {weeklyStats.isCurrentWeek
                ? `Day ${weeklyStats.daysIntoWeek} of 7`
                : 'Full week'
              }
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Weekly Progress</h3>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {progressPercentage.toFixed(1)}% used
            </span>
          </div>

          <div className="relative">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all duration-300 ${
                  progressPercentage > 100
                    ? 'bg-red-500 dark:bg-red-600'
                    : progressPercentage > 80
                      ? 'bg-yellow-500 dark:bg-yellow-600'
                      : 'bg-blue-500 dark:bg-blue-600'
                }`}
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>

            {/* Projected line */}
            {weeklyStats.isCurrentWeek && weeklyStats.projectedWeeklyUsage !== weeklyStats.usedThisWeek && (
              <div
                className="absolute top-0 w-0.5 h-4 bg-orange-500 dark:bg-orange-400"
                style={{ left: `${Math.min(projectedPercentage, 100)}%` }}
                title={`Projected: ${Math.round(weeklyStats.projectedWeeklyUsage)} km`}
              />
            )}
          </div>

          {weeklyStats.isCurrentWeek && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between items-center">
                <span>
                  Projected week total: <span className={`font-medium ${weeklyStats.isOnTrack ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {Math.round(weeklyStats.projectedWeeklyUsage).toLocaleString()} km
                  </span>
                </span>
                {!weeklyStats.isOnTrack && (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {Math.round(weeklyStats.projectedWeeklyUsage - weeklyStats.weeklyBudget).toLocaleString()} km over
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Kilometer Reading"
      >
        <ReadingForm
          onSubmit={handleAddReading}
          readings={readings}
        />
      </Modal>

      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        title="Admin Sign In"
      >
        <LoginForm onClose={() => setIsLoginModalOpen(false)} />
      </Modal>
    </>
  )
}