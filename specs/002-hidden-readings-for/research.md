# Research: Hidden Readings for Better Graphs

## Overview
This document consolidates technical research and design decisions for implementing automatic anchor reading creation and hidden reading functionality.

## Technical Decisions

### 1. Data Model Extension Strategy

**Decision**: Extend the existing `MileageReading` interface with two new optional boolean fields: `hidden` and `isSystemGenerated`.

**Rationale**:
- Minimal schema change - two simple boolean flags
- Backward compatible (optional fields default to undefined/false)
- No data migration required (existing readings without these fields work as before)
- Aligns with existing Redis JSON storage pattern
- TypeScript provides type safety for new fields

**Alternatives Considered**:
- Separate `AnchorReading` type: Rejected due to unnecessary complexity and duplication
- Bitmask/enum for reading types: Rejected as overkill for two simple flags
- Separate Redis key for anchor readings: Rejected due to added complexity in querying/sorting

### 2. Anchor Creation Timing

**Decision**: Create anchor readings synchronously during the POST /api/readings operation, immediately after validating and adding the user's reading.

**Rationale**:
- Simplest implementation - single atomic operation
- No background jobs or async processing needed
- Immediate consistency - anchor exists before API response returns
- Fits serverless environment (no persistent background workers)
- User sees correct graph immediately after adding reading

**Alternatives Considered**:
- Background job after response: Rejected due to serverless environment limitations
- Client-side creation: Rejected due to lack of authentication and data integrity concerns
- Lazy creation on chart render: Rejected due to complexity and potential race conditions

### 3. Previous Reading Lookup Logic

**Decision**: When creating an anchor, query all readings, sort by date/time, and find the chronologically previous reading before the target date.

**Rationale**:
- Leverages existing `compareReadings` sorting utility
- Handles gaps in data correctly (previous reading may be days/weeks old)
- Simple linear scan acceptable for expected scale (~100-500 readings)
- No indexing needed in Redis for this scale

**Algorithm**:
```
1. Load all readings from Redis
2. Sort readings using existing compareReadings function
3. Find insertion point for new date
4. Previous reading = reading immediately before insertion point (or null if first)
5. Use previous reading's mileage (or 0 if null) for anchor value
```

**Performance**: O(n log n) for sort, O(n) for scan. Acceptable for n < 1000.

**Alternatives Considered**:
- Redis sorted sets with date-based scores: Rejected due to migration complexity
- Separate index structure: Rejected as premature optimization
- Binary search: Rejected as over-engineering for current scale

### 4. Retroactive Anchor Update Strategy

**Decision**: When adding a reading, after anchor creation, check if there's an existing anchor immediately after the new reading's date and update its kilometer value if needed.

**Rationale**:
- Only one anchor can be affected (the immediately next one)
- Simple linear scan to find next anchor after new reading
- Maintains data integrity for retroactive data entry
- Minimal performance impact (one additional scan + optional update)

**Algorithm**:
```
1. After creating anchor for new reading (if needed)
2. Scan sorted readings to find next anchor after new reading's date
3. If found and it's an anchor (isSystemGenerated = true):
   - Update its mileage to new reading's mileage
   - Save updated readings array to Redis
4. Otherwise, no action needed
```

**Alternatives Considered**:
- Update all future anchors: Rejected as unnecessary (only immediate next is affected)
- Skip retroactive updates: Rejected due to data accuracy concerns
- Rebuild all anchors: Rejected as too expensive

### 5. Filter UI Implementation

**Decision**: Add a toggle button in the ReadingHistory component header to show/hide hidden readings. State managed via React useState, default to hiding hidden readings.

**Rationale**:
- Simple UI pattern consistent with existing app
- No persistent state needed (filter resets on page reload)
- Minimal code - just filter() operation on displayed readings
- Touch-friendly toggle button meets mobile-first requirement

**UI Elements**:
- Toggle button with eye icon (lucide-react has Eye/EyeOff icons)
- Button text: "Show Hidden" / "Hide Hidden"
- Visual indicator: Readings with `hidden=true` or `isSystemGenerated=true` show gray background + "Hidden" badge

