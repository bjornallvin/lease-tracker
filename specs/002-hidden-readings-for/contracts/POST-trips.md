# API Contract: POST /api/trips (Modified)

## Overview
Creates a trip entry which generates TWO mileage readings (start and end). Both readings may trigger anchor creation if added on dates with no existing readings.

## Endpoint
```
POST /api/trips
```

## Authentication
**Required**: Yes (Bearer token or session-based auth)

## Request

### Headers
```
Content-Type: application/json
Authorization: Bearer <token> OR Cookie with auth session
```

### Body Schema
```typescript
{
  distance: number      // Required. Trip distance in kilometers (1-2000)
  startTime?: string    // Optional. ISO 8601 timestamp
  endTime?: string      // Optional. ISO 8601 timestamp
  note?: string         // Optional. Trip note (will be prefixed with "TRIP: " in end reading)
}
```

### Example Request
```json
{
  "distance": 50,
  "startTime": "2025-10-08T10:00:00.000Z",
  "endTime": "2025-10-08T11:30:00.000Z",
  "note": "Business meeting Stockholm"
}
```

## Response

### Success Response (201 Created)
```typescript
{
  success: boolean
  startReading: MileageReading
  endReading: MileageReading
}
```

**Note**: Response includes both generated readings. Anchors (if created) are not included in response.

### Example Success Response
```json
{
  "success": true,
  "startReading": {
    "id": "1696857600000",
    "date": "2025-10-08",
    "time": "10:00",
    "mileage": 4593,
    "note": "",
    "createdAt": "2025-10-08T12:00:00.000Z",
    "hidden": false,
    "isSystemGenerated": false
  },
  "endReading": {
    "id": "1696857600001",
    "date": "2025-10-08",
    "time": "11:30",
    "mileage": 4643,
    "note": "TRIP: Business meeting Stockholm",
    "createdAt": "2025-10-08T12:00:00.001Z",
    "hidden": false,
    "isSystemGenerated": false
  }
}
```

### Error Responses
Same as POST /api/readings (401, 400, 503, 500)

## Behavior Specification

### Trip to Readings Conversion
1. **Find base odometer** (previous reading's mileage or 0)
2. **Create START reading**:
   - timestamp from `startTime` (or default)
   - mileage = base odometer
   - note = empty
3. **Create END reading**:
   - timestamp from `endTime` (or default)
   - mileage = base odometer + distance
   - note = "TRIP: {note}"
4. **Add both readings** using same logic as POST /api/readings
   - Each reading checked independently for anchor creation
   - If start reading on new date: Create anchor for start date
   - If end reading on new date: Create anchor for end date

### Anchor Creation for Trip Readings

#### Scenario 1: Trip Start and End on Same Date (First Time)
```
GIVEN no readings on 2025-10-08
WHEN POST /api/trips with startTime=2025-10-08T10:00, endTime=2025-10-08T11:30
THEN:
  - Start reading added
  - Check: 2025-10-08 has 1 reading → Create anchor for start
  - End reading added
  - Check: 2025-10-08 has 2+ readings → No anchor for end
RESULT: 1 anchor created (for start only)
```

#### Scenario 2: Trip Spans Two Dates (Both New)
```
GIVEN no readings on 2025-10-08 or 2025-10-09
WHEN POST /api/trips with startTime=2025-10-08T23:30, endTime=2025-10-09T01:00
THEN:
  - Start reading added (2025-10-08)
  - Check: 2025-10-08 has 1 reading → Create anchor for 2025-10-08
  - End reading added (2025-10-09)
  - Check: 2025-10-09 has 1 reading → Create anchor for 2025-10-09
RESULT: 2 anchors created (one per date)
```

#### Scenario 3: Trip on Date with Existing Readings
```
GIVEN readings exist on 2025-10-08
WHEN POST /api/trips on 2025-10-08
THEN:
  - Start reading added
  - Check: 2025-10-08 has 2+ readings → No anchor
  - End reading added
  - Check: 2025-10-08 has 3+ readings → No anchor
RESULT: 0 anchors created
```

### Retroactive Trip Entry
- If trip readings added retroactively, same logic applies as POST /api/readings
- Next anchors (if exist) updated for both start and end dates

## Contract Test Scenarios

### Test 1: Single-Day Trip Creates One Anchor
```
GIVEN no readings exist
WHEN POST /api/trips { distance: 50, startTime: "2025-10-08T10:00", endTime: "2025-10-08T11:00" }
THEN Redis contains:
  - Anchor (2025-10-08, 00:01, mileage: 0, hidden: true)
  - Start reading (2025-10-08, 10:00, mileage: 0)
  - End reading (2025-10-08, 11:00, mileage: 50)
```

### Test 2: Multi-Day Trip Creates Two Anchors
```
GIVEN no readings exist
WHEN POST /api/trips spanning 2025-10-08 to 2025-10-09
THEN Redis contains:
  - Anchor for 2025-10-08
  - Start reading (2025-10-08)
  - Anchor for 2025-10-09
  - End reading (2025-10-09)
```

### Test 3: Trip on Existing Date No Anchor
```
GIVEN reading exists on 2025-10-08
WHEN POST /api/trips on 2025-10-08
THEN no new anchors created
AND only start+end readings added
```

### Test 4: Trip Updates Next Anchor
```
GIVEN anchor exists on 2025-10-10 with mileage: 4500
WHEN POST /api/trips on 2025-10-08 with end mileage: 4550
THEN anchor on 2025-10-10 updated to mileage: 4550
```

## Non-Breaking Changes
- No changes to request/response schemas
- Anchor creation is transparent to client
- Existing trip creation behavior preserved
- New `hidden` and `isSystemGenerated` fields in returned readings (optional, backward compatible)

## Implementation Notes
- Trip creation internally calls reading creation logic twice
- Each reading independently triggers anchor checks
- Same validation and error handling as POST /api/readings
