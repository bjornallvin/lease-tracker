import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    // Get password and token from environment variables
    const adminPassword = process.env.ADMIN_PASSWORD
    const authToken = process.env.AUTH_TOKEN

    if (!adminPassword || !authToken) {
      console.error('Missing ADMIN_PASSWORD or AUTH_TOKEN environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    if (password === adminPassword) {
      return NextResponse.json({
        success: true,
        token: authToken
      })
    }

    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}