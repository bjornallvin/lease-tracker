# Data Model: Trip Tracking with Two-Reading Architecture

**Feature**: 001-i-want-to
**Date**: 2025-10-05 (Updated with two-reading model)

## Overview

Each trip creates **TWO** MileageReading entries: a start reading (odometer before trip) and an end reading (odometer after trip). This two-reading architecture ensures accurate temporal distribution in weekly charts.

## Entities

### TripInput (Transient - Not Persisted)

**Purpose**: User input for trip entry, immediately converted to TWO MileageReading objects

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| distance | number | Yes | 1 ≤ n ≤ 2000 | Trip distance in kilometers |
| startTime | ISO 8601 string | No | Must be < endTime | Trip start timestamp (optional) |
| endTime | ISO 8601 string | No | Must be > startTime | Trip end timestamp (optional) |
| note | string | No | Max 200 chars | Optional trip note (stored in END reading with "TRIP: " prefix) |

**Lifecycle**: Created from user form → validated → converted to 2 MileageReadings → discarded

**Timestamp Resolution Logic**:
- If neither startTime nor endTime provided: endTime = now(), startTime = endTime - 1 minute
- If only startTime provided: endTime = startTime + 1 minute
- If only endTime provided: startTime = endTime - 1 minute
- If both provided: use as-is (validate endTime > startTime)

**Business Rules**:
- Distance must be between 1 and 2 000 km (inclusive)
- End time must be after start time (if both provided)
- Note is optional; if provided, stored only in end reading with "TRIP: " prefix
- Trip times must not conflict with existing readings (validation error if conflict detected)

---

### Reading (Existing Entity - Modified)

**Purpose**: Cumulative odometer reading at a specific point in time

**Fields**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | string | Yes | UUID | Unique identifier |
| odometer | number | Yes | ≥ 0 | Cumulative kilometers |
| timestamp | ISO 8601 string | Yes | Valid datetime | Reading date/time |
| note | string | No | Max 200 chars | **Modified**: Reading note OR "TRIP: {note}" for trip-generated |
| timeSpent | number | No | ≥ 0 | Time spent (minutes) - existing field |

**Source Determination** (derived, not stored):
- Reading is **trip-generated** if `note` starts with "TRIP: "
- Reading is **manual** if `note` is null, empty, or doesn't start with "TRIP: "

**Business Rules**:
- Odometer value must be non-negative
- Trip-generated readings created by: `lastReading.odometer + tripInput.distance`
- If no previous readings exist, trip distance becomes odometer value (FR-007)
- Timestamp determines position in weekly chart (FR-014)
- Deletable individually (no cascading deletes)

**Relationships**:
- Readings are stored in Redis sorted by timestamp
- No foreign keys (Redis KV store)
- Trip-generated readings have no reference to source trip (transient conversion)

---

## Data Storage (Redis)

### Key Structure

```
readings:{reading-id}
```

**Example Trip-Generated Reading**:
```json
{
  "id": "abc-123-def",
  "odometer": 10545,
  "timestamp": "2025-10-05T14:30:00.000Z",
  "note": "TRIP: To office",
  "timeSpent": null
}
```

**Example Manual Reading**:
```json
{
  "id": "xyz-789-ghi",
  "odometer": 11000,
  "timestamp": "2025-10-06T09:00:00.000Z",
  "note": "Filled up gas",
  "timeSpent": 15
}
```

### Indexes

**Existing Pattern** (maintained):
- Readings retrieved via scan/filter by timestamp range
- Sorted in application layer for display
- No changes to indexing strategy

---

## State Transitions

### Trip Conversion Flow

```
1. User submits TripInput via form
   ↓
2. Validate distance (1-2000 km), timestamp, note
   ↓ (validation fails)
   ├─→ Return error to user (400 Bad Request)
   ↓ (validation passes)
3. Fetch latest reading from Redis
   ↓ (no readings found)
   ├─→ odometer = tripInput.distance
   ↓ (readings exist)
   ├─→ odometer = latestReading.odometer + tripInput.distance
   ↓
4. Create Reading object:
   - id: generateUUID()
   - odometer: (calculated above)
   - timestamp: tripInput.timestamp || now()
   - note: tripInput.note ? `TRIP: ${tripInput.note}` : "TRIP: "
   - timeSpent: null
   ↓
5. Persist Reading to Redis
   ↓
6. Return created Reading to client
   ↓
7. TripInput discarded (never stored)
```

