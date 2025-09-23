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
    <nav className="bg-white shadow-sm border-b border-gray-200 mb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-gray-900">Lease Tracker</h1>
            <div className="flex space-x-4">
              <Link
                href="/"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/history"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/history'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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