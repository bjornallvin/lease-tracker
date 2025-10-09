# API Contract: GET /api/readings (Modified)

## Overview
Retrieves all mileage readings including both user-entered and system-generated anchor readings. Returns extended MileageReading objects with `hidden` and `isSystemGenerated` fields.

## Endpoint
```
GET /api/readings
```

## Authentication
**Required**: No (public read access per constitution)

## Request

### Headers
```
(No special headers required)
```

### Query Parameters
None

## Response

### Success Response (200 OK)
```typescript
MileageReading[]

interface MileageReading {
  id: string
  date: string
  time?: string
  mileage: number
  note?: string
  createdAt: string
  hidden?: boolean           // New field
  isSystemGenerated?: boolean  // New field
}
```

### Example Success Response
```json
[
  {
    "id": "1696857500000",
    "date": "2025-10-05",
    "mileage": 4500,
    "note": "Weekly check",
    "createdAt": "2025-10-05T10:00:00.000Z"
  },
  {
    "id": "1696857600001",
    "date": "2025-10-08",
    "time": "00:01",
    "mileage": 4500,
    "note": "",
    "createdAt": "2025-10-08T14:30:00.001Z",
    "hidden": true,
    "isSystemGenerated": true
  },
  {
    "id": "1696857600000",
    "date": "2025-10-08",
    "time": "14:30",
    "mileage": 4593,
    "note": "Refueling at station",
    "createdAt": "2025-10-08T14:30:00.000Z",
    "hidden": false,
    "isSystemGenerated": false
  }
]
```

### Error Responses

#### 503 Service Unavailable
```json
{
  "error": "Database not configured. Please set up Upstash Redis."
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to fetch readings"
}
```

## Behavior Specification

### Sorting
- Readings returned sorted by `date` ASC, then `time` ASC
- Uses existing `compareReadings()` utility function
- Anchor readings (time "00:01") appear first on their date

### Filtering
- NO server-side filtering applied
- ALL readings returned (including hidden anchors)
- Client responsible for filtering based on `hidden` field if needed

### Legacy Readings
- Readings without `hidden` or `isSystemGenerated` fields included
- Missing fields treated as `undefined` (semantically equivalent to `false`)

### Empty State
- If no readings exist in Redis, returns default readings (existing behavior):
  ```json
  [
    {
      "id": "1",
      "date": "2025-07-09",
      "mileage": 0,
      "note": "Lease start",
      "createdAt": "2025-10-08T..."
    },
    {
      "id": "2",
      "date": "2025-09-23",
      "mileage": 4593,
      "note": "Current reading",
      "createdAt": "2025-10-08T..."
    }
  ]
  ```

## Contract Test Scenarios

### Test 1: Returns All Readings Including Anchors
```
GIVEN readings exist:
  - User reading: { date: "2025-10-08", mileage: 4593 }
  - Anchor reading: { date: "2025-10-08", time: "00:01", mileage: 4500, hidden: true }
WHEN GET /api/readings
THEN response is array of 2 readings
AND response includes both user reading and anchor
```

### Test 2: Anchor Sorts Before User Reading on Same Date
```
GIVEN readings on 2025-10-08:
  - User reading: { time: "14:30", mileage: 4593 }
  - Anchor reading: { time: "00:01", mileage: 4500 }
WHEN GET /api/readings
THEN response[0] is anchor (time: "00:01")
AND response[1] is user reading (time: "14:30")
```

### Test 3: Legacy Readings Without New Fields
```
GIVEN reading exists without hidden/isSystemGenerated fields:
  - { date: "2025-10-05", mileage: 4500, note: "Old reading" }
WHEN GET /api/readings
THEN response includes reading
AND hidden field is undefined or false
AND isSystemGenerated field is undefined or false
```

### Test 4: Hidden Field Preserved in Response
```
GIVEN anchor reading exists with hidden: true
WHEN GET /api/readings
THEN response includes anchor
AND anchor.hidden === true
AND anchor.isSystemGenerated === true
```

### Test 5: No Server-Side Filtering
```
GIVEN 5 readings exist (3 hidden, 2 visible)
WHEN GET /api/readings
THEN response.length === 5
AND all readings returned regardless of hidden status
```

## Non-Breaking Changes
- Adds optional `hidden` and `isSystemGenerated` fields to response objects
- Existing clients can ignore unknown fields (forward compatible)
- No changes to response structure or status codes
- Legacy readings without new fields still returned correctly

## Client Responsibilities
- Client must filter `hidden` readings if UI requires hiding them
- Client must handle `undefined` values for new fields (backward compatibility)
- Client should use visual indicators for `isSystemGenerated` readings
