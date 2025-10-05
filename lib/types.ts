export interface LeaseInfo {
  id: string
  startDate: string
  endDate: string
  annualLimit: number
  totalLimit: number
  createdAt: string
  updatedAt: string
}

/**
 * Represents a mileage reading entry.
 *
 * @property note - Optional note field. When note starts with "TRIP: ", the reading was
 *                  generated from a trip entry (automatic conversion). Manual readings
 *                  have no "TRIP: " prefix.
 */
export interface MileageReading {
  id: string
  date: string
  time?: string
  mileage: number
  note?: string
  createdAt: string
}

/**
 * Transient trip input that gets immediately converted to TWO MileageReading entries.
 * This interface is used only for the trip creation API - trips are never persisted.
 *
 * TWO-READING MODEL:
 * Each trip creates TWO readings:
 * 1. START reading: timestamp = startTime, odometer = previous reading's odometer (or 0), note = empty
 * 2. END reading: timestamp = endTime, odometer = start odometer + distance, note = "TRIP: {note}"
 *
 * @property distance - Trip distance in kilometers (1-2000 km range)
 * @property startTime - Optional ISO 8601 timestamp for trip start. Defaults applied by backend if omitted.
 * @property endTime - Optional ISO 8601 timestamp for trip end. Defaults applied by backend if omitted.
 * @property note - Optional trip note. Will be prepended with "TRIP: " in the END reading's note field.
 *
 * Timestamp defaults (applied by backend):
 * - Neither provided: endTime = now(), startTime = endTime - 1 minute
 * - Only startTime: endTime = startTime + 1 minute
 * - Only endTime: startTime = endTime - 1 minute
 * - Both provided: used as-is (validated endTime > startTime)
 */
export interface TripInput {
  distance: number
  startTime?: string
  endTime?: string
  note?: string
}

export interface CalculatedStats {
  currentMileage: number
  budgetedMileage: number
  remainingBudget: number
  currentRate: number
  projectedTotal: number
  projectedTotalTrend: number
  isOnTrack: boolean
  variance: number
  percentageUsed: number
  optimalPercentage: number
  daysElapsed: number
  daysRemaining: number
  totalDays: number
  dailyBudget: number
  remainingDailyBudget: number
  daysToOptimal: number
  monthlyStats?: MonthlyStats[]
}

export interface MonthlyStats {
  month: string
  year: number
  startMileage: number
  endMileage: number
  budget: number
  actual: number
  variance: number
  isProjected: boolean
}