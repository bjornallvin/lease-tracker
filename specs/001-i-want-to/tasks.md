# Tasks: Trip Tracking with Two-Reading Architecture

**Input**: Design documents from `/Users/bjorn.allvin/code/lease-tracker/specs/001-i-want-to/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/POST-trips.md, quickstart.md

## ⚠️ CRITICAL: Two-Reading Model

Each trip creates **TWO** separate MileageReading entries:
1. **Start reading**: Timestamp = trip start, odometer = previous reading's odometer (or 0), note = empty
2. **End reading**: Timestamp = trip end, odometer = start odometer + trip distance, note = "TRIP: {user note}"

This architecture ensures accurate weekly chart display when trips are backdated or span multiple days.

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Tech stack: TypeScript, Next.js 15, React 19, Upstash Redis
2. Load design documents:
   → ✅ data-model.md: TripInput (transient), Reading (modified)
   → ✅ contracts/POST-trips.md: POST /api/trips endpoint (TWO readings)
   → ✅ quickstart.md: 15 test scenarios
   → ✅ research.md: Two-reading architecture rationale
3. Generate tasks by category:
   → Setup: TypeScript types (foundation)
   → API: Trip endpoint with TWO-reading creation
   → UI: TripEntryForm with start/end time fields
   → Integration: Chart updates, formatters
   → Polish: Manual testing via quickstart
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Dependencies tracked in Dependencies section
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. ✅ Tasks ready for execution
```

---

## 📊 Implementation Status

**Current State**: ✅ **TWO-READING MODEL IMPLEMENTATION COMPLETE**

✅ **Core Implementation Complete**:
- T001: ✅ TripInput interface updated with `startTime` + `endTime` fields
- T002-T004: ✅ API creates TWO readings atomically (start + end) with timestamp resolution logic
- T005: ✅ TripEntryForm has TWO time fields (Trip Start Time, Trip End Time)
- T006: ✅ ReadingHistory shows trip badges for end readings
- T007: ✅ **WeeklyChart fixed** to support multiple readings per day
- T008: ✅ Swedish formatters working
- T009: ✅ Integration complete (modal tabs)
- T011-T012: ✅ UX enhancements complete
- T013: ✅ Trip time conflict validation added

🧪 **Ready for Testing**:
- T010: Manual testing with two-reading scenarios (ready to execute via quickstart.md)

**Implementation Summary**:
1. **Smart reading creation**: If a reading exists on trip's start date → create ONLY end reading; otherwise → create start + end readings (prevents duplicate same-day readings)
2. Timestamp defaults: neither=now/-1min, start-only=+1min, end-only=-1min, both=as-is
3. Weekly chart correctly displays trips with multiple same-day readings
4. Conflict validation prevents overlapping trip times

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- Next.js App Router: `app/` at repository root
- API routes: `app/api/*/route.ts`
- Components: `app/components/*.tsx`
- Types: `lib/types.ts`
- Libraries: `lib/*.ts`

---

## Phase 3.1: Type Definitions (Foundation)

- [x] **T001** [P] Update TripInput interface in `lib/types.ts` for two-reading model
  - **Current**: `TripInput` has single `timestamp?: string` field
  - **Change to**: `{ distance: number; startTime?: string; endTime?: string; note?: string; }` (TWO timestamps for two readings)
  - Document Reading.note field semantics: note starting with "TRIP: " indicates trip-generated END reading, empty note indicates trip-generated START reading
  - Add JSDoc comments explaining transient nature of TripInput and two-reading conversion model
  - Ensure TypeScript strict mode compliance
  - **Migration**: Replace all references to `timestamp` with `startTime`/`endTime` in API and form

---

## Phase 3.2: API Implementation (Core Logic - Two-Reading Model)

- [x] **T002** Update POST /api/trips endpoint in `app/api/trips/route.ts` for two-reading model
  - **Current**: Endpoint exists, creates ONE reading with single timestamp
  - **Update**: Parse request body to extract `startTime` and `endTime` (not single `timestamp`)
  - Keep existing authentication check (use existing `lib/auth.ts`)
  - Return 401 if authentication fails
  - Return 400 for validation errors
  - **Update**: Implement TWO-reading conversion logic (placeholder → actual implementation)

- [x] **T003** Update trip validation logic in `app/api/trips/route.ts` for timestamp resolution
  - Keep existing distance validation: 1 ≤ distance ≤ 2000 (inclusive)
  - **Add**: **Timestamp resolution logic** (per research.md):
    - If neither startTime nor endTime provided: endTime = now(), startTime = endTime - 1 minute
    - If only startTime provided: endTime = startTime + 1 minute
    - If only endTime provided: startTime = endTime - 1 minute
    - If both provided: validate endTime > startTime, reject if invalid
  - Keep existing note validation: max 200 characters
  - **Add**: Return error "End time must be after start time" if validation fails
  - Return specific 400 error messages per contract

