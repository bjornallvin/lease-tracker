# Research: Trip Tracking with Automatic Meter Readings

**Feature**: 001-i-want-to
**Date**: 2025-10-05
**Status**: Complete

## Overview
All technical unknowns were resolved during feature specification and clarification phases (10 clarifying questions answered). This document captures key decisions and rationale for the **two-reading model** where each trip creates TWO meter readings (start + end) instead of one.

## Key Decisions

### 0. Two-Reading Architecture (CRITICAL)

**Decision**: Each trip creates TWO separate MileageReading entries: one at trip start time, one at trip end time

**Rationale**:
- Weekly chart calculates daily usage by comparing readings at day boundaries
- Single reading approach loses temporal granularity—a 120km trip backdated to Monday would appear as instant jump on Monday
- Two readings (start showing odometer before trip, end showing odometer after trip) allow chart to distribute usage correctly across dates
- Maintains data integrity: each reading is an independent snapshot of odometer at specific timestamp
- Enables accurate visualization when trips span multiple days or are backdated

**Implementation**:
- POST /api/trips creates 2 readings atomically
- **Start reading**: timestamp = trip start time, odometer = latest existing reading's odometer (or 0 if none), note = empty
- **End reading**: timestamp = trip end time, odometer = start odometer + trip distance, note = "TRIP: {user note}"
- Both use same `MileageReading` type, no new entity needed

**Timestamp Defaults**:
- Neither time provided: end = current time, start = end - 1 minute
- Only start provided: end = start + 1 minute
- Only end provided: start = end - 1 minute
- Both provided: use as-is (validate end > start)

**Alternatives Considered**:
- **Single reading with trip metadata**: Would require chart logic to understand "trip" vs "reading" semantics, violating separation of concerns
- **Zero-duration trips (identical timestamps)**: Would create ambiguity in reading order, complicate chart interpolation

### 1. Trip Data Model: Transient vs. Persistent

**Decision**: Trips are transient conversion inputs, not stored entities

**Rationale**:
- Simplifies data model - only one entity (Reading) needs storage
- Reduces Redis storage overhead - no duplicate trip/reading data
- Aligns with user mental model: "trips become readings"
- Eliminates sync issues between trip and reading records
- Editing happens at reading level (single source of truth)

**Alternatives Considered**:
- **Store trips separately**: Rejected - adds complexity, storage overhead, and potential data consistency issues
- **Hybrid (immutable trip references)**: Rejected - over-engineering for the use case; editing is rare and can happen at reading level

### 2. Trip Distance Validation Range

**Decision**: 1 km minimum, 2 000 km maximum

**Rationale**:
- 1 km min: Prevents accidental zero/typo entries while allowing short trips
- 2 000 km max: Accommodates long road trips (e.g., Stockholm to southern Europe) while catching most typos (5000 instead of 50)
- Loose enough to not frustrate users, tight enough to catch errors

**Alternatives Considered**:
- **0.1 km min / 500 km max (strict)**: Rejected - too restrictive for legitimate long trips
- **Warning-only (no hard limit)**: Rejected - doesn't prevent obvious data entry errors

### 3. Timestamp Handling for Backdated Trips

**Decision**: Current timestamp by default, optional user override with date/time picker

**Rationale**:
- Default to "now" optimizes common case (just completed trip)
- Optional override supports forgotten trips without forcing choice every time
- Weekly chart displays by timestamp, so backdating must be first-class feature
- Balances convenience (fast entry) with flexibility (historical correction)

**Alternatives Considered**:
- **Always current time**: Rejected - doesn't support forgotten trip use case
- **Always ask for time**: Rejected - adds friction to common "just drove" workflow

### 4. Visual Distinction: Trip vs. Manual Readings

**Decision**: Start reading has empty note, end reading has "TRIP: {user note}" prefix

