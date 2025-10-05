# API Contract: POST /api/trips

**Endpoint**: `POST /api/trips`
**Purpose**: Create a new trip entry that converts to a meter reading
**Authentication**: Required (write operation)

---

## Request

### Headers
```
Content-Type: application/json
Authorization: Bearer {AUTH_TOKEN}
```

### Body Schema
```typescript
{
  distance: number;       // Required: 1-2000 km
  timestamp?: string;     // Optional: ISO 8601, defaults to now()
  note?: string;          // Optional: max 200 chars (before "TRIP: " prefix)
}
```

### Example Request
```json
POST /api/trips
Content-Type: application/json
Authorization: Bearer {token}

{
  "distance": 45,
  "timestamp": "2025-10-05T14:30:00.000Z",
  "note": "To office"
}
```

---

## Response

### Success (201 Created)

**Headers**:
```
Content-Type: application/json
```

**Body**: Returns the created Reading object
```typescript
{
  id: string;           // UUID
  odometer: number;     // Cumulative km
  timestamp: string;    // ISO 8601
  note: string;         // "TRIP: {user note}" or "TRIP: "
  timeSpent: null;      // Always null for trip-generated readings
}
```

**Example**:
```json
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "abc-123-def-456",
  "odometer": 10545,
  "timestamp": "2025-10-05T14:30:00.000Z",
  "note": "TRIP: To office",
  "timeSpent": null
}
```

### Error Responses

#### 400 Bad Request - Validation Errors

**Distance out of range**:
```json
{
  "error": "Trip distance must be between 1 and 2 000 km",
  "field": "distance",
  "value": 5000
}
```

**Invalid timestamp**:
```json
{
  "error": "Invalid timestamp format",
  "field": "timestamp",
  "value": "not-a-date"
}
```

**Note too long**:
```json
{
  "error": "Note exceeds maximum length (200 characters)",
  "field": "note"
}
```

**Missing distance**:
```json
{
  "error": "Distance is required",
  "field": "distance"
}
```

#### 401 Unauthorized - Authentication Failure

```json
{
  "error": "Authentication required"
}
```

#### 500 Internal Server Error - Server Failure

```json
{
  "error": "Failed to create trip reading",
  "details": "Redis connection error"
}
```

---

## Validation Rules

### distance (Required)
- **Type**: number
- **Min**: 1 (inclusive)
- **Max**: 2000 (inclusive)
- **Error Code**: 400
- **Swedish Format**: Input may use space separator (e.g., "1 234"), parsed to number

### timestamp (Optional)
- **Type**: string (ISO 8601 format)
- **Default**: `new Date().toISOString()`
- **Validation**: Must be parseable by `new Date()`
- **Error Code**: 400

### note (Optional)
- **Type**: string
- **Max Length**: 200 characters (excluding "TRIP: " prefix added by system)
- **Transformation**: Prepended with "TRIP: " before storage
- **Error Code**: 400

---

## Business Logic

### Odometer Calculation

1. Fetch latest reading from Redis (sorted by timestamp)
2. If no readings exist:
   - `odometer = distance`
3. If readings exist:
   - `odometer = latestReading.odometer + distance`

### Note Formatting

- If `note` provided: `"TRIP: " + note`
- If `note` null/empty: `"TRIP: "`

### Timestamp Handling

- If `timestamp` provided: use as-is (supports backdating)
- If `timestamp` omitted: use current server time

---

## Example Scenarios

### Scenario 1: Basic Trip (No Optional Fields)

**Request**:
```json
POST /api/trips
{
  "distance": 45
}
```

**Response** (201):
```json
{
  "id": "generated-uuid",
  "odometer": 10545,
  "timestamp": "2025-10-05T14:30:22.123Z",
  "note": "TRIP: ",
  "timeSpent": null
}
```

### Scenario 2: Trip with Note and Timestamp

**Request**:
```json
POST /api/trips
{
  "distance": 120,
  "timestamp": "2025-10-02T16:00:00Z",
  "note": "Business trip to Gothenburg"
}
```

**Response** (201):
```json
{
  "id": "generated-uuid",
  "odometer": 10665,
  "timestamp": "2025-10-02T16:00:00Z",
  "note": "TRIP: Business trip to Gothenburg",
  "timeSpent": null
}
```

### Scenario 3: First Trip (No Existing Readings)

**Request**:
```json
POST /api/trips
{
  "distance": 50
}
```

**Response** (201):
```json
{
  "id": "generated-uuid",
  "odometer": 50,
  "timestamp": "2025-10-05T10:00:00Z",
  "note": "TRIP: ",
  "timeSpent": null
}
```
(Odometer = trip distance, per FR-007)

### Scenario 4: Validation Error

**Request**:
```json
POST /api/trips
{
  "distance": 5000
}
```

**Response** (400):
```json
{
  "error": "Trip distance must be between 1 and 2 000 km",
  "field": "distance",
  "value": 5000
}
```

### Scenario 5: Unauthorized

**Request**:
```json
POST /api/trips
(No Authorization header)
{
  "distance": 45
}
```

**Response** (401):
```json
{
  "error": "Authentication required"
}
```

---

## Integration Points

### Existing Endpoints (No Changes Required)

- `GET /api/readings` - Returns all readings (including trip-generated with "TRIP: " prefix)
- `DELETE /api/readings?id={id}` - Can delete trip-generated readings
- `PUT /api/readings?id={id}` - Can edit trip-generated readings (including removing "TRIP: " prefix)

### UI Components (New Integration)

- **TripEntryForm** → calls `POST /api/trips`
- **ReadingsList** → displays readings, visually distinguishes "TRIP: " prefix
- **WeeklyChart** → plots trip-generated readings by timestamp

---

## Performance

### Expected Latency
- **P50**: <100ms
- **P95**: <200ms
- **P99**: <500ms

### Redis Operations
1. GET latest reading (1 query)
2. SET new reading (1 write)
**Total**: 2 Redis ops per trip creation

### Rate Limiting
No specific rate limiting required (authenticated users, low volume expected).

---

## Security

### Authentication
- Uses existing `AUTH_TOKEN` mechanism
- Token validated via middleware
- Unauthorized requests rejected with 401

### Input Sanitization
- Distance: numeric validation (no SQL injection risk)
- Timestamp: ISO 8601 parsing (invalid formats rejected)
- Note: string (no HTML rendering, stored as plain text)

### Authorization
- No role-based access (single-user or small team)
- All authenticated users can create trips

---

## Testing

### Contract Test Scenarios

1. **Valid trip creation** (201)
2. **Distance below minimum** (400)
3. **Distance above maximum** (400)
4. **Invalid timestamp format** (400)
5. **Missing distance field** (400)
6. **Note exceeds max length** (400)
7. **Unauthenticated request** (401)
8. **First trip with no readings** (201, odometer = distance)
9. **Backdated trip** (201, timestamp in past)
10. **Swedish number format input** (201, "1 234" parsed as 1234)

### Integration Test Scenarios

1. Trip creation → GET /api/readings → verify trip appears with "TRIP: " prefix
2. Trip creation → Weekly chart → verify appears on correct date
3. Multiple trips → odometer increments correctly
4. Trip creation → DELETE trip reading → verify removed
5. Trip creation → EDIT trip reading → verify note editable

---

## References

- Data Model: `specs/001-i-want-to/data-model.md`
- Spec FR-001 through FR-014: `specs/001-i-want-to/spec.md`
- Authentication: Existing `app/lib/auth.ts` mechanism
