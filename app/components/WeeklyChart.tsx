'use client'

import { Chart } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'
import { format, addDays } from 'date-fns'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  Title,
  Tooltip,
  Legend
)

interface DailyUsage {
  date: Date
  usage: number
  dayName: string
  isToday: boolean
  isFuture: boolean
}

interface WeeklyChartProps {
  dailyUsage: DailyUsage[]
  dailyBudget: number
  weekStart: Date
  weeklyBudget: number
  totalUsedThisWeek: number
}

export default function WeeklyChart({ dailyUsage, dailyBudget, weekStart, weeklyBudget, totalUsedThisWeek }: WeeklyChartProps) {
  // Create budget line data - shows remaining budget after each day's actual usage
  // We need to scale the daily usage to match the totalUsedThisWeek from stats
  const budgetLineData: number[] = []

  // Calculate total from daily usage
  const sumOfDailyUsage = dailyUsage.reduce((sum, day) => sum + (day.isFuture ? 0 : day.usage), 0)

  // Calculate scaling factor to align chart data with actual weekly stats
  const scalingFactor = sumOfDailyUsage > 0 ? totalUsedThisWeek / sumOfDailyUsage : 1

  // Track cumulative actual usage (scaled)
  let cumulativeUsage = 0

  dailyUsage.forEach((day) => {
    // Add this day's usage to cumulative total (scaled to match stats)
    if (!day.isFuture) {
      cumulativeUsage += day.usage * scalingFactor
    }
    // Show remaining budget after this day's usage (don't go below 0)
    budgetLineData.push(Math.max(0, weeklyBudget - cumulativeUsage))
  })

  const chartData = {
    labels: dailyUsage.map(d => d.dayName),
    datasets: [
      {
        type: 'line' as const,
        label: 'Budget Remaining',
        data: budgetLineData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: 'rgb(255, 255, 255)',
        pointBorderWidth: 2,
        tension: 0,
        order: 1
      },
      {
        type: 'bar' as const,
        label: 'Daily Usage',
        data: dailyUsage.map(d => {
          // Don't show any bar for days with no actual readings (usage is 0 and it's not future)
          if (d.usage === 0 && !d.isFuture) return null
          return d.usage
        }),
        backgroundColor: dailyUsage.map(d => {
          if (d.isFuture) return 'rgba(156, 163, 175, 0.3)'
          if (d.isToday) return 'rgb(59, 130, 246)'
          return d.usage > dailyBudget ? 'rgb(239, 68, 68)' : 'rgb(59, 130, 246)'
        }),
        borderColor: dailyUsage.map(d => {
          if (d.isFuture) return 'rgba(156, 163, 175, 0.5)'
          if (d.isToday) return 'rgb(37, 99, 235)'
          return d.usage > dailyBudget ? 'rgb(220, 38, 38)' : 'rgb(37, 99, 235)'
        }),
        borderWidth: 2,
        borderRadius: 4,
        order: 2
      }
    ]
  }

  const options: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: 'Daily Usage vs Budget',
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          bottom: 20
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || ''
            const value = context.parsed.y

            if (context.datasetIndex === 0) {
              // Budget line
              return `${label}: ${Math.round(value).toLocaleString()} km remaining`
            } else {
              // Usage bars
              const dayData = dailyUsage[context.dataIndex]
              if (dayData.isFuture) {
                return `${label}: No data yet`
              }
              if (value === null || (value === 0 && !dayData.isFuture)) {
                return `${label}: No readings`
              }
              return `${label}: ${Math.round(value).toLocaleString()} km`
            }
          },
          footer: function(tooltipItems) {
            const index = tooltipItems[0].dataIndex
            const dayData = dailyUsage[index]
            const usage = dayData.usage

            if (dayData.isFuture || usage === 0) return ''

            const difference = usage - dailyBudget
            if (difference > 0) {
              return `${Math.round(difference).toLocaleString()} km over budget`
            } else if (difference < 0) {
              return `${Math.round(Math.abs(difference)).toLocaleString()} km under budget`
            }
            return 'On budget'
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Day of Week'
        },
        grid: {
          display: false
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Kilometers'
        },
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('sv-SE').format(value as number)
          }
        }
      }
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="h-80">
        <Chart type="bar" data={chartData} options={options} />
      </div>
      <div className="mt-4 flex flex-col sm:flex-row gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-blue-500 border-2 border-blue-700 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Daily usage (km driven)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-green-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Budget remaining (cumulative)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-red-500 border-2 border-red-700 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Over budget</span>
        </div>
      </div>
    </div>
  )
}
