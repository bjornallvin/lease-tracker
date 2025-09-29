'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  token: string | null
  login: (password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Debug logging
  console.log('AuthProvider state:', { isAuthenticated, token: !!token, isLoading })

  // Check for stored token on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedToken = localStorage.getItem('lease-tracker-token')
        if (storedToken) {
          setToken(storedToken)
          setIsAuthenticated(true)
        } else {
          // Explicitly set to false if no token found
          setIsAuthenticated(false)
          setToken(null)
        }
      } catch (error) {
        console.error('Error accessing localStorage:', error)
        setIsAuthenticated(false)
        setToken(null)
      }
      setIsLoading(false)
    } else {
      // Server-side: not authenticated
      setIsAuthenticated(false)
      setToken(null)
      setIsLoading(false)
    }
  }, [])

  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        const data = await response.json()
        const authToken = data.token

        setToken(authToken)
        setIsAuthenticated(true)
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('lease-tracker-token', authToken)
          } catch (error) {
            console.error('Error saving to localStorage:', error)
          }
        }

        return true
      }

      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = () => {
    setToken(null)
    setIsAuthenticated(false)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('lease-tracker-token')
      } catch (error) {
        console.error('Error removing from localStorage:', error)
      }
    }
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      token,
      login,
      logout,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}