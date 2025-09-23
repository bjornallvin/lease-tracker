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
  isOnTrack: boolean
  variance: number
  percentageUsed: number
  daysElapsed: number
  daysRemaining: number
  totalDays: number
  dailyBudget: number
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