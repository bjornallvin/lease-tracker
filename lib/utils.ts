import { LeaseInfo, MileageReading, CalculatedStats, MonthlyStats } from './types'
import { differenceInDays, addDays, addMonths, startOfMonth, endOfMonth, format, parseISO, isBefore, isAfter, isSameDay } from 'date-fns'

export function calculateLeaseStats(
  readings: MileageReading[],
  leaseInfo: LeaseInfo,
  referenceDate?: string
): CalculatedStats {
  const sortedReadings = [...readings].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Use reference date if provided, otherwise use today
  const refDate = referenceDate ? parseISO(referenceDate) : new Date()

  // Find the reading closest to reference date (or interpolate)
  let currentMileage = 0
  if (sortedReadings.length > 0) {
    // Format the reference date consistently for comparison
    const refDateStr = format(refDate, 'yyyy-MM-dd')

    // First try to find exact match for the reference date
    const readingAtDate = sortedReadings.find(r => r.date === refDateStr)
    if (readingAtDate) {
      currentMileage = readingAtDate.mileage
    } else {
      // Find readings before and after reference date for interpolation
      const pastReadings = sortedReadings.filter(r => r.date <= refDateStr)
      const futureReadings = sortedReadings.filter(r => r.date > refDateStr)

      if (pastReadings.length > 0 && futureReadings.length > 0) {
        // Interpolate between two readings
        const prevReading = pastReadings[pastReadings.length - 1]
        const nextReading = futureReadings[0]

        const prevDate = parseISO(prevReading.date)
        const nextDate = parseISO(nextReading.date)
        const totalDays = differenceInDays(nextDate, prevDate)
        const daysFromPrev = differenceInDays(refDate, prevDate)

        if (totalDays > 0) {
          const ratio = daysFromPrev / totalDays
          currentMileage = Math.round(prevReading.mileage + (nextReading.mileage - prevReading.mileage) * ratio)
        } else {
          currentMileage = prevReading.mileage
        }
      } else if (pastReadings.length > 0) {
        // Use the last reading before reference date
        currentMileage = pastReadings[pastReadings.length - 1].mileage
      } else if (futureReadings.length > 0) {
        // If no past readings, use the first future reading (edge case)
        currentMileage = 0
      }
    }
  }

  const startDate = parseISO(leaseInfo.startDate)
  const endDate = parseISO(leaseInfo.endDate)
  const today = refDate

  const totalDays = differenceInDays(endDate, startDate)
  const daysElapsed = Math.min(differenceInDays(today, startDate), totalDays)
  const daysRemaining = Math.max(0, totalDays - daysElapsed)

  const dailyBudget = leaseInfo.totalLimit / totalDays
  const budgetedMileage = Math.round(dailyBudget * daysElapsed)
  const remainingBudget = leaseInfo.totalLimit - currentMileage

  // Calculate the daily budget needed from this point forward to use exactly the remaining km
  const remainingDailyBudget = daysRemaining > 0 ? remainingBudget / daysRemaining : 0

  const currentRate = daysElapsed > 0 ? currentMileage / daysElapsed : 0
  const projectedTotal = Math.round(currentRate * totalDays)

  // The trend projection is the same as the simple projection
  // Both use current average rate × total days
  // This matches the orange "Trend" line in the chart
  const projectedTotalTrend = projectedTotal

  const variance = budgetedMileage - currentMileage
  const isOnTrack = currentMileage <= budgetedMileage
  const percentageUsed = (currentMileage / leaseInfo.totalLimit) * 100
  const optimalPercentage = (budgetedMileage / leaseInfo.totalLimit) * 100

  const monthlyStats = generateMonthlyStats(sortedReadings, leaseInfo)

  return {
    currentMileage,
    budgetedMileage,
    remainingBudget,
    currentRate,
    projectedTotal,
    projectedTotalTrend,
    isOnTrack,
    variance,
    percentageUsed,
    optimalPercentage,
    daysElapsed,
    daysRemaining,
    totalDays,
    dailyBudget,
    remainingDailyBudget,
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
  return new Intl.NumberFormat('sv-SE').format(Math.round(km))
}

export function formatDate(date: string): string {
  return format(parseISO(date), 'yyyy-MM-dd')
}

export interface ChartData {
  labels: string[]
  actualData: (number | null)[]
  preliminaryData: (number | null)[]
  trendData: number[]
  optimalData: number[]
  projectedData: number[]
  currentDateIndex: number
  selectedDateIndex?: number
  zeroCrossingIndex?: number
  zeroCrossingDate?: string
}

export function generateChartData(
  readings: MileageReading[],
  leaseInfo: LeaseInfo,
  selectedDate?: string,
  includePreliminary: boolean = true
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
  const preliminaryData: (number | null)[] = []
  const trendData: number[] = []
  const optimalData: number[] = []
  const projectedData: number[] = []
  let currentDateIndex = -1
  let selectedDateIndex: number | undefined = undefined
  let zeroCrossingIndex: number | undefined = undefined
  let zeroCrossingDate: string | undefined = undefined

  // Create data points for each actual reading
  const dataPoints: Date[] = []

  // Add all actual reading dates
  sortedReadings.forEach(reading => {
    dataPoints.push(parseISO(reading.date))
  })

  // Add monthly points for future projections
  let currentDate = addMonths(startDate, 1)
  while (isBefore(currentDate, endDate) || format(currentDate, 'yyyy-MM') === format(endDate, 'yyyy-MM')) {
    // Only add if not too close to an existing reading
    const hasNearbyReading = sortedReadings.some(r => {
      const readingDate = parseISO(r.date)
      return Math.abs(differenceInDays(readingDate, currentDate)) < 15
    })

    if (!hasNearbyReading && isAfter(currentDate, today)) {
      dataPoints.push(currentDate)
    }

    currentDate = addMonths(currentDate, 1)
  }

  // Sort all data points
  dataPoints.sort((a, b) => a.getTime() - b.getTime())

  // Generate data for each point
  dataPoints.forEach((date, index) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const label = format(date, 'MMM dd, yyyy')
    labels.push(label)

    // Track current date index
    if (Math.abs(differenceInDays(date, today)) < 1) {
      currentDateIndex = index
    }

    // Track selected date index
    if (selectedDate && dateStr === selectedDate) {
      selectedDateIndex = index
    }

    // Find actual reading for this date
    const actualReading = sortedReadings.find(r => r.date === dateStr)

    // Calculate remaining kilometers for actual and preliminary data
    if (actualReading) {
      const isFuture = isAfter(date, today)
      if (isFuture) {
        actualData.push(null)
        preliminaryData.push(leaseInfo.totalLimit - actualReading.mileage)
      } else {
        actualData.push(leaseInfo.totalLimit - actualReading.mileage)
        preliminaryData.push(null)
      }
    } else if (isAfter(date, today)) {
      actualData.push(null)
      preliminaryData.push(null)
    } else {
      // Interpolate if between readings
      const prevReading = sortedReadings
        .filter(r => isBefore(parseISO(r.date), date))
        .pop()
      const nextReading = sortedReadings
        .find(r => isAfter(parseISO(r.date), date))

      if (prevReading && nextReading) {
        // Linear interpolation
        const prevDate = parseISO(prevReading.date)
        const nextDate = parseISO(nextReading.date)
        const totalSpan = differenceInDays(nextDate, prevDate)
        const currentSpan = differenceInDays(date, prevDate)
        const ratio = currentSpan / totalSpan
        const interpolatedMileage = prevReading.mileage +
          (nextReading.mileage - prevReading.mileage) * ratio
        actualData.push(leaseInfo.totalLimit - Math.round(interpolatedMileage))
        preliminaryData.push(null)
      } else if (prevReading) {
        actualData.push(leaseInfo.totalLimit - prevReading.mileage)
        preliminaryData.push(null)
      } else {
        actualData.push(leaseInfo.totalLimit)
        preliminaryData.push(null)
      }
    }

    // Calculate optimal remaining (linear decrease)
    const daysFromStart = differenceInDays(date, startDate)
    const optimalUsed = Math.round(dailyBudget * daysFromStart)
    optimalData.push(leaseInfo.totalLimit - optimalUsed)

    // Calculate trend line - simple straight line based on average daily rate
    if (sortedReadings.length > 0) {
      // Get the reference point for calculating average rate
      // Use either selected date or today's actual readings
      const referenceReadings = includePreliminary
        ? sortedReadings.filter(r => !isAfter(parseISO(r.date), selectedDate ? parseISO(selectedDate) : today))
        : sortedReadings.filter(r => !isAfter(parseISO(r.date), today))

      if (referenceReadings.length > 0) {
        // Use the last reading up to reference date
        const lastReading = referenceReadings[referenceReadings.length - 1]
        const daysElapsed = differenceInDays(parseISO(lastReading.date), startDate)
        const averageRate = daysElapsed > 0 ? lastReading.mileage / daysElapsed : 0

        // Simple linear projection: rate * days from start
        const trendUsed = Math.round(averageRate * daysFromStart)
        trendData.push(Math.max(0, leaseInfo.totalLimit - trendUsed))
      } else {
        trendData.push(leaseInfo.totalLimit)
      }
    } else {
      trendData.push(leaseInfo.totalLimit)
    }

    // Calculate projected remaining (recommended path to use full allowance)
    // Use selected date (or today) as the starting point
    const referenceDate = selectedDate ? parseISO(selectedDate) : today

    if (sortedReadings.length > 0) {
      // Find mileage at reference date
      let referenceMileage = 0
      let refDateToUse = referenceDate

      if (selectedDate) {
        // Find the exact reading at selected date or interpolate
        const readingAtDate = sortedReadings.find(r => r.date === selectedDate)
        if (readingAtDate) {
          // Exact reading exists at this date
          referenceMileage = readingAtDate.mileage
        } else {
          // Interpolate between readings
          const beforeReadings = sortedReadings.filter(r => !isAfter(parseISO(r.date), referenceDate))
          const afterReadings = sortedReadings.filter(r => isAfter(parseISO(r.date), referenceDate))

          if (beforeReadings.length > 0 && afterReadings.length > 0) {
            const prevReading = beforeReadings[beforeReadings.length - 1]
            const nextReading = afterReadings[0]
            const prevDate = parseISO(prevReading.date)
            const nextDate = parseISO(nextReading.date)
            const totalSpan = differenceInDays(nextDate, prevDate)
            const currentSpan = differenceInDays(referenceDate, prevDate)
            const ratio = currentSpan / totalSpan
            referenceMileage = prevReading.mileage + (nextReading.mileage - prevReading.mileage) * ratio
          } else if (beforeReadings.length > 0) {
            referenceMileage = beforeReadings[beforeReadings.length - 1].mileage
          }
        }
      } else {
        // Use actual reading at today
        const actualReadings = sortedReadings.filter(r => !isAfter(parseISO(r.date), today))
        if (actualReadings.length > 0) {
          referenceMileage = actualReadings[actualReadings.length - 1].mileage
        }
      }

      // For dates at or after reference, show straight line projection
      if (!isBefore(date, refDateToUse)) {
        const daysFromReference = differenceInDays(date, refDateToUse)
        const remainingDays = differenceInDays(endDate, refDateToUse)
        const remainingBudget = leaseInfo.totalLimit - referenceMileage
        const futureRate = remainingDays > 0 ? remainingBudget / remainingDays : 0
        const projectedUsed = referenceMileage + (futureRate * daysFromReference)
        projectedData.push(Math.round(leaseInfo.totalLimit - projectedUsed))
      } else {
        // Before reference date, don't show recommended path
        projectedData.push(null)
      }
    } else {
      projectedData.push(null)
    }
  })

  // Find where trend line crosses zero (runs out of km)
  // Look through the trend data we just calculated
  for (let i = 0; i < trendData.length - 1; i++) {
    // Check if the trend crosses from positive to zero or negative
    if (trendData[i] > 0 && trendData[i + 1] <= 0) {
      // Found a crossing point
      // Interpolate to find exact crossing point
      const ratio = trendData[i] / (trendData[i] - trendData[i + 1])

      // Always use the current index (i) since that's closer to where it actually crosses
      // The crossing happens between i and i+1, but visually it's closer to i
      zeroCrossingIndex = i

      // Calculate the exact date for the label
      if (i < dataPoints.length - 1) {
        const date1 = dataPoints[i]
        const date2 = dataPoints[i + 1]
        const daysBetween = differenceInDays(date2, date1)
        const crossingDays = Math.floor(daysBetween * ratio)
        const crossingDate = addDays(date1, crossingDays)
        zeroCrossingDate = format(crossingDate, 'yyyy-MM-dd')
      } else {
        // Use the label at the crossing point
        zeroCrossingDate = labels[i]
      }
      break
    }
  }

  // If no crossing found in data points but trend is heading to zero, calculate it
  if (!zeroCrossingIndex && trendData.length > 0) {
    const lastTrendValue = trendData[trendData.length - 1]
    const secondLastTrendValue = trendData.length > 1 ? trendData[trendData.length - 2] : lastTrendValue

    // If trend is decreasing and positive, calculate when it would hit zero
    if (lastTrendValue > 0 && lastTrendValue < secondLastTrendValue) {
      const lastDate = dataPoints[dataPoints.length - 1]
      const trendRate = secondLastTrendValue - lastTrendValue // km decrease per period

      if (trendRate > 0) {
        const periodsToZero = lastTrendValue / trendRate
        const daysPerPeriod = dataPoints.length > 1
          ? differenceInDays(dataPoints[dataPoints.length - 1], dataPoints[dataPoints.length - 2])
          : 30 // default to monthly

        const daysToZero = Math.floor(periodsToZero * daysPerPeriod)
        const zeroDate = addDays(lastDate, daysToZero)

        // Only show if before lease end
        if (isBefore(zeroDate, endDate)) {
          zeroCrossingDate = format(zeroDate, 'yyyy-MM-dd')
          // Put indicator at the edge of chart
          zeroCrossingIndex = dataPoints.length - 1
        }
      }
    }
  }

  return {
    labels,
    actualData,
    preliminaryData,
    trendData,
    optimalData,
    projectedData,
    currentDateIndex,
    selectedDateIndex,
    zeroCrossingIndex,
    zeroCrossingDate
  }
}