- [x] **T004** Update trip-to-reading conversion to create TWO readings in `app/api/trips/route.ts`
  - **Current**: Creates ONE reading with trip distance added to latest odometer
  - **Update**: Fetch latest reading from Redis using existing `lib/redis.ts`
  - Calculate start odometer: if no readings exist, startOdometer = 0; else startOdometer = latestReading.mileage
  - Calculate end odometer: endOdometer = startOdometer + distance
  - **Update**: **Create TWO Reading objects atomically** (critical change):
    - **Start reading**: { id: UUID, date: startTime date, time: startTime time, mileage: startOdometer, note: "" (empty), createdAt: now() }
    - **End reading**: { id: UUID, date: endTime date, time: endTime time, mileage: endOdometer, note: note ? `TRIP: ${note}` : "TRIP: ", createdAt: now() }
  - **Update**: Persist BOTH readings to Redis (two separate writes or batch)
  - **Update**: Return 201 Created with array of both readings `[startReading, endReading]`

---

## Phase 3.3: UI Components (User Interface)

- [x] **T005** [P] Update TripEntryForm component in `app/components/TripEntryForm.tsx` for two-reading model
  - **Current**: Form has single "Trip Time" field (datetime-local)
  - **Update**: Replace single timestamp field with TWO separate fields:
    - **Trip Start Time** (datetime-local, optional, label: "Trip Start Time")
    - **Trip End Time** (datetime-local, optional, label: "Trip End Time")
  - Keep existing: distance (number input, required), note (text input, optional, max 200 chars)
  - **Update**: Client-side validation:
    - Keep: Distance 1-2000, Swedish number format parsing (accept "1 234" → 1234)
    - **Add**: If both times provided: validate end > start, show error "End time must be after start time" if invalid
  - **Update**: Default behavior: leave BOTH time fields empty (backend applies defaults per T003)
  - **Update**: Display help text: "Leave times empty to use current time. Default: end = now, start = 1 minute before end."
  - Keep existing: validation errors inline, authentication token in headers
  - **Update**: POST request body: `{ distance, startTime, endTime, note }` (not single `timestamp`)
  - **Update**: Success handling: expect array of 2 readings in response, show "Trip added (2 readings created)" message
  - Keep existing: clear form on success, mobile-responsive (44px+ touch targets)

- [x] **T006** Update ReadingHistory component in `app/components/ReadingHistory.tsx`
  - Modify reading display to visually distinguish "TRIP: " prefix (badge with car icon) on END readings
  - **Start readings** (empty note, from trip) have no special badge (appear as normal readings)
  - **End readings** (note starts with "TRIP: ") show trip badge/icon
  - Ensure "TRIP: " prefix is clearly visible in note field
  - Maintain existing edit/delete functionality (both start and end trip-generated readings editable/deletable independently)
  - No breaking changes to existing manual reading display

