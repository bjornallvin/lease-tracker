'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, List, Plus, Calendar, Menu, X, Lock, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface NavigationProps {
  onAddReading?: () => void
}

export default function Navigation({ onAddReading }: NavigationProps) {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { isAuthenticated, logout, isLoading } = useAuth()

  // Debug logging
  console.log('Navigation render:', { isAuthenticated, isLoading, onAddReading: !!onAddReading })

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isMenuOpen && !target.closest('.mobile-menu') && !target.closest('.menu-button')) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isMenuOpen])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMenuOpen])

  const menuItems = [
    { href: '/', icon: Home, label: 'Dashboard' },
    { href: '/weekly', icon: Calendar, label: 'Weekly' },
    { href: '/history', icon: List, label: 'Readings' },
  ]

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 md:mb-8">
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
                {menuItems.map(({ href, icon: Icon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === href
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isLoading ? (
                <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ) : (
                <>
                  {isAuthenticated && (
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors"
                      title="Sign Out"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="hidden lg:inline">Sign Out</span>
                    </button>
                  )}
                  {isAuthenticated && onAddReading && (
                    <button
                      onClick={onAddReading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Reading
                    </button>
                  )}
                  {!isAuthenticated && onAddReading && (
                    <button
                      onClick={onAddReading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Lock className="h-4 w-4" />
                      Sign In
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>


      {/* Floating Menu Button (Mobile Only) */}
      <button
        className="menu-button fixed bottom-6 right-6 z-50 md:hidden w-14 h-14 bg-blue-600 dark:bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 flex items-center justify-center"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle menu"
      >
        {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" />
        </div>
      )}

      {/* Mobile Menu Drawer */}
      <div className={`mobile-menu fixed bottom-0 left-0 right-0 z-40 md:hidden transform transition-transform duration-300 ${
        isMenuOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="bg-white dark:bg-gray-800 rounded-t-3xl shadow-xl border-t border-gray-200 dark:border-gray-700 p-6 pb-8">
          {/* App Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <img
              src="/logo.svg"
              alt="Lease Tracker"
              className="h-8 w-auto"
            />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Lease Tracker</h1>
          </div>

          {/* Menu Items */}
          <div className="grid grid-cols-1 gap-3 mb-6">
            {menuItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-4 p-4 rounded-xl text-base font-medium transition-colors ${
                  pathname === href
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}
          </div>

          {/* Auth Actions */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="w-full h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
            ) : (
              <>
                {isAuthenticated && (
                  <button
                    onClick={() => {
                      logout()
                      setIsMenuOpen(false)
                    }}
                    className="w-full flex items-center justify-center gap-3 p-4 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-medium"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </button>
                )}

                {/* Add Reading Button (if available and authenticated) */}
                {isAuthenticated && onAddReading && (
                  <button
                    onClick={() => {
                      onAddReading()
                      setIsMenuOpen(false)
                    }}
                    className="w-full flex items-center justify-center gap-3 p-4 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
                  >
                    <Plus className="h-5 w-5" />
                    Add Reading
                  </button>
                )}

                {!isAuthenticated && onAddReading && (
                  <button
                    onClick={() => {
                      onAddReading()
                      setIsMenuOpen(false)
                    }}
                    className="w-full flex items-center justify-center gap-3 p-4 bg-gray-600 dark:bg-gray-500 text-white rounded-xl hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors font-medium"
                  >
                    <Lock className="h-5 w-5" />
                    Sign In
                  </button>
                )}
              </>
            )}
          </div>

          {/* Drag Handle */}
          <div className="flex justify-center mt-4">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        </div>
      </div>
    </>
  )
}