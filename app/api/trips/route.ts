import { NextRequest, NextResponse } from 'next/server'
import { redis, READINGS_KEY } from '@/lib/redis'
import { MileageReading, TripInput } from '@/lib/types'
import { verifyAuth } from '@/lib/auth'
import { compareReadings } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    // T002: Check authentication
    if (!verifyAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!redis) {
      return NextResponse.json(
        { error: 'Database not configured. Please set up Upstash Redis.' },
        { status: 503 }
      )
    }

    const body = await request.json() as TripInput

    // T003: Validate trip input
    // Validate distance (required, 1-2000 km)
    if (typeof body.distance !== 'number' || isNaN(body.distance)) {
      return NextResponse.json(
        { error: 'Distance is required', field: 'distance' },
        { status: 400 }
      )
    }

    if (body.distance < 1 || body.distance > 2000) {
      return NextResponse.json(
        {
          error: 'Trip distance must be between 1 and 2 000 km',
          field: 'distance',
          value: body.distance
        },
        { status: 400 }
      )
    }

    // T003: Timestamp resolution logic (two-reading model)
    let startTime: string
    let endTime: string

    // Parse provided times
    let parsedStartTime: Date | null = null
    let parsedEndTime: Date | null = null

    if (body.startTime) {
      parsedStartTime = new Date(body.startTime)
      if (isNaN(parsedStartTime.getTime())) {
        return NextResponse.json(
          {
            error: 'Invalid start time format',
            field: 'startTime',
            value: body.startTime
          },
          { status: 400 }
        )
      }
    }

    if (body.endTime) {
      parsedEndTime = new Date(body.endTime)
      if (isNaN(parsedEndTime.getTime())) {
        return NextResponse.json(
          {
            error: 'Invalid end time format',
            field: 'endTime',
            value: body.endTime
          },
          { status: 400 }
        )
      }
    }

    // Apply timestamp defaults based on what's provided
    if (!parsedStartTime && !parsedEndTime) {
      // Neither provided: endTime = now, startTime = now - 1 minute
      const now = new Date()
      parsedEndTime = now
      parsedStartTime = new Date(now.getTime() - 60000) // 1 minute earlier
    } else if (parsedStartTime && !parsedEndTime) {
      // Only start provided: endTime = startTime + 1 minute
      parsedEndTime = new Date(parsedStartTime.getTime() + 60000)
    } else if (!parsedStartTime && parsedEndTime) {
      // Only end provided: startTime = endTime - 1 minute
      parsedStartTime = new Date(parsedEndTime.getTime() - 60000)
    }
    // Both provided: use as-is (will validate below)

    // Validate endTime > startTime
    if (parsedStartTime && parsedEndTime && parsedEndTime <= parsedStartTime) {
      return NextResponse.json(
        {
          error: 'End time must be after start time',
          field: 'endTime'
        },
        { status: 400 }
      )
    }

    startTime = parsedStartTime!.toISOString()
    endTime = parsedEndTime!.toISOString()

    // Validate note (optional, max 200 characters before "TRIP: " prefix)
    if (body.note && body.note.length > 200) {
      return NextResponse.json(
        {
          error: 'Note exceeds maximum length (200 characters)',
          field: 'note'
        },
        { status: 400 }
      )
    }

    // T004: Trip-to-TWO-readings conversion
    // Fetch all readings to find the latest one
    const readings = await redis.get<MileageReading[]>(READINGS_KEY) || []

    // T013: Trip time conflict validation
    // Check if startTime or endTime conflicts with existing reading timestamps
    const conflictTolerance = 1000 // 1 second tolerance in milliseconds

    for (const reading of readings) {
      const readingTimestamp = new Date(`${reading.date}T${reading.time || '00:00'}`).getTime()
      const startTimestamp = new Date(startTime).getTime()
      const endTimestamp = new Date(endTime).getTime()

      // Check if any of the trip times are too close to an existing reading
      if (Math.abs(readingTimestamp - startTimestamp) < conflictTolerance ||
          Math.abs(readingTimestamp - endTimestamp) < conflictTolerance) {
        return NextResponse.json(
          {
            error: 'Trip times conflict with existing readings',
            details: `Conflict with reading at ${reading.date} ${reading.time || ''}`
          },
          { status: 400 }
        )
      }
    }

    // Calculate start odometer (what odometer showed BEFORE the trip)
    let startOdometer: number
    if (readings.length === 0) {
      // No existing readings: start at 0, end at distance (FR-010)
      startOdometer = 0
    } else {
      // Sort readings to find latest
      const sortedReadings = [...readings].sort(compareReadings)
      const latestReading = sortedReadings[sortedReadings.length - 1]
      startOdometer = latestReading.mileage
    }

    // Calculate end odometer (start + trip distance)
    const endOdometer = startOdometer + body.distance

    // Format note for END reading with "TRIP: " prefix
    const endNote = body.note ? `TRIP: ${body.note}` : 'TRIP: '

    // Extract date and time from startTime for START reading
    const startDateObj = new Date(startTime)
    const startDate = startDateObj.toISOString().split('T')[0] // YYYY-MM-DD
    const startTimeStr = startDateObj.toISOString().split('T')[1].substring(0, 5) // HH:MM

    // Extract date and time from endTime for END reading
    const endDateObj = new Date(endTime)
    const endDate = endDateObj.toISOString().split('T')[0] // YYYY-MM-DD
    const endTimeStr = endDateObj.toISOString().split('T')[1].substring(0, 5) // HH:MM

    const now = new Date().toISOString()

    // OPTIMIZATION: Check if a reading already exists on the start date
    // If so, skip creating the start reading to avoid duplicates
    const existingReadingOnStartDate = readings.some(r => r.date === startDate)

    const createdReadings: MileageReading[] = []

    // Create START reading ONLY if no reading exists on start date
    if (!existingReadingOnStartDate) {
      const startReading: MileageReading = {
        id: `${Date.now()}-start`,
        date: startDate,
        time: startTimeStr,
        mileage: startOdometer,
        note: '', // Empty note for start reading
        createdAt: now
      }
      readings.push(startReading)
      createdReadings.push(startReading)
    }

    // Always create END reading
    const endReading: MileageReading = {
      id: `${Date.now()}-end`,
      date: endDate,
      time: endTimeStr,
      mileage: endOdometer,
      note: endNote,
      createdAt: now
    }
    readings.push(endReading)
    createdReadings.push(endReading)

    // Sort readings by date/time
    readings.sort(compareReadings)

    // Persist to Redis
    await redis.set(READINGS_KEY, readings)

    // Return 201 Created with created readings (1 or 2 depending on optimization)
    return NextResponse.json(createdReadings, { status: 201 })

  } catch (error) {
    console.error('Error creating trip:', error)
    return NextResponse.json(
      {
        error: 'Failed to create trip reading',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
