import { NextRequest, NextResponse } from 'next/server'
import { redis, LEASE_KEY } from '@/lib/redis'
import { LeaseInfo } from '@/lib/types'

export async function GET() {
  try {
    if (!redis) {
      return NextResponse.json(
        { error: 'Database not configured. Please set up Upstash Redis.' },
        { status: 503 }
      )
    }

    const lease = await redis.get<LeaseInfo>(LEASE_KEY)

    if (!lease) {
      const defaultLease: LeaseInfo = {
        id: 'default',
        startDate: '2025-07-09',
        endDate: '2028-07-09',
        annualLimit: 15000,
        totalLimit: 45000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await redis.set(LEASE_KEY, defaultLease)
      return NextResponse.json(defaultLease)
    }

    return NextResponse.json(lease)
  } catch (error) {
    console.error('Error fetching lease:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lease info' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!redis) {
      return NextResponse.json(
        { error: 'Database not configured. Please set up Upstash Redis.' },
        { status: 503 }
      )
    }

    const body = await request.json()

    const lease: LeaseInfo = {
      id: 'default',
      startDate: body.startDate,
      endDate: body.endDate,
      annualLimit: body.annualLimit,
      totalLimit: body.totalLimit,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await redis.set(LEASE_KEY, lease)

    return NextResponse.json(lease)
  } catch (error) {
    console.error('Error saving lease:', error)
    return NextResponse.json(
      { error: 'Failed to save lease info' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!redis) {
      return NextResponse.json(
        { error: 'Database not configured. Please set up Upstash Redis.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const existingLease = await redis.get<LeaseInfo>(LEASE_KEY)

    const lease: LeaseInfo = {
      ...existingLease,
      ...body,
      id: 'default',
      updatedAt: new Date().toISOString()
    }

    await redis.set(LEASE_KEY, lease)

    return NextResponse.json(lease)
  } catch (error) {
    console.error('Error updating lease:', error)
    return NextResponse.json(
      { error: 'Failed to update lease info' },
      { status: 500 }
    )
  }
}