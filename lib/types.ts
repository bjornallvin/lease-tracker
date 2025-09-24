export interface LeaseInfo {
  id: string
  startDate: string
  endDate: string
  annualLimit: number
  totalLimit: number
  createdAt: string
  updatedAt: string
}

export interface MileageReading {
  id: string
  date: string
  mileage: number
  note?: string
  createdAt: string
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