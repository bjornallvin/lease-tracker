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

  // Calculate days needed to pause driving to reach optimal line
  let daysToOptimal = 0
  if (variance < 0) {
    // If over budget (negative variance), calculate days needed
    // The optimal line increases by dailyBudget each day
    // So we need to wait until: currentMileage = budgetedMileage + (dailyBudget * daysWaiting)
    // Solving for daysWaiting: daysWaiting = -variance / dailyBudget
    daysToOptimal = Math.ceil(Math.abs(variance) / dailyBudget)
  }

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
    daysToOptimal,
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
  dates: string[]
  actualData: (number | null)[]
  preliminaryData: (number | null)[]
  trendData: number[]
  optimalData: number[]
  projectedData: (number | null)[]
  currentDateIndex: number
  selectedDateIndex?: number
  zeroCrossingIndex?: number
  zeroCrossingDate?: string
  year1CrossingIndex?: number
  year1CrossingDate?: string
  year2CrossingIndex?: number
  year2CrossingDate?: string
  viewMode: 'total' | 'year1' | 'year2' | 'year3'
  yearOffset: number
  totalLimit: number
}

export function generateChartData(
  readings: MileageReading[],
  leaseInfo: LeaseInfo,
  selectedDate?: string,
  includePreliminary: boolean = true,
  viewMode: 'total' | 'year1' | 'year2' | 'year3' = 'total'
): ChartData {
  const startDate = parseISO(leaseInfo.startDate)
  const endDate = parseISO(leaseInfo.endDate)
  const today = new Date()

  // Calculate year boundaries when in year view
  let viewStartDate = startDate
  let viewEndDate = endDate
  let yearOffset = 0 // Which year we're in (0-based)

  if (viewMode !== 'total') {
    // Extract year number from viewMode (year1 = 0, year2 = 1, year3 = 2)
    yearOffset = parseInt(viewMode.replace('year', '')) - 1
    viewStartDate = addDays(startDate, yearOffset * 365)
    viewEndDate = addDays(viewStartDate, 365)

    // Don't go past lease end
    if (isAfter(viewEndDate, endDate)) {
      viewEndDate = endDate
    }
  }

  const sortedReadings = [...readings].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const totalDays = differenceInDays(endDate, startDate)
  const dailyBudget = leaseInfo.totalLimit / totalDays

  const labels: string[] = []
  const dates: string[] = []
  const actualData: (number | null)[] = []
  const preliminaryData: (number | null)[] = []
  const trendData: number[] = []
  const optimalData: number[] = []
  const projectedData: (number | null)[] = []
  let currentDateIndex = -1
  let selectedDateIndex: number | undefined = undefined
  let zeroCrossingIndex: number | undefined = undefined
  let zeroCrossingDate: string | undefined = undefined
  let year1CrossingIndex: number | undefined = undefined
  let year1CrossingDateStr: string | undefined = undefined
  let year2CrossingIndex: number | undefined = undefined
  let year2CrossingDateStr: string | undefined = undefined

  // Calculate zero-crossing date for trend line first
  let calculatedZeroCrossingDate: Date | null = null
  let year1CrossingDate: Date | null = null  // 30,000 km threshold
  let year2CrossingDate: Date | null = null  // 15,000 km threshold

  if (sortedReadings.length > 0) {
    const referenceDate = selectedDate ? parseISO(selectedDate) : today
    const readingsBeforeRef = sortedReadings.filter(r => !isAfter(parseISO(r.date), referenceDate))
    const referenceReadings = includePreliminary
      ? readingsBeforeRef
      : readingsBeforeRef.filter(r => !isAfter(parseISO(r.date), today))

    if (referenceReadings.length > 0) {
      // Get mileage at reference date (same logic as for trend line)
      let mileageAtReference = 0
      let daysElapsedToReference = 0

      const exactReading = sortedReadings.find(r => r.date === format(referenceDate, 'yyyy-MM-dd'))

      if (exactReading) {
        mileageAtReference = exactReading.mileage
        daysElapsedToReference = differenceInDays(referenceDate, startDate)
      } else {
        const beforeRef = sortedReadings.filter(r => isBefore(parseISO(r.date), referenceDate))
        const afterRef = sortedReadings.filter(r => isAfter(parseISO(r.date), referenceDate))

        if (beforeRef.length > 0 && afterRef.length > 0) {
          const prevReading = beforeRef[beforeRef.length - 1]
          const nextReading = afterRef[0]
          const prevDate = parseISO(prevReading.date)
          const nextDate = parseISO(nextReading.date)
          const totalSpan = differenceInDays(nextDate, prevDate)
          const currentSpan = differenceInDays(referenceDate, prevDate)
          const ratio = totalSpan > 0 ? currentSpan / totalSpan : 0
          mileageAtReference = prevReading.mileage + (nextReading.mileage - prevReading.mileage) * ratio
          daysElapsedToReference = differenceInDays(referenceDate, startDate)
        } else if (beforeRef.length > 0) {
          const lastReading = beforeRef[beforeRef.length - 1]
          mileageAtReference = lastReading.mileage
          daysElapsedToReference = differenceInDays(parseISO(lastReading.date), startDate)
        }
      }

      const averageRate = daysElapsedToReference > 0 ? mileageAtReference / daysElapsedToReference : 0

      if (averageRate > 0) {
        // Calculate when trend would reach totalLimit (remaining = 0)
        const daysToLimit = leaseInfo.totalLimit / averageRate
        const zeroDate = addDays(startDate, Math.round(daysToLimit))

        // Only use if before lease end
        if (isBefore(zeroDate, endDate)) {
          calculatedZeroCrossingDate = zeroDate
        }

        // Calculate when Year 1's budget (first 15,000 km) would be exhausted
        // This happens when we've used 15,000 km, leaving 30,000 km remaining
        const daysToYear1End = 15000 / averageRate
        const dateYear1End = addDays(startDate, Math.round(daysToYear1End))
        if (isBefore(dateYear1End, endDate)) {
          year1CrossingDate = dateYear1End
        }

        // Calculate when Year 2's budget (next 15,000 km) would be exhausted
        // This happens when we've used 30,000 km, leaving 15,000 km remaining
        const daysToYear2End = 30000 / averageRate
        const dateYear2End = addDays(startDate, Math.round(daysToYear2End))
        if (isBefore(dateYear2End, endDate)) {
          year2CrossingDate = dateYear2End
        }
      }
    }
  }

  // Create data points - use actual readings and add monthly grid for projections
  const dataPoints: Date[] = []

  // Add all actual reading dates within the view period
  sortedReadings.forEach(reading => {
    const readingDate = parseISO(reading.date)
    if (!isBefore(readingDate, viewStartDate) && !isAfter(readingDate, viewEndDate)) {
      dataPoints.push(readingDate)
    }
  })

  // Add start and end dates if not present
  if (!sortedReadings.some(r => r.date === format(viewStartDate, 'yyyy-MM-dd'))) {
    dataPoints.push(viewStartDate)
  }
  if (!sortedReadings.some(r => r.date === format(viewEndDate, 'yyyy-MM-dd'))) {
    dataPoints.push(viewEndDate)
  }

  // Add today if not present and within view period
  if (isAfter(today, viewStartDate) && isBefore(today, viewEndDate)) {
    const todayStr = format(today, 'yyyy-MM-dd')
    if (!sortedReadings.some(r => r.date === todayStr)) {
      dataPoints.push(today)
    }
  }

  // Add zero-crossing date if calculated and within view period
  if (calculatedZeroCrossingDate &&
      !isBefore(calculatedZeroCrossingDate, viewStartDate) &&
      !isAfter(calculatedZeroCrossingDate, viewEndDate)) {
    dataPoints.push(calculatedZeroCrossingDate)
  }

  // Add year 1 crossing date (30,000 km) if calculated and within view period
  if (year1CrossingDate &&
      !isBefore(year1CrossingDate, viewStartDate) &&
      !isAfter(year1CrossingDate, viewEndDate)) {
    dataPoints.push(year1CrossingDate)
  }

  // Add year 2 crossing date (15,000 km) if calculated and within view period
  if (year2CrossingDate &&
      !isBefore(year2CrossingDate, viewStartDate) &&
      !isAfter(year2CrossingDate, viewEndDate)) {
    dataPoints.push(year2CrossingDate)
  }

  // Sort all data points
  dataPoints.sort((a, b) => a.getTime() - b.getTime())

  // Generate data for each point
  dataPoints.forEach((date, index) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const label = format(date, 'MMM dd, yyyy')
    labels.push(label)
    dates.push(dateStr)

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
      // Use selected date if provided, otherwise use today
      const referenceDate = selectedDate ? parseISO(selectedDate) : today

      // Filter readings based on reference date
      const readingsBeforeRef = sortedReadings.filter(r => !isAfter(parseISO(r.date), referenceDate))

      // If preliminary is not included, further filter to exclude future readings
      const referenceReadings = includePreliminary
        ? readingsBeforeRef
        : readingsBeforeRef.filter(r => !isAfter(parseISO(r.date), today))

      if (referenceReadings.length > 0) {
        // Get mileage at reference date (may need interpolation)
        let mileageAtReference = 0
        let daysElapsedToReference = 0

        // Check if we have an exact reading at reference date
        const exactReading = sortedReadings.find(r => r.date === format(referenceDate, 'yyyy-MM-dd'))

        if (exactReading) {
          mileageAtReference = exactReading.mileage
          daysElapsedToReference = differenceInDays(referenceDate, startDate)
        } else {
          // Need to interpolate
          const beforeRef = sortedReadings.filter(r => isBefore(parseISO(r.date), referenceDate))
          const afterRef = sortedReadings.filter(r => isAfter(parseISO(r.date), referenceDate))

          if (beforeRef.length > 0 && afterRef.length > 0) {
            // Interpolate between readings
            const prevReading = beforeRef[beforeRef.length - 1]
            const nextReading = afterRef[0]
            const prevDate = parseISO(prevReading.date)
            const nextDate = parseISO(nextReading.date)
            const totalSpan = differenceInDays(nextDate, prevDate)
            const currentSpan = differenceInDays(referenceDate, prevDate)
            const ratio = totalSpan > 0 ? currentSpan / totalSpan : 0
            mileageAtReference = prevReading.mileage + (nextReading.mileage - prevReading.mileage) * ratio
            daysElapsedToReference = differenceInDays(referenceDate, startDate)
          } else if (beforeRef.length > 0) {
            // Use last reading before reference
            const lastReading = beforeRef[beforeRef.length - 1]
            mileageAtReference = lastReading.mileage
            daysElapsedToReference = differenceInDays(parseISO(lastReading.date), startDate)
          }
        }

        const averageRate = daysElapsedToReference > 0 ? mileageAtReference / daysElapsedToReference : 0

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

  // Set zero-crossing information based on calculated date
  if (calculatedZeroCrossingDate) {
    zeroCrossingDate = format(calculatedZeroCrossingDate, 'yyyy-MM-dd')

    // Find the index of the zero-crossing date in dataPoints
    for (let i = 0; i < dataPoints.length; i++) {
      if (format(dataPoints[i], 'yyyy-MM-dd') === zeroCrossingDate) {
        zeroCrossingIndex = i
        break
      }
    }
  }

  // Set year 1 crossing information (30,000 km)
  if (year1CrossingDate) {
    year1CrossingDateStr = format(year1CrossingDate, 'yyyy-MM-dd')

    // Find the index of the year1 crossing date in dataPoints
    for (let i = 0; i < dataPoints.length; i++) {
      if (format(dataPoints[i], 'yyyy-MM-dd') === year1CrossingDateStr) {
        year1CrossingIndex = i
        break
      }
    }
  }

  // Set year 2 crossing information (15,000 km)
  if (year2CrossingDate) {
    year2CrossingDateStr = format(year2CrossingDate, 'yyyy-MM-dd')

    // Find the index of the year2 crossing date in dataPoints
    for (let i = 0; i < dataPoints.length; i++) {
      if (format(dataPoints[i], 'yyyy-MM-dd') === year2CrossingDateStr) {
        year2CrossingIndex = i
        break
      }
    }
  }

  return {
    labels,
    dates,
    actualData,
    preliminaryData,
    trendData,
    optimalData,
    projectedData,
    currentDateIndex,
    selectedDateIndex,
    zeroCrossingIndex,
    zeroCrossingDate,
    year1CrossingIndex,
    year1CrossingDate: year1CrossingDateStr,
    year2CrossingIndex,
    year2CrossingDate: year2CrossingDateStr,
    viewMode,
    yearOffset,
    totalLimit: leaseInfo.totalLimit
  }
}