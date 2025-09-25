'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, List, Plus } from 'lucide-react'

interface NavigationProps {
  onAddReading?: () => void
}

export default function Navigation({ onAddReading }: NavigationProps) {
  const pathname = usePathname()

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 mb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center gap-2">
              <img
                src="/logo.svg"
                alt="Lease Tracker"
                className="h-6 w-auto"
              />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Lease Tracker</h1>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/history"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/history'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <List className="h-4 w-4" />
                History
              </Link>
            </div>
          </div>
          {onAddReading && (
            <button
              onClick={onAddReading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Reading
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}