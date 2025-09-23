import { LeaseInfo, MileageReading, CalculatedStats, MonthlyStats } from './types'
import { differenceInDays, addMonths, startOfMonth, endOfMonth, format, parseISO, isBefore, isAfter } from 'date-fns'

export function calculateLeaseStats(
  readings: MileageReading[],
  leaseInfo: LeaseInfo
): CalculatedStats {
  const sortedReadings = [...readings].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const currentMileage = sortedReadings.length > 0
    ? sortedReadings[sortedReadings.length - 1].mileage
    : 0

  const startDate = parseISO(leaseInfo.startDate)
  const endDate = parseISO(leaseInfo.endDate)
  const today = new Date()

  const totalDays = differenceInDays(endDate, startDate)
  const daysElapsed = Math.min(differenceInDays(today, startDate), totalDays)
  const daysRemaining = Math.max(0, totalDays - daysElapsed)

  const dailyBudget = leaseInfo.totalLimit / totalDays
  const budgetedMileage = Math.round(dailyBudget * daysElapsed)
  const remainingBudget = leaseInfo.totalLimit - currentMileage

  const currentRate = daysElapsed > 0 ? currentMileage / daysElapsed : 0
  const projectedTotal = Math.round(currentRate * totalDays)

  const variance = budgetedMileage - currentMileage
  const isOnTrack = currentMileage <= budgetedMileage
  const percentageUsed = (currentMileage / leaseInfo.totalLimit) * 100

  const monthlyStats = generateMonthlyStats(sortedReadings, leaseInfo)

  return {
    currentMileage,
    budgetedMileage,
    remainingBudget,
    currentRate,
    projectedTotal,
    isOnTrack,
    variance,
    percentageUsed,
    daysElapsed,
    daysRemaining,
    totalDays,
    dailyBudget,
    monthlyStats
  }
}

function generateMonthlyStats(
  readings: MileageReading[],
  leaseInfo: LeaseInfo
): MonthlyStats[] {
  const stats: MonthlyStats[] = []
  const startDate = parseISO(leaseInfo.startDate)
  const endDate = parseISO(leaseInfo.endDate)
  const today = new Date()

  let currentDate = startOfMonth(startDate)
  const lastDate = endOfMonth(endDate)

  const totalDays = differenceInDays(endDate, startDate)
  const dailyBudget = leaseInfo.totalLimit / totalDays

  while (isBefore(currentDate, lastDate)) {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)

    const effectiveStart = isAfter(monthStart, startDate) ? monthStart : startDate
    const effectiveEnd = isBefore(monthEnd, endDate) ? monthEnd : endDate

    if (isAfter(effectiveStart, effectiveEnd)) {
      currentDate = addMonths(currentDate, 1)
      continue
    }

    const daysInMonth = differenceInDays(effectiveEnd, effectiveStart) + 1
    const monthBudget = Math.round(dailyBudget * daysInMonth)

    const startReading = findMileageAtDate(readings, effectiveStart)
    const endReading = findMileageAtDate(readings, effectiveEnd)

    const isProjected = isAfter(effectiveEnd, today)

    let actual = 0
    if (!isProjected && startReading !== null && endReading !== null) {
      actual = endReading - startReading
    } else if (isProjected && readings.length > 0) {
      const currentRate = readings[readings.length - 1].mileage /
        differenceInDays(today, startDate)
      actual = Math.round(currentRate * daysInMonth)
    }

    stats.push({
      month: format(currentDate, 'MMMM'),
      year: currentDate.getFullYear(),
      startMileage: startReading || 0,
      endMileage: endReading || 0,
      budget: monthBudget,
      actual,
      variance: monthBudget - actual,
      isProjected
    })

    currentDate = addMonths(currentDate, 1)
  }

  return stats
}

function findMileageAtDate(readings: MileageReading[], date: Date): number | null {
  const dateStr = format(date, 'yyyy-MM-dd')
  const exactReading = readings.find(r => r.date === dateStr)

  if (exactReading) return exactReading.mileage

  const beforeReadings = readings.filter(r =>
    isBefore(parseISO(r.date), date)
  )

  if (beforeReadings.length === 0) return null

  return beforeReadings[beforeReadings.length - 1].mileage
}

