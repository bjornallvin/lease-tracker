import { NextRequest, NextResponse } from 'next/server'
import { redis, READINGS_KEY } from '@/lib/redis'
import { MileageReading } from '@/lib/types'

export async function GET() {
  try {
    if (!redis) {
      return NextResponse.json(
        { error: 'Database not configured. Please set up Upstash Redis.' },
        { status: 503 }
      )
    }

    let readings = await redis.get<MileageReading[]>(READINGS_KEY)

    if (!readings) {
      const defaultReadings: MileageReading[] = [
        {
          id: '1',
          date: '2025-07-09',
          mileage: 0,
          note: 'Lease start',
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          date: '2025-09-23',
          mileage: 4593,
          note: 'Current reading',
          createdAt: new Date().toISOString()
        }
      ]

      await redis.set(READINGS_KEY, defaultReadings)
      readings = defaultReadings
    }

    return NextResponse.json(readings)
  } catch (error) {
    console.error('Error fetching readings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch readings' },
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

    const newReading: MileageReading = {
      id: Date.now().toString(),
      date: body.date,
      mileage: body.mileage,
      note: body.note || '',
      createdAt: new Date().toISOString()
    }

    const readings = await redis.get<MileageReading[]>(READINGS_KEY) || []

    const existingIndex = readings.findIndex(r => r.date === newReading.date)
    if (existingIndex >= 0) {
      readings[existingIndex] = newReading
    } else {
      readings.push(newReading)
    }

    readings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    await redis.set(READINGS_KEY, readings)

    return NextResponse.json(newReading)
  } catch (error) {
    console.error('Error saving reading:', error)
    return NextResponse.json(
      { error: 'Failed to save reading' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, date, mileage, note } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Reading ID required' },
        { status: 400 }
      )
    }

    const readings = await redis.get<MileageReading[]>(READINGS_KEY) || []
    const readingIndex = readings.findIndex(r => r.id === id)

    if (readingIndex === -1) {
      return NextResponse.json(
        { error: 'Reading not found' },
        { status: 404 }
      )
    }

    readings[readingIndex] = {
      ...readings[readingIndex],
      date,
      mileage,
      note: note || '',
      createdAt: readings[readingIndex].createdAt
    }

    readings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    await redis.set(READINGS_KEY, readings)

    return NextResponse.json(readings[readingIndex])
  } catch (error) {
    console.error('Error updating reading:', error)
    return NextResponse.json(
      { error: 'Failed to update reading' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!redis) {
      return NextResponse.json(
        { error: 'Database not configured. Please set up Upstash Redis.' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Reading ID required' },
        { status: 400 }
      )
    }

    const readings = await redis.get<MileageReading[]>(READINGS_KEY) || []
    const filteredReadings = readings.filter(r => r.id !== id)

    await redis.set(READINGS_KEY, filteredReadings)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting reading:', error)
    return NextResponse.json(
      { error: 'Failed to delete reading' },
      { status: 500 }
    )
  }
}