### Reading Lifecycle

```
Created (via manual entry OR trip conversion)
   ↓
Persisted in Redis
   ↓
Displayed in UI (list, chart)
   ↓
Editable (user updates odometer, timestamp, note, timeSpent)
   ↓
Deletable (user confirms deletion)
   ↓
Removed from Redis
```

**Note**: Trip-generated readings are editable/deletable like manual readings (FR-010).

---

## Validation Rules

### Trip Distance (FR-006)
- **Min**: 1 km (inclusive)
- **Max**: 2 000 km (inclusive)
- **Error**: "Trip distance must be between 1 and 2 000 km"

### Timestamp
- **Format**: ISO 8601 string
- **Error**: "Invalid timestamp format"

### Note Length
- **Max**: 200 characters (including "TRIP: " prefix)
- **Error**: "Note too long (max 200 characters)"

### Odometer Calculation
- **Rule**: New odometer must not be less than previous (after trip conversion)
- **Error**: "Backdated trip would create negative mileage" (if chronological issue)

---

## Data Integrity Constraints

### Atomic Operations
- Reading creation is atomic (single Redis SET)
- Trip conversion logic (fetch latest + calculate + create) wrapped in try/catch
- Failure at any step rolls back (no partial reads/writes)

### Timestamp Ordering
- Readings not strictly required to be chronological (backdating supported)
- Chart display sorts by timestamp
- Edge case: backdated trip before first reading creates negative delta (warn user)

### Note Prefix Reservation
- "TRIP: " prefix reserved for trip-generated readings
- Manual readings should not start with "TRIP: " (UI validation recommended but not enforced)
- Editing trip-generated reading can remove prefix (converts to manual semantically)

---

## Migration Strategy

**Not Required**: Feature is additive.

- Existing readings: no "TRIP: " prefix → implicitly manual
- New readings: "TRIP: " prefix → explicitly trip-generated
- No schema changes to Redis structure
- No backfill or data transformation needed

---

## Example Scenarios

### Scenario 1: First Trip (No Existing Readings)

**Input**:
```json
{
  "distance": 50,
  "timestamp": "2025-10-05T10:00:00Z",
  "note": "Initial trip"
}
```

**Processing**:
- Fetch latest reading: `null`
- Odometer: `50` (trip distance becomes initial value per FR-007)
- Note: `"TRIP: Initial trip"`

**Output**:
```json
{
  "id": "generated-uuid",
  "odometer": 50,
  "timestamp": "2025-10-05T10:00:00Z",
  "note": "TRIP: Initial trip",
  "timeSpent": null
}
```

### Scenario 2: Trip After Existing Reading

**Latest Reading**:
```json
{
  "id": "prev-uuid",
  "odometer": 10500,
  "timestamp": "2025-10-04T15:00:00Z",
  "note": null
}
```

**Trip Input**:
```json
{
  "distance": 45
}
```

**Processing**:
- Fetch latest: odometer = 10500
- New odometer: 10500 + 45 = 10545
- Timestamp: defaults to now()
- Note: `"TRIP: "` (no user note provided)

**Output**:
```json
{
  "id": "new-uuid",
  "odometer": 10545,
  "timestamp": "2025-10-05T14:30:00Z",
  "note": "TRIP: ",
  "timeSpent": null
}
```

### Scenario 3: Backdated Trip

**Latest Reading** (today):
```json
{
  "id": "today-uuid",
  "odometer": 11000,
  "timestamp": "2025-10-05T08:00:00Z"
}
```

**Trip Input** (yesterday):
```json
{
  "distance": 120,
  "timestamp": "2025-10-02T16:00:00Z",
  "note": "Forgot to log this"
}
```

**Processing**:
- Fetch latest reading by timestamp: 11000
- **Warning**: Backdated trip creates reading before current latest
- New odometer: 11000 + 120 = 11120 (cumulative is correct)
- Note: Reading will appear chronologically before latest in sorted view

**Output**:
```json
{
  "id": "backdated-uuid",
  "odometer": 11120,
  "timestamp": "2025-10-02T16:00:00Z",
  "note": "TRIP: Forgot to log this",
  "timeSpent": null
}
```

**UI Behavior**: Weekly chart shows 120 km on Oct 2, not Oct 5 (FR-014).

---

## References

- Spec: `specs/001-i-want-to/spec.md`
- Research: `specs/001-i-want-to/research.md`
- Constitution: `.specify/memory/constitution.md`