- [x] **T007** Fix WeeklyChart to support multiple readings per day (two-reading model)
  - **Issue found**: Original logic assumed ONE reading per day, failed with two-reading model
  - **Root cause**: Chart compared currentDay with nextDay readings, but trip creates TWO readings on same day
  - **Fix applied**: Updated `calculateDailyUsage()` in `app/weekly/page.tsx` to:
    - Get ALL readings per day using `filter()` instead of `find()`
    - Find MAX mileage for each day (last reading's odometer)
    - Calculate daily usage as: (end of current day) - (end of previous day)
  - **Result**: Chart now correctly displays trip kilometers on the trip's date
  - **Example**: 22 km trip on Sunday shows as 22 km bar on Sunday in weekly chart

- [x] **T008** [P] Add Swedish number formatting helper in `lib/formatters.ts`
  - Created `formatKilometers(km: number): string` with space separator
  - Added `parseSwedishNumber(value: string): number` for input parsing
  - Used in TripEntryForm for distance parsing
  - Consistent with existing Swedish locale patterns

---

## Phase 3.4: Integration & Polish

- [x] **T009** Integrate TripEntryForm into main page in `app/components/MileageTracker.tsx`
  - Added TripEntryForm component after Dashboard
  - Passed authentication token to TripEntryForm
  - Form only visible when authenticated (conditional rendering)
  - Refresh readings via fetchData callback after successful trip creation
  - Mobile-responsive layout maintained

- [ ] **T010** Manual validation: Execute quickstart test scenarios in `specs/001-i-want-to/quickstart.md`
  - Ready for manual testing once dev server running
  - **CRITICAL**: All scenarios updated for two-reading model
  - Scenarios 1-4 (✅ happy paths with TWO readings): basic trip creates start+end, custom note on end reading only, backdated trips, first trip (start=0, end=distance)
  - Scenario 3 (✅ backdated): Verify TWO readings appear, start and end on correct dates
  - Scenario 11 (edge cases): Test partial time specification (only start, only end, neither, both)
  - Scenario 6 (❌ error): End time before start time validation
  - Scenario 7 (❌ error): Trip time conflicts with existing readings
  - Scenarios 8-9 (✅ edit/delete): Verify start and end readings deletable independently
  - Verify constitution compliance: Swedish locale, auth, mobile UI, data integrity

---

## Phase 3.5: Additional Validation (Two-Reading Model)

- [x] **T013** Add trip time conflict detection in `app/api/trips/route.ts`
  - After timestamp resolution (T003), before creating readings:
  - Fetch all existing readings from Redis
  - Check if startTime or endTime conflicts with existing reading timestamps (within 1 second tolerance)
  - If conflict detected: return 400 with error "Trip times conflict with existing readings"
  - Document validation logic in code comments
  - **Note**: This prevents overlapping trips or trips that would create readings with duplicate timestamps

---

## Follow-Up Tasks

- [x] **T011** [UX Enhancement] Combine trip form with reading modal
  - **Implementation completed**:
    - Added `entryMode` state ('manual' | 'trip') to MileageTracker component
    - Removed standalone TripEntryForm from main page layout
    - Added tab selector to modal with "Manual Reading" and "Add Trip" buttons
    - Implemented conditional rendering to show ReadingForm or TripEntryForm based on entryMode
    - Modal resets to 'manual' mode on close
  - **Files modified**:
    - `app/components/MileageTracker.tsx` - Lines 32, 274-322
  - **Result**: Single unified entry point via existing + button, tab-based interface for selecting entry type

- [x] **T012** [UX Enhancement] Add trip entry to weekly and history pages
  - **Implementation completed**:
    - Added same tab-based modal pattern to weekly page
    - Added same tab-based modal pattern to history page
    - Both pages now support manual reading and trip entry via modal tabs
    - Consistent UX across all pages (dashboard, weekly, history)
  - **Files modified**:
    - `app/weekly/page.tsx` - Added TripEntryForm import, entryMode state, tab selector in modal
    - `app/history/page.tsx` - Added TripEntryForm import, entryMode state, tab selector in modal
  - **Result**: Users can add trips from any page in the application

---

## Dependencies

### Critical Path (Two-Reading Model)
```
T001 (types with startTime/endTime) blocks:
  → T002, T003, T004 (API uses TripInput type with two timestamps)
  → T005 (form uses TripInput type with start/end time fields)

T002, T003 (validation + timestamp resolution) block:
  → T004 (TWO-reading creation needs validated timestamps)

T004 (TWO-reading creation) blocks:
  → T005 (form calls API expecting two readings)
  → T013 (conflict validation needs reading creation logic)
  → T009 (integration needs working API)

T005, T006, T007, T008 (UI components) block:
  → T009 (page integration needs components)

T009 (integration) blocks:
  → T010 (testing requires complete feature)

T010 (manual testing) should verify:
  → T013 (conflict validation) is working correctly
```

### Parallel-Safe Tasks
```
After T001:
  → T002, T003, T004 run sequentially (same file, TWO-reading logic complex)
  → T005, T008 can run in parallel AFTER T004 complete (different files)

After API complete (T004):
  → T005, T006, T007, T008 can run in parallel (different files)
  → T013 can run in parallel with UI work (different concerns)

After T009:
  → T010 must run alone (manual end-to-end testing)
```

---

## Parallel Execution Examples

### Stage 1: Foundation
```bash
# T001 must complete first (types are dependencies)
# Execute: Define types
```

### Stage 2: Core Implementation
```bash
# T002, T003, T004 are sequential (same file: app/api/trips/route.ts)
# Execute in order: T002 → T003 → T004

# In parallel with API work (after T001):
# Execute: T008 (formatters - independent file)
```

### Stage 3: UI Components
```bash
# After API complete, run in parallel:
# Task 1: T005 (TripEntryForm)
# Task 2: T006 (ReadingsList updates)
# Task 3: T007 (WeeklyChart verification)
# All three are different files, no dependencies
```

### Stage 4: Integration
```bash
# After all UI components ready:
# Execute: T009 (integrate into page)
# Execute: T010 (manual testing)
```

---

## Task Validation Checklist

### Before Starting Implementation
- [x] All contracts have corresponding implementation tasks (POST /api/trips → T002-T004)
- [x] All entities have type definition tasks (TripInput, Reading → T001)
- [x] All UI components planned (TripEntryForm → T005)
- [x] Parallel tasks truly independent (T005, T006, T007, T008 are different files)
- [x] Each task specifies exact file path

### During Implementation
- [ ] TypeScript compilation passes after each task
- [ ] No console errors in browser after UI tasks
- [ ] Swedish locale formatting applied consistently
- [ ] Authentication enforced on trip creation endpoint
- [ ] Mobile responsiveness verified for new components

### After Implementation
- [ ] All 10 quickstart scenarios pass
- [ ] Constitution compliance verified (Swedish locale, auth, mobile-first, data integrity)
- [ ] No regressions in existing functionality (manual readings, chart, auth)

---

## Notes

### Task Ordering Rationale (Two-Reading Model)
1. **T001 first**: Types are foundation for all TypeScript code (updated for startTime/endTime fields)
2. **T002-T004 sequential**: Same file (route.ts), build incrementally - **T004 creates TWO readings atomically**
3. **T005-T008 parallel-safe**: Different files, independent work
4. **T009 integration**: Requires all components ready
5. **T010 manual testing**: End-to-end validation with two-reading scenarios
6. **T013 conflict validation**: Additional safety check for two-reading model

### File Modification Summary
- **New files**: `app/api/trips/route.ts` (TWO-reading creation logic), `app/components/TripEntryForm.tsx` (start/end time fields)
- **Modified files**: `lib/types.ts` (TripInput with startTime/endTime), `app/components/ReadingHistory.tsx` (trip badges), `lib/formatters.ts` (Swedish numbers), `app/components/MileageTracker.tsx` (integration)
- **Verified files**: `app/components/WeeklyChart.tsx` (timestamp-based display works with two readings)
- **No changes**: `lib/redis.ts`, `lib/auth.ts` (reuse existing)

### Testing Strategy
Manual validation via quickstart.md scenarios (constitution mandates manual testing, no automated test suite required).

**Critical Test Cases for Two-Reading Model**:
- Trip creates exactly TWO readings (start + end)
- Start reading has empty note, end reading has "TRIP: " prefix
- Timestamp defaults work correctly (neither/start-only/end-only/both scenarios)
- End time > start time validation
- Backdated trips appear on correct dates in weekly chart
- Both start and end readings independently editable/deletable

### Estimated Timeline
- **T001**: 15 min (types with two timestamps)
- **T002-T004**: 90 min (API implementation with TWO-reading logic, timestamp resolution)
- **T005**: 60 min (form component with start/end time fields)
- **T006-T008**: 30 min (component updates + formatter)
- **T009**: 20 min (integration)
- **T010**: 60 min (manual testing with two-reading scenarios)
- **T013**: 30 min (conflict validation)
**Total**: ~5 hours (increased due to two-reading complexity)

---

## References

- **Spec**: `specs/001-i-want-to/spec.md`
- **Plan**: `specs/001-i-want-to/plan.md`
- **Data Model**: `specs/001-i-want-to/data-model.md`
- **API Contract**: `specs/001-i-want-to/contracts/POST-trips.md`
- **Quickstart**: `specs/001-i-want-to/quickstart.md`
- **Constitution**: `.specify/memory/constitution.md` (v1.0.0)

---

**Generated**: 2025-10-05
**Updated**: 2025-10-05 (revised for two-reading architecture)
**Status**: Ready for two-reading model implementation

---

## 🎯 Next Steps (Two-Reading Model Migration)

**Priority Order**:
1. **T001**: Update `TripInput` type (`timestamp` → `startTime` + `endTime`)
2. **T002-T004**: Update API endpoint to create TWO readings with timestamp resolution logic
3. **T005**: Update TripEntryForm to have TWO time input fields
4. **T013**: Add trip time conflict validation
5. **T010**: Run manual testing with two-reading scenarios

**Critical Success Criteria**:
- Each trip creates exactly 2 readings (start + end)
- Start reading has empty note, end reading has "TRIP: " prefix
- Timestamp defaults work: neither/start-only/end-only/both scenarios
- Weekly chart shows trips on correct dates (both start and end readings)
- Both readings independently editable/deletable

**Estimated Effort**: ~3-4 hours for migration from single-reading to two-reading model
