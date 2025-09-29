import { NextRequest } from 'next/server'

export function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  const expectedToken = process.env.AUTH_TOKEN

  if (!expectedToken) {
    console.error('AUTH_TOKEN environment variable not set')
    return false
  }

  return token === expectedToken
}

export function createAuthHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`
  }
}