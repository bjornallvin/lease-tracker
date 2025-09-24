'use client'

import { useState, useRef } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,
  TimeScale
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import annotationPlugin from 'chartjs-plugin-annotation'
import zoomPlugin from 'chartjs-plugin-zoom'
import { ChartData } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { RotateCcw } from 'lucide-react'

ChartJS.register(
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin,
  zoomPlugin
)

interface MileageChartProps {
  data: ChartData
  onDataPointClick?: (date: string, mileage: number) => void
  readings?: any[]
  selectedDate?: string
  viewMode?: 'total' | 'year1' | 'year2' | 'year3'
}

export default function MileageChart({ data, onDataPointClick, readings, selectedDate, viewMode = 'total' }: MileageChartProps) {
  const todayLabel = format(new Date(), 'yyyy-MM-dd')
  const chartRef = useRef<any>(null)
  const [isZoomed, setIsZoomed] = useState(false)

  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom()
      setIsZoomed(false)
    }
  }

  // Calculate y-axis range based on year
  let yMin = 0
  let yMax = data.totalLimit

  if (viewMode === 'year1') {
    yMin = 30000
    yMax = 45000
  } else if (viewMode === 'year2') {
    yMin = 15000
    yMax = 30000
  } else if (viewMode === 'year3') {
    yMin = 0
    yMax = 15000
  }

  // Create arrays for dimmed points based on selected date
  const actualPointColors: string[] = []
  const preliminaryPointColors: string[] = []

  if (selectedDate && data.selectedDateIndex !== undefined) {
    // Dim points after the selected date
    data.labels.forEach((_, index) => {
      const isDimmed = index > data.selectedDateIndex!
      actualPointColors.push(isDimmed ? 'rgba(59, 130, 246, 0.3)' : 'rgb(59, 130, 246)')
      preliminaryPointColors.push(isDimmed ? 'rgba(251, 191, 36, 0.3)' : 'rgb(251, 191, 36)')
    })
  }

  const chartData = {
    labels: data.dates,
    datasets: [
      {
        label: 'Actual Remaining',
        data: data.actualData,
        borderColor: selectedDate && data.selectedDateIndex !== undefined
          ? data.labels.map((_, i) => i > data.selectedDateIndex! ? 'rgba(59, 130, 246, 0.3)' : 'rgb(59, 130, 246)')
          : 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: actualPointColors.length > 0 ? actualPointColors : 'rgb(59, 130, 246)',
        pointBorderColor: actualPointColors.length > 0 ? actualPointColors : 'rgb(59, 130, 246)',
        tension: 0.1,
        spanGaps: true,
        segment: selectedDate && data.selectedDateIndex !== undefined ? {
          borderColor: (ctx: any) => {
            // Dim segments after selected date
            return ctx.p0DataIndex >= data.selectedDateIndex! ? 'rgba(59, 130, 246, 0.3)' : 'rgb(59, 130, 246)'
          }
        } : undefined
      },
      {
        label: 'Preliminary Readings',
        data: data.preliminaryData,
        borderColor: selectedDate && data.selectedDateIndex !== undefined
          ? data.labels.map((_, i) => i > data.selectedDateIndex! ? 'rgba(251, 191, 36, 0.3)' : 'rgb(251, 191, 36)')
          : 'rgb(251, 191, 36)',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderWidth: 2,
        borderDash: [8, 4],
        pointRadius: 4,
        pointBackgroundColor: preliminaryPointColors.length > 0 ? preliminaryPointColors : 'rgb(251, 191, 36)',
        pointBorderColor: preliminaryPointColors.length > 0 ? preliminaryPointColors : 'rgb(251, 191, 36)',
        pointStyle: 'triangle',
        tension: 0.1,
        spanGaps: true,
        segment: selectedDate && data.selectedDateIndex !== undefined ? {
          borderColor: (ctx: any) => {
            // Dim segments after selected date
            return ctx.p0DataIndex >= data.selectedDateIndex! ? 'rgba(251, 191, 36, 0.3)' : 'rgb(251, 191, 36)'
          },
          borderDash: (ctx: any) => [8, 4]
        } : undefined
      },
      {
        label: 'Trend (Current Pace)',
        data: data.trendData,
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0.1
      },
      {
        label: 'Optimal Remaining',
        data: data.optimalData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        borderDash: [10, 5],
        pointRadius: 0,
        tension: 0
      },
      {
        label: 'Recommended Path',
        data: data.projectedData,
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 2,
        borderDash: [3, 3],
        pointRadius: 0,
        tension: 0,
        spanGaps: true
      }
    ]
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, activeElements) => {
      if (activeElements.length > 0 && onDataPointClick) {
        const elementIndex = activeElements[0].index
        const datasetIndex = activeElements[0].datasetIndex
        const label = data.labels[elementIndex]
        const value = chartData.datasets[datasetIndex].data[elementIndex]

        // Extract date from label (format: "MMM dd, yyyy")
        const dateParts = label.split(', ')
        if (dateParts.length === 2) {
          onDataPointClick(label, value as number)
        }
      }
    },
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
        text: 'Remaining Kilometers Over Time',
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
          label: function(context: TooltipItem<'line'>) {
            let label = context.dataset.label || ''
            if (label) {
              label += ': '
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('sv-SE').format(context.parsed.y) + ' km'
            }
            return label
          }
        }
      },
      annotation: {
        annotations: {
          ...(data.currentDateIndex >= 0 && data.dates[data.currentDateIndex] ? {
            todayLine: {
              type: 'line',
              xMin: data.dates[data.currentDateIndex],
              xMax: data.dates[data.currentDateIndex],
              borderColor: 'rgba(239, 68, 68, 0.7)',
              borderWidth: 2,
              borderDash: [6, 6],
              label: {
                display: true,
                content: `Today (${todayLabel})`,
                position: 'start',
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                color: 'white',
                font: {
                  size: 11,
                  weight: 'bold'
                },
                padding: {
                  top: 4,
                  bottom: 4,
                  left: 8,
                  right: 8
                },
                borderRadius: 4,
                yAdjust: -10
              }
            }
          } : {}),
          ...(data.selectedDateIndex !== undefined && data.selectedDateIndex !== data.currentDateIndex && data.dates[data.selectedDateIndex] ? {
            selectedLine: {
              type: 'line',
              xMin: data.dates[data.selectedDateIndex],
              xMax: data.dates[data.selectedDateIndex],
              borderColor: 'rgba(59, 130, 246, 0.8)',
              borderWidth: 3,
              borderDash: [0],
              label: {
                display: true,
                content: `Selected: ${data.labels[data.selectedDateIndex]}`,
                position: 'start',
                backgroundColor: 'rgba(59, 130, 246, 0.9)',
                color: 'white',
                font: {
                  size: 11,
                  weight: 'bold'
                },
                padding: {
                  top: 4,
                  bottom: 4,
                  left: 8,
                  right: 8
                },
                borderRadius: 4,
                yAdjust: -30,
                xAdjust: data.selectedDateIndex < data.labels.length / 2 ? 50 : -50
              }
            }
          } : {}),
          ...(data.zeroCrossingIndex !== undefined && data.zeroCrossingDate ? {
            zeroLine: {
              type: 'line',
              xMin: data.zeroCrossingDate,
              xMax: data.zeroCrossingDate,
              borderColor: 'rgba(251, 146, 60, 0.8)',
              borderWidth: 2,
              borderDash: [4, 4],
              label: {
                display: true,
                content: `Out of km: ${data.zeroCrossingDate}`,
                position: 'start',
                backgroundColor: 'rgba(251, 146, 60, 0.9)',
                color: 'white',
                font: {
                  size: 11,
                  weight: 'bold'
                },
                padding: {
                  top: 4,
                  bottom: 4,
                  left: 8,
                  right: 8
                },
                borderRadius: 4,
                yAdjust: -60,
                rotation: 0
              }
            }
          } : {}),
          ...(data.year1CrossingIndex !== undefined && data.year1CrossingDate ? {
            year1Line: {
              type: 'line',
              xMin: data.year1CrossingDate,
              xMax: data.year1CrossingDate,
              borderColor: 'rgba(147, 51, 234, 0.8)',
              borderWidth: 2,
              borderDash: [6, 3],
              label: {
                display: true,
                content: `Year 1 out of km: ${data.year1CrossingDate}`,
                position: 'start',
                backgroundColor: 'rgba(147, 51, 234, 0.9)',
                color: 'white',
                font: {
                  size: 11,
                  weight: 'bold'
                },
                padding: {
                  top: 4,
                  bottom: 4,
                  left: 8,
                  right: 8
                },
                borderRadius: 4,
                yAdjust: -90,
                rotation: 0
              }
            }
          } : {}),
          ...(data.year2CrossingIndex !== undefined && data.year2CrossingDate ? {
            year2Line: {
              type: 'line',
              xMin: data.year2CrossingDate,
              xMax: data.year2CrossingDate,
              borderColor: 'rgba(236, 72, 153, 0.8)',
              borderWidth: 2,
              borderDash: [6, 3],
              label: {
                display: true,
                content: `Year 2 out of km: ${data.year2CrossingDate}`,
                position: 'start',
                backgroundColor: 'rgba(236, 72, 153, 0.9)',
                color: 'white',
                font: {
                  size: 11,
                  weight: 'bold'
                },
                padding: {
                  top: 4,
                  bottom: 4,
                  left: 8,
                  right: 8
                },
                borderRadius: 4,
                yAdjust: -120,
                rotation: 0
              }
            }
          } : {})
        }
      },
      zoom: {
        limits: {
          x: { min: 'original', max: 'original', minRange: 86400000 * 7 }, // Min range of 1 week
          y: { min: yMin, max: yMax }
        },
        pan: {
          enabled: true,
          mode: 'x',
          onPan: () => {
            setIsZoomed(true)
          }
        },
        zoom: {
          wheel: {
            enabled: true,
            speed: 0.1
          },
          drag: {
            enabled: true,
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
          onZoom: () => {
            setIsZoomed(true)
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        display: true,
        title: {
          display: true,
          text: 'Date'
        },
        grid: {
          display: false
        },
        time: {
          parser: 'yyyy-MM-dd',
          displayFormats: {
            day: 'MMM d',
            month: 'MMM yyyy'
          },
          tooltipFormat: 'MMM dd, yyyy'
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 12
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Remaining Kilometers'
        },
        min: yMin,
        max: yMax,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('sv-SE').format(value as number)
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 relative">
      {isZoomed && (
        <button
          onClick={resetZoom}
          className="absolute top-4 right-4 z-10 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm transition-colors"
          title="Reset zoom"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Zoom
        </button>
      )}
      <div className="h-96">
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Actual: Kilometers left</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-orange-400 border-dashed border-b-2"></div>
          <span className="text-gray-600 dark:text-gray-400">Trend: If you continue at current pace</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-green-500 border-dashed border-b-2"></div>
          <span className="text-gray-600 dark:text-gray-400">Optimal: Ideal steady decrease</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-purple-500 border-dashed border-b-2"></div>
          <span className="text-gray-600 dark:text-gray-400">Recommended: Path to use full allowance</span>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-red-500 opacity-70"></div>
            <span className="text-gray-600 dark:text-gray-400">Today&apos;s Position</span>
          </div>
        </div>
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">Zoom:</span> Scroll or drag to zoom • Pan while zoomed • Click data points to set reference date
        </div>
      </div>
    </div>
  )
}