**Rationale**:
- Start reading is a "derived snapshot"—doesn't represent user action, just odometer state before trip
- End reading represents trip completion, carries the trip metadata
- Keeps trip identification simple: search for "TRIP: " prefix
- Avoids redundant notes on both readings (saves storage, reduces visual clutter)
- Allows optional user notes: "TRIP: To office" vs just "TRIP: "
- Leverages existing data structure (no schema migration)

**Alternatives Considered**:
- **Both readings have "TRIP: " prefix**: Rejected - redundant, confusing to see two consecutive "TRIP" entries
- **Start has "TRIP: START", end has "TRIP: END"**: Rejected - verbose, adds no value
- **Separate source field**: Rejected - requires schema change

### 5. Weekly Chart Timestamp Display

**Decision**: Display readings on date specified in timestamp, not entry date

**Rationale**:
- Makes backdated trip entry meaningful (user sees trip on correct historical date)
- Consistent with existing chart logic (readings already sorted by timestamp)
- Supports batch entry of forgotten trips with correct historical visualization
- No special casing needed - chart already groups by date

**Alternatives Considered**:
- **Display on entry date**: Rejected - defeats purpose of backdating
- **Show both dates**: Rejected - clutters UI, confusing for users

## Technical Constraints (from Constitution)

### Swedish Locale Compliance
- All trip distance inputs formatted with space as thousands separator
- Date pickers use YYYY-MM-DD format
- Applied to both input and display of trip-generated readings

### Authentication Security
- Trip creation (POST /api/trips) requires authentication
- Uses existing `ADMIN_PASSWORD` and `AUTH_TOKEN` mechanism
- No new environment variables needed

### Mobile-First Design
- Trip entry form optimized for touch (44px+ tap targets)
- Date/time picker mobile-friendly (native input types where possible)
- Validation errors displayed clearly on small screens

### Data Integrity
- Trip distance validated (1-2000 km) before conversion
- Timestamp included in all trip-generated readings
- Reading deletion explicit (user confirms, no cascades)

## Dependencies

### Existing Libraries (No Changes Needed)
- **Next.js 15**: App Router for API routes and components
- **Upstash Redis**: KV storage for readings (existing schema extended)
- **Chart.js + react-chartjs-2**: Weekly chart already timestamp-aware
- **date-fns**: Date manipulation for timestamp handling
- **Tailwind CSS**: Styling for trip entry form

### No New Dependencies Required
All functionality achievable with existing tech stack.

## Performance Considerations

### Redis Operations
- Trip conversion: 2 Redis ops (GET latest reading, SET new reading)
- Same as manual reading entry - no performance degradation
- Expected <50ms for conversion logic

### Chart Rendering
- Trip-generated readings indistinguishable from manual (same data structure)
- No impact on existing chart performance targets (<1s for 100+ points)

## Data Migration

**Not Required**: Existing readings unaffected. Feature is additive only.

- Existing readings have no "TRIP: " prefix (implicitly manual)
- New readings with "TRIP: " prefix clearly marked
- No backfill or schema changes needed

## Edge Cases Handled

1. **First trip with no existing readings**: Creates start reading at 0 km, end reading at trip distance (FR-010)
2. **Zero or out-of-range distances**: Validation rejects (1-2000 km range, FR-009)
3. **Backdated trips**: Two optional time fields (start/end), defaults applied if not provided (FR-004, FR-005)
4. **End time before start time**: Rejected with validation error, submission blocked (FR-006)
5. **Trip times conflict with existing readings**: Rejected with validation error (FR-007)
6. **Partial time specification**: Start-only → end = start + 1min; End-only → start = end - 1min (FR-005)
7. **No time specified**: End = now, start = now - 1min (FR-005)
8. **Trip deletion**: Start and end readings deletable independently (FR-013)
9. **Concurrent edits**: Redis atomic operations ensure consistency (existing pattern)

## Open Questions for Implementation Phase

None - all ambiguities resolved during clarification.

## References

- Feature Spec: `/specs/001-i-want-to/spec.md`
- Constitution: `.specify/memory/constitution.md` (v1.0.0)
- Clarification Session: 2025-10-05 (10 questions resolved, including two-reading model design)
