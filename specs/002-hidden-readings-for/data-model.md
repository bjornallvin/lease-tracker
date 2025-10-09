# Data Model: Hidden Readings for Better Graphs

## Entity: MileageReading (Extended)

### Description
Represents a kilometer odometer reading at a specific point in time. Readings can be user-entered or system-generated (anchors). Readings can be marked as hidden to exclude them from graphs and calculations.

### Schema

```typescript
interface MileageReading {
  // Existing fields (unchanged)
  id: string
  date: string              // Format: YYYY-MM-DD (Swedish locale)
  time?: string             // Format: HH:MM (24-hour), optional
  mileage: number           // Odometer reading in kilometers
  note?: string             // Optional note, may contain "TRIP: " prefix for trip-generated readings
  createdAt: string         // ISO 8601 timestamp

  // New fields for this feature
  hidden?: boolean          // If true, exclude from graphs/lists/calculations (default: false)
  isSystemGenerated?: boolean  // If true, reading was auto-created as anchor (default: false)
}
```

### Field Details

#### hidden
- **Type**: `boolean` (optional)
- **Default**: `false` (undefined treated as false)
- **Purpose**: Marks reading as hidden from default views
- **Behavior**:
  - When `true`: Excluded from graphs, charts, budget calculations, and default reading list view
  - When `false` or `undefined`: Normal reading, included in all views and calculations
  - Can be toggled via filter UI to show/hide in reading list
- **Set by**: System (automatic for anchors), potentially user in future enhancements
- **Validation**: Boolean value, defaults to false if omitted

#### isSystemGenerated
- **Type**: `boolean` (optional)
- **Default**: `false` (undefined treated as false)
- **Purpose**: Distinguishes anchor readings from user-entered readings
- **Behavior**:
  - When `true`: Reading was automatically created by system as anchor
  - When `false` or `undefined`: Reading was manually entered by user
  - Used for visual indicators (e.g., "System" badge) and potential future filtering
- **Set by**: System during anchor creation
- **Validation**: Boolean value, immutable after creation

### Validation Rules

#### Existing Validations (Maintained)
1. `id` must be unique (timestamp-based generation)
2. `date` must match YYYY-MM-DD format
3. `time` if provided must match HH:MM format
4. `mileage` must be non-negative number
5. `createdAt` must be valid ISO 8601 timestamp

#### New Validations
1. `hidden` if provided must be boolean
2. `isSystemGenerated` if provided must be boolean
3. Anchor readings (isSystemGenerated=true) must have:
   - `time` set to "00:01"
   - `hidden` set to `true`
   - `note` empty or undefined (anchors don't have notes)

### State Transitions

#### Anchor Reading Lifecycle
```
[No readings on date X]
  → User adds reading on date X
  → System checks: Are there any readings on date X?
  → If NO:
      → Find previous reading (chronologically before X)
      → Create anchor reading:
         - date = X
         - time = "00:01"
         - mileage = previous.mileage (or 0 if no previous)
         - hidden = true
         - isSystemGenerated = true
      → Check for next anchor chronologically
      → If next anchor exists:
         - Update next anchor's mileage to new reading's mileage
```

#### Hidden State (Future Enhancement)
Currently, `hidden` is only set by system for anchors. Future enhancement may allow user to manually toggle `hidden` state for any reading.

### Relationships

#### Anchor → Previous Reading
- Each anchor references the chronologically previous reading's mileage value
- Relationship is data-based (mileage copied), not referential (no foreign key)
- When retroactive reading added, next anchor's mileage updates to maintain correctness

#### Reading → Anchor (Implicit)
- Each user reading on a new date triggers anchor creation (if date has no readings)
- One-to-one relationship: One reading may cause one anchor creation
- Relationship exists at creation time only (no ongoing link)

### Storage

#### Persistence Layer
- **Database**: Upstash Redis KV store
- **Key**: `lease:readings` (shared with all readings)
- **Format**: JSON array of MileageReading objects
- **Sorting**: Client-side via `compareReadings()` utility (date ASC, time ASC)

#### Backward Compatibility
- Existing readings without `hidden` or `isSystemGenerated` fields work correctly
- Optional fields default to `false`/`undefined` semantically equivalent to `false`
- No data migration required

#### Data Size Impact
- Per reading overhead: ~50 bytes (two boolean fields + JSON metadata)
- 500 readings = ~25KB additional storage
- Negligible impact on Redis storage and network transfer

### Indexing

No specialized indexes required. Current approach uses:
- Full array load from Redis (O(1) Redis operation)
- Client-side sort and filter (O(n log n) acceptable for n < 1000)

Future optimization if scale exceeds 1000 readings:
- Consider client-side Map for O(1) previous reading lookup
- Consider paginated loading for reading history

### Examples

#### User-Entered Reading
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

#### System-Generated Anchor Reading
```json
{
  "id": "1696857600001",
  "date": "2025-10-08",
  "time": "00:01",
  "mileage": 4500,
  "note": "",
  "createdAt": "2025-10-08T14:30:00.001Z",
  "hidden": true,
  "isSystemGenerated": true
}
```

#### Legacy Reading (Pre-Feature)
```json
{
  "id": "1696857500000",
  "date": "2025-10-05",
  "mileage": 4500,
  "note": "Weekly check",
  "createdAt": "2025-10-05T10:00:00.000Z"
  // No hidden or isSystemGenerated fields (treated as false)
}
```

## Data Integrity Constraints

### Invariants
1. At most one anchor per date (enforced by "check if date has readings" before anchor creation)
2. Anchor always has `time = "00:01"` (enforced at creation)
3. Anchor always has `hidden = true` and `isSystemGenerated = true` (enforced at creation)
4. Anchor mileage matches previous reading's mileage (or 0) at creation time
5. Next anchor after new reading has mileage updated to new reading's mileage (if exists)

### Consistency Checks
- If `isSystemGenerated = true`, then `hidden` must be `true`
- If `isSystemGenerated = true`, then `time` must be `"00:01"`
- If `isSystemGenerated = true`, then `note` must be empty or undefined

### Validation Enforcement
- Enforced at API layer (POST /api/readings)
- TypeScript type checking ensures field types
- Runtime validation checks before Redis write

## Migration Notes

### Existing Data
- No migration script required
- Existing readings function correctly without new fields
- Default filter behavior (hide hidden readings) doesn't affect legacy readings (no `hidden` field = not hidden)

### Future Migrations
If anchor retroactive generation is needed for existing data:
1. Load all readings
2. Sort by date/time
3. Identify dates with readings but no anchor
4. For each such date:
   - Create anchor with previous reading's mileage
   - Insert at beginning of day (time = "00:01")
5. Save back to Redis

Currently not needed as feature applies only to new readings going forward.
