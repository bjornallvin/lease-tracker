# Feature Specification: Trip Tracking with Automatic Meter Readings

**Feature Branch**: `001-i-want-to`
**Created**: 2025-10-05
**Status**: Draft
**Input**: User description: "I want to add a feature to not only add meter readings but actual trips with km. This should then be transformed into readings."

## Execution Flow (main)
```
1. Parse user description from Input
   → ✅ Feature description provided
2. Extract key concepts from description
   → ✅ Identified: users, trips with kilometers, meter reading transformation
3. For each unclear aspect:
   → [NEEDS CLARIFICATION] marked below
4. Fill User Scenarios & Testing section
   → ✅ User flow defined
5. Generate Functional Requirements
   → ✅ Requirements created with testable criteria
6. Identify Key Entities (if data involved)
   → ✅ Trip and Reading entities identified
7. Run Review Checklist
   → ⚠ WARN "Spec has uncertainties" - see NEEDS CLARIFICATION markers
8. Return: PENDING (awaiting clarification)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-05
- Q: Should trip data be stored as separate entities in the database, or should trips only exist transiently to generate meter readings? → A: Trips are conversion-only - trips immediately create readings and are discarded; only the reading persists with a "source:trip" flag
- Q: When no previous meter readings exist and user adds their first trip, how should the system establish the initial baseline? → A: Trip distance becomes first reading - if user enters 50 km trip with no prior readings, odometer reading becomes 50 km
- Q: What are the acceptable minimum and maximum trip distance values to prevent data entry errors? → A: Loose limits: 1 km minimum, 2000 km maximum - allows long road trips but blocks obvious errors
- Q: Should users be able to specify a custom date/time when entering a trip, or should the system always use the current timestamp? → A: Current by default, optional override - default to now, but provide optional date/time picker for backdated entries
- Q: How should the UI visually distinguish between trip-generated and manually entered meter readings in the reading history? → A: Use the note data field. Add a prefix to any note given with "TRIP: "
- Q: When entering a trip with a specific date/time, where should the kilometers be displayed in the weekly view? → A: Trip kilometers must be shown on the date specified in the trip timestamp, not the entry date
- Q: When a user enters a trip, how many readings should be created and with what timestamps? → A: Two readings: (1) start reading at trip start time with odometer before trip, (2) end reading at trip end time with odometer after trip. If no times specified: end = current time, start = end - 1 minute. If only start specified: end = start + 1 minute. If only end specified: start = end - 1 minute.
- Q: When a trip has a user note (e.g., "To office"), what should the note field contain for each of the two readings? → A: Start reading has no note or empty. End reading has "TRIP: {user note}".
- Q: When there are NO previous readings and user adds their first trip of 50 km, what should the odometer values be? → A: Start: 0 km, End: 50 km (trip distance added to zero baseline)
- Q: What timing input fields should the trip entry form provide? → A: Two fields: "Trip Start Time" and "Trip End Time" (both optional)
- Q: What should happen if user provides invalid times (e.g., end before start, or conflicts with existing readings)? → A: Reject with validation error immediately (block submission)
- Q: When a reading already exists on the trip's start date, should the system create both start and end readings or optimize by skipping the start reading? → A: Skip start reading - only create end reading (optimization to avoid duplicate readings on same date)
- Q: Should the "TRIP: " prefix be visible to users in the UI, or should it be masked/hidden as an internal implementation detail? → A: Hide from users - add prefix automatically when saving, strip prefix when displaying (technical detail users shouldn't see)
- Q: Should kilometer inputs allow decimal values (e.g., 4804.5 km) or only whole numbers? → A: Allow decimals - users can enter fractional kilometers for precise odometer readings

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
A user records vehicle trips throughout the day with distance traveled (in kilometers). When a trip is entered, the system creates TWO meter reading entries: one at the trip start time showing the odometer before the trip, and one at the trip end time showing the odometer after adding the trip distance. This allows the weekly chart to accurately display usage on the correct dates, and users can track trips incrementally without manually calculating cumulative mileage.

**Example**: User's last meter reading was 10 500 km. They drive a 45 km trip ending at 2:00 PM today. The system creates two readings: (1) 10 500 km at 1:59 PM (trip start), (2) 10 545 km at 2:00 PM (trip end).

### Acceptance Scenarios
1. **Given** the last meter reading is 10 500 km, **When** user adds a trip of 45 km with no time specified and note "To office", **Then** system creates two readings: (1) 10 500 km at current time minus 1 minute (trip start) with empty note, (2) 10 545 km at current time (trip end) with note "TRIP: To office" (prefix stored internally but hidden in UI)
2. **Given** user has no previous meter readings, **When** user adds their first trip of 50 km, **Then** system creates two readings: (1) 0 km at trip start time with empty note, (2) 50 km at trip end time with "TRIP: " note
3. **Given** user adds a trip with both start time (9:00 AM) and end time (10:00 AM), **When** trip is saved, **Then** start reading is timestamped 9:00 AM and end reading is timestamped 10:00 AM
4. **Given** user adds a trip with only start time (9:00 AM), **When** trip is saved, **Then** start reading is 9:00 AM and end reading is 9:01 AM (start + 1 minute)
5. **Given** user adds a trip with only end time (10:00 AM), **When** trip is saved, **Then** start reading is 9:59 AM (end - 1 minute) and end reading is 10:00 AM
6. **Given** user tries to add a trip with end time before start time, **When** submitting the form, **Then** system rejects with validation error and blocks submission
7. **Given** user views the dashboard, **When** looking at reading history, **Then** user can identify trip-generated readings by a visual "Trip" badge (note displays without "TRIP: " prefix)
8. **Given** user wants to edit historical data, **When** viewing past trip-generated readings, **Then** user can edit/delete both start and end readings independently like any other reading
9. **Given** user edits a trip-generated reading with note "TRIP: To office", **When** opening the edit form, **Then** the note field shows "To office" (prefix stripped), and **When** saving, **Then** the note is stored as "TRIP: To office" (prefix re-added automatically)
10. **Given** user adds a trip dated 3 days ago with 120 km, **When** viewing the weekly usage chart, **Then** the 120 km appears on the date from 3 days ago, not today
11. **Given** user enters a manual reading with odometer value 4804.5 km, **When** saving, **Then** the system accepts the decimal value and displays it as "4 804,5 km" (Swedish formatting with comma as decimal separator)
12. **Given** user adds a trip with distance 22.5 km, **When** saving, **Then** the system calculates end odometer by adding 22.5 to the start odometer and displays with 1 decimal place precision

### Edge Cases
- What happens when user adds a trip with 0 km distance? (Rejected: below 1 km minimum)
- What happens when user enters an unrealistic trip distance (e.g., 5 000 km)? (Rejected: exceeds 2 000 km maximum)
- How does system handle trip entries with backdated timestamps? (Supported: user provides start/end times, both optional)
- What happens if user manually adds a meter reading, then adds a trip entry? (Trip creates two readings based on latest odometer value)
- How does system handle deleted trip-generated readings? (Each reading can be deleted independently; deleting start or end reading doesn't auto-delete the other)
- What if user's first trip is 10 km, but their actual odometer reads 15 000 km? (First trip creates 0 km start and 10 km end readings, which won't match real odometer - user should add manual reading first)
- What happens when user enters 0.5 km or exactly 1 km or exactly 2 000 km? (0.5 rejected - below minimum, 1.0 and 2 000.0 accepted)
- What happens when user enters 22.5 km trip with decimal? (Accepted: decimals supported, displayed as 22,5 km with Swedish formatting)
- What happens when user enters odometer reading 4804,5 using Swedish comma? (Accepted: both comma and dot parsed as decimal separator, stored as 4804.5)
- What happens when user enters 1234.567 with multiple decimal places? (Accepted and rounded to 1 decimal place: displayed as 1 234,6 km)
- What if user provides end time before start time? (Rejected with validation error, submission blocked)
- What if trip times conflict with existing readings? (Validation error, submission blocked)
- What happens if user provides only start time? (End time = start + 1 minute)
- What happens if user provides only end time? (Start time = end - 1 minute)
- What happens if user provides neither start nor end time? (End = current time, start = current time - 1 minute)

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: Users MUST be able to record individual trips with kilometer distance and optional start/end times
- **FR-002**: System MUST create meter reading entries for each trip: (1) if a reading exists on the trip's start date, create ONLY the end reading; (2) if no reading exists on the trip's start date, create BOTH start reading (odometer before trip) and end reading (odometer after adding trip distance). This optimization prevents duplicate readings on the same date.
- **FR-003**: System MUST calculate odometer values: start reading uses latest existing odometer value (or 0 if no readings exist), end reading adds trip distance to start odometer
- **FR-004**: Trip entry form MUST provide two optional time fields: "Trip Start Time" and "Trip End Time"
- **FR-005**: System MUST apply timestamp defaults: if neither time provided, end = current time and start = end - 1 minute; if only start provided, end = start + 1 minute; if only end provided, start = end - 1 minute; if both provided, use as-is
- **FR-006**: System MUST validate that end time is after start time, rejecting submission with error if end is before or equal to start
- **FR-007**: System MUST validate trip times do not conflict with existing readings, rejecting submission with error if conflicts detected
- **FR-008**: Trip start reading MUST have empty/no note field; trip end reading MUST have "TRIP: " prefix with optional user note appended (e.g., "TRIP: To office" or just "TRIP: " if no note provided)
- **FR-009**: System MUST validate trip distances are between 1 km (minimum) and 2 000 km (maximum), rejecting entries outside this range to prevent data entry errors
- **FR-010**: System MUST handle the case where no previous meter reading exists by creating start reading with 0 km and end reading with trip distance (first trip of 50 km creates 0 km start and 50 km end)
- **FR-011**: Trip-generated readings MUST be subject to authentication requirements (write operations require auth) per existing security model
- **FR-012**: Trip-generated readings MUST be identifiable in the reading history by a visual "Trip" badge; the "TRIP: " prefix is added automatically to the note field internally but MUST be hidden from users in all UI displays (implementation detail, not visible to users)
- **FR-013**: Trip-generated readings (both start and end) MUST be editable and deletable independently like manual readings; when editing a trip-generated reading, the "TRIP: " prefix MUST be stripped in the edit form and automatically re-added when saving to preserve trip identification
- **FR-014**: Dashboard calculations (daily rate, budget status, projections) MUST include both start and end trip-generated readings
- **FR-015**: All trip distances and odometer readings MUST support decimal values (e.g., 4804.5 km) for precise tracking; numbers MUST use Swedish formatting (space as thousands separator, comma as decimal separator for display)
- **FR-016**: Users MAY optionally provide a note when entering a trip; the note is stored in the end reading's note field with automatic "TRIP: " prefix (prefix hidden from user in UI)
- **FR-017**: Weekly usage view MUST display trip kilometers on the dates specified in the trip's start/end timestamps, not the date the trip was entered (supports backdated trip visualization)

### Key Entities *(include if feature involves data)*
- **Trip Input** (transient, not stored): User input containing trip distance in kilometers, optional start time, optional end time, and optional note. Immediately converted to TWO meter readings upon submission (start reading and end reading), then discarded.
- **Meter Reading** (existing entity, modified): Existing entity representing total cumulative mileage at a specific timestamp. For trip-generated readings: the start reading has empty note field, the end reading has note field starting with "TRIP: " prefix (optionally followed by user note). Persisted fields: timestamp, odometer value, note (with "TRIP: " prefix for trip-generated end readings, empty for trip-generated start readings, user-defined or empty for manual readings).

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Next Steps
**Status**: ✅ READY FOR PLANNING

All critical ambiguities have been resolved through the clarification session. The specification is complete and ready for the `/plan` command to generate the implementation plan.