**Alternatives Considered**:
- Persistent filter state in localStorage: Rejected as unnecessary complexity
- Dropdown menu: Rejected as less touch-friendly
- Separate page for hidden readings: Rejected as overkill

### 6. Chart Filtering Strategy

**Decision**: Filter hidden readings in the component's data preparation logic before passing to Chart.js. Apply filter in MileageChart, WeeklyChart, and calculation utilities.

**Rationale**:
- Centralized filtering at data source
- Chart.js unaware of hidden readings (separation of concerns)
- Easy to test and debug
- Performance acceptable (filter is O(n), negligible for <1000 readings)

**Implementation Points**:
- MileageChart.tsx: Filter before building chart datasets
- WeeklyChart.tsx: Filter before weekly aggregation
- lib/utils.ts: Add `filterVisibleReadings()` utility function

**Alternatives Considered**:
- Chart.js plugin for filtering: Rejected as unnecessary complexity
- Backend filtering with query param: Rejected as all filtering is client-side in this app
- CSS hiding: Rejected as calculations would still include hidden data

### 7. Timestamp Format for Anchors

**Decision**: Anchor timestamp format: `"HH:MM"` string set to `"00:01"` (1 minute after midnight). Store in the existing optional `time` field.

**Rationale**:
- Reuses existing `time` field in MileageReading interface
- Consistent with existing time handling in codebase
- `00:01` ensures anchor sorts first on any given date (before user readings)
- Existing `compareReadings` function handles date+time sorting correctly

**Alternatives Considered**:
- `00:00` (midnight): Rejected to avoid edge cases with date boundaries
- Full ISO timestamp: Rejected as existing schema uses separate date+time fields
- No time field: Rejected as sorting would be ambiguous for multiple readings per day

## Integration Points

### Modified Files
1. **lib/types.ts**: Extend MileageReading interface
2. **app/api/readings/route.ts**: Add anchor creation logic in POST handler
3. **app/api/trips/route.ts**: Add anchor creation logic (trips create readings)
4. **lib/utils.ts**: Add `findPreviousReading()` and `filterVisibleReadings()` utilities
5. **app/components/ReadingHistory.tsx**: Add filter toggle UI and visual indicators
6. **app/components/MileageChart.tsx**: Apply hidden reading filter
7. **app/components/WeeklyChart.tsx**: Apply hidden reading filter

### No Changes Required
- Authentication system (existing auth covers modified endpoints)
- Database schema (Redis JSON flexibly handles new fields)
- Swedish locale formatters (no new formatting needed)
- PWA configuration (no new assets or manifest changes)

## Risk Assessment

### Low Risk
- Data model changes (backward compatible optional fields)
- Performance impact (O(n) filters acceptable for scale)
- UI changes (minimal, consistent with existing patterns)

### Medium Risk
- Edge case handling (first reading, retroactive updates, date boundary cases)
- Testing coverage (manual testing required per constitution)

### Mitigation Strategies
- Comprehensive manual test scenarios in quickstart.md
- Defensive null checks in anchor creation logic
- Clear visual indicators for hidden readings in UI
- Detailed contract specifications for anchor creation behavior

## Dependencies

### Existing Dependencies (No Changes)
- Next.js 15.5+ (App Router)
- React 19
- Upstash Redis
- Chart.js + react-chartjs-2
- lucide-react (icons)
- Tailwind CSS

### New Dependencies
None required.

## Performance Considerations

### Expected Impact
- Additional O(n) scans during reading creation: ~1-2ms for 500 readings
- Filter operations on chart render: ~1ms for 500 readings
- Redis payload size increase: ~50 bytes per reading (two booleans + metadata)
- No impact on chart rendering performance (Chart.js sees fewer data points)

### Optimization Opportunities (Future)
- If scale exceeds 1000 readings, consider:
  - Client-side indexing for previous reading lookup
  - Memoization of filtered reading arrays
  - Lazy loading/pagination for reading history

Currently, no optimizations needed given expected scale.

## Conclusion

All technical decisions prioritize simplicity and leverage existing patterns in the codebase. No new dependencies, no schema migrations, and minimal code changes required. The design aligns with constitutional principles (Swedish locale, mobile-first, authentication, data integrity, deployment simplicity) and fits within the serverless Next.js architecture.
