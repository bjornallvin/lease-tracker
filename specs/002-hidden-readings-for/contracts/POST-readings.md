# API Contract: POST /api/readings (Modified)

## Overview
Creates a new mileage reading. If the reading is added on a date with no existing readings, the system automatically creates a hidden anchor reading at 00:01 on that date. If the reading is added retroactively, updates the immediately next anchor (if exists).

## Endpoint
```
POST /api/readings
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
  date: string        // Required. Format: YYYY-MM-DD
  time?: string       // Optional. Format: HH:MM (24-hour)
  mileage: number     // Required. Non-negative integer (kilometers)
  note?: string       // Optional. Free-text note
}
```

### Example Request
```json
{
  "date": "2025-10-08",
  "time": "14:30",
  "mileage": 4593,
  "note": "Refueling at station"
}
```

## Response

### Success Response (201 Created)
```typescript
{
  id: string
  date: string
  time?: string
  mileage: number
  note?: string
  createdAt: string
  hidden?: boolean
  isSystemGenerated?: boolean
}
```

**Note**: Response returns the user-created reading, NOT the anchor. The anchor is created silently in the background.

### Example Success Response
```json
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
```

### Error Responses

#### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

#### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

#### 503 Service Unavailable
```json
{
  "error": "Database not configured. Please set up Upstash Redis."
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to save reading"
}
```

## Behavior Specification

### Anchor Creation Logic
1. **User reading is validated and added** to the readings array
2. **System checks**: Does the target date already have any readings (including the just-added one)?
   - Count readings with `date === newReading.date`
   - If count > 1: Skip anchor creation (date already had readings)
   - If count === 1: Proceed to anchor creation
3. **Find previous reading**:
   - Sort all readings by date/time
   - Find reading immediately before new reading
   - If found: Use `previous.mileage` for anchor
   - If not found (first reading ever): Use `0` for anchor
4. **Create anchor reading**:
   ```typescript
   {
     id: `${Date.now()}-anchor`,
     date: newReading.date,
     time: "00:01",
     mileage: previousMileage,
     note: "",
     createdAt: new Date().toISOString(),
     hidden: true,
     isSystemGenerated: true
   }
   ```
5. **Insert anchor** into readings array
6. **Check for next anchor**:
   - Sort readings by date/time
   - Find first anchor (isSystemGenerated=true) after new reading
   - If found: Update `nextAnchor.mileage = newReading.mileage`
7. **Sort** all readings
8. **Save** to Redis
9. **Return** user reading (not anchor) in response

### Duplicate Handling (Existing Behavior)
- If exact duplicate exists (same date AND time): Replace the duplicate
- Otherwise: Add as new reading (multiple readings per date allowed)

### Edge Cases

#### First Reading Ever
- No previous reading exists
- Anchor created with `mileage = 0`

#### Retroactive Reading
- New reading added between existing readings
- Next anchor (if exists) updated to use new reading's mileage

#### Multiple Readings Same Date
- Only first reading on date triggers anchor creation
- Subsequent readings same date: No anchor created

#### Anchor Already Exists
- Date check prevents duplicate anchors
- System counts existing readings on date before creating anchor

## Contract Test Scenarios

### Test 1: First Reading Creates Zero-Mileage Anchor
```
GIVEN no readings exist
WHEN POST /api/readings with { date: "2025-10-08", mileage: 100 }
THEN response.mileage === 100
AND Redis contains 2 readings:
  - User reading: { date: "2025-10-08", mileage: 100, hidden: false }
  - Anchor reading: { date: "2025-10-08", time: "00:01", mileage: 0, hidden: true, isSystemGenerated: true }
```

### Test 2: Second Reading on New Date Creates Anchor with Previous Mileage
```
GIVEN reading exists: { date: "2025-10-05", mileage: 4500 }
WHEN POST /api/readings with { date: "2025-10-08", mileage: 4593 }
THEN response.mileage === 4593
AND Redis contains anchor: { date: "2025-10-08", time: "00:01", mileage: 4500, hidden: true }
```

### Test 3: Second Reading on Existing Date Does NOT Create Anchor
```
GIVEN reading exists: { date: "2025-10-08", time: "10:00", mileage: 4500 }
WHEN POST /api/readings with { date: "2025-10-08", time: "14:00", mileage: 4593 }
THEN response.mileage === 4593
AND Redis does NOT contain anchor with time "00:01" for 2025-10-08
```

### Test 4: Retroactive Reading Updates Next Anchor
```
GIVEN readings exist:
  - { date: "2025-10-05", mileage: 4500 }
  - { date: "2025-10-10", time: "00:01", mileage: 4500, isSystemGenerated: true }
  - { date: "2025-10-10", time: "14:00", mileage: 4600 }
WHEN POST /api/readings with { date: "2025-10-08", mileage: 4550 }
THEN anchor for 2025-10-10 updated to mileage: 4550
```

### Test 5: Anchor Timestamp Always 00:01
```
GIVEN no readings on 2025-10-08
WHEN POST /api/readings with { date: "2025-10-08", time: "18:30", mileage: 4593 }
THEN anchor has time: "00:01"
AND anchor sorts before user reading (00:01 < 18:30)
```

## Non-Breaking Changes
- Adds optional `hidden` and `isSystemGenerated` fields to response
- Existing clients ignore unknown fields (backward compatible)
- No changes to request schema or existing validation rules