export function formatMileage(km: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(km))
}

export function formatDate(date: string): string {
  return format(parseISO(date), 'MMM d, yyyy')
}

export interface ChartData {
  labels: string[]
  actualData: (number | null)[]
  trendData: number[]
  optimalData: number[]
  projectedData: number[]
}

export function generateChartData(
  readings: MileageReading[],
  leaseInfo: LeaseInfo
): ChartData {
  const startDate = parseISO(leaseInfo.startDate)
  const endDate = parseISO(leaseInfo.endDate)
  const today = new Date()

  const sortedReadings = [...readings].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const totalDays = differenceInDays(endDate, startDate)
  const dailyBudget = leaseInfo.totalLimit / totalDays

  const labels: string[] = []
  const actualData: (number | null)[] = []
  const trendData: number[] = []
  const optimalData: number[] = []
  const projectedData: number[] = []

  // Generate monthly data points
  let currentDate = startDate
  let monthIndex = 0

  while (isBefore(currentDate, endDate) || format(currentDate, 'yyyy-MM') === format(endDate, 'yyyy-MM')) {
    const monthStr = format(currentDate, 'MMM yyyy')
    labels.push(monthStr)

    // Find actual reading for this month
    const monthReading = sortedReadings.find(r =>
      format(parseISO(r.date), 'MMM yyyy') === monthStr
    )

    // Calculate remaining kilometers for actual data
    if (monthReading) {
      actualData.push(leaseInfo.totalLimit - monthReading.mileage)
    } else if (isAfter(currentDate, today)) {
      actualData.push(null)
    } else {
      // Interpolate if between readings
      const prevReading = sortedReadings
        .filter(r => isBefore(parseISO(r.date), currentDate))
        .pop()
      actualData.push(prevReading ? leaseInfo.totalLimit - prevReading.mileage : leaseInfo.totalLimit)
    }

    // Calculate optimal remaining (linear decrease)
    const daysFromStart = differenceInDays(currentDate, startDate)
    const optimalUsed = Math.round(dailyBudget * daysFromStart)
    optimalData.push(leaseInfo.totalLimit - optimalUsed)

    // Calculate trend line remaining based on current rate
    if (sortedReadings.length > 0 && !isAfter(currentDate, today)) {
      const currentMileage = sortedReadings[sortedReadings.length - 1].mileage
      const daysElapsed = differenceInDays(today, startDate)
      const currentRate = currentMileage / daysElapsed
      const trendUsed = Math.round(currentRate * daysFromStart)
      trendData.push(leaseInfo.totalLimit - trendUsed)
    } else if (sortedReadings.length > 0) {
      // Future trend projection
      const currentMileage = sortedReadings[sortedReadings.length - 1].mileage
      const daysElapsed = differenceInDays(today, startDate)
      const currentRate = currentMileage / daysElapsed
      const trendUsed = Math.round(currentRate * daysFromStart)
      trendData.push(Math.max(0, leaseInfo.totalLimit - trendUsed))
    } else {
      trendData.push(leaseInfo.totalLimit)
    }

    // Calculate projected remaining from today onwards (optimal path to end)
    if (isAfter(currentDate, today) && sortedReadings.length > 0) {
      const currentMileage = sortedReadings[sortedReadings.length - 1].mileage
      const daysFromToday = differenceInDays(currentDate, today)
      const remainingDays = differenceInDays(endDate, today)
      const remainingBudget = leaseInfo.totalLimit - currentMileage
      const futureRate = remainingBudget / remainingDays
      const projectedUsed = currentMileage + (futureRate * daysFromToday)
      projectedData.push(Math.round(leaseInfo.totalLimit - projectedUsed))
    } else if (!isAfter(currentDate, today) && sortedReadings.length > 0) {
      // Use actual data up to today
      const lastReading = sortedReadings[sortedReadings.length - 1]
      projectedData.push(leaseInfo.totalLimit - lastReading.mileage)
    } else {
      projectedData.push(leaseInfo.totalLimit)
    }

    currentDate = addMonths(currentDate, 1)
    monthIndex++
  }

  return {
    labels,
    actualData,
    trendData,
    optimalData,
    projectedData
  }
}