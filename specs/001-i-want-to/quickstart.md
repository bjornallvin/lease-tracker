# Quickstart: Trip Tracking Manual Testing

**Feature**: Trip Tracking with Automatic Meter Readings
**Branch**: `001-i-want-to`
**Date**: 2025-10-05

## Prerequisites

1. **Environment Setup**:
   ```bash
   # Verify environment variables
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   echo $ADMIN_PASSWORD
   echo $AUTH_TOKEN
   ```

2. **Dependencies Installed**:
   ```bash
   npm install
   ```

3. **Build Successful**:
   ```bash
   npm run build
   ```

4. **Development Server** (user-controlled):
   ```bash
   npm run dev
   # Access at http://localhost:3000
   ```

---

## Test Scenarios

### ✅ Scenario 1: Basic Trip Entry (Happy Path)

**Objective**: Create a trip and verify it converts to a reading.

**Steps**:
1. Navigate to `http://localhost:3000`
2. Authenticate (if not already logged in)
3. Locate "Add Trip" form (new UI component)
4. Enter:
   - Distance: `45`
   - Leave timestamp empty (defaults to now)
   - Leave note empty
5. Click "Add Trip"

**Expected Result**:
- ✅ Success message displayed
- ✅ New reading appears in reading list with odometer = (previous odometer + 45)
- ✅ Reading note shows "TRIP: " prefix
- ✅ Timestamp = current date/time
- ✅ Weekly chart updates with new reading on today's date

**Verification**:
```bash
# Check Redis directly (optional)
curl -X GET "$UPSTASH_REDIS_REST_URL/scan/0" \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

---

### ✅ Scenario 2: Trip with Custom Note

**Objective**: Verify note field works and gets "TRIP: " prefix.

**Steps**:
1. Navigate to trip entry form
2. Enter:
   - Distance: `120`
   - Note: `To office`
3. Submit

**Expected Result**:
- ✅ Reading created with note = `"TRIP: To office"`
- ✅ Note visible in reading list
- ✅ Odometer incremented by 120 km

---

### ✅ Scenario 3: Backdated Trip

**Objective**: Verify custom timestamp works and appears on correct date in weekly chart.

**Steps**:
1. Navigate to trip entry form
2. Enter:
   - Distance: `80`
   - Timestamp: Select date 3 days ago
   - Note: `Forgot to log this`
3. Submit

**Expected Result**:
- ✅ Reading created with timestamp = 3 days ago
- ✅ Weekly chart shows 80 km on the selected date (not today)
- ✅ Note = `"TRIP: Forgot to log this"`
- ✅ Reading appears in chronologically correct position in list

---

### ✅ Scenario 4: First Trip (No Existing Readings)

**Objective**: Verify first trip creates initial odometer value.

**Steps**:
1. **Clear all readings** (admin action):
   ```bash
   # Delete all readings via UI or Redis CLI
   ```
2. Navigate to trip entry form
3. Enter:
   - Distance: `50`
4. Submit

**Expected Result**:
- ✅ Reading created with odometer = `50` (not 0 + 50)
- ✅ Note = `"TRIP: "`
- ✅ No error about missing previous reading

---

### ❌ Scenario 5: Distance Below Minimum (Validation Error)

**Objective**: Verify validation rejects distances < 1 km.

**Steps**:
1. Navigate to trip entry form
2. Enter:
   - Distance: `0.5`
3. Submit

**Expected Result**:
- ❌ Error message: "Trip distance must be between 1 and 2 000 km"
- ❌ Form not submitted
- ❌ No reading created

**Alternative Inputs to Test**:
- Distance: `0` → Error
- Distance: `-10` → Error
- Distance: `0.9` → Error

---

### ❌ Scenario 6: Distance Above Maximum (Validation Error)

**Objective**: Verify validation rejects distances > 2000 km.

**Steps**:
1. Navigate to trip entry form
2. Enter:
   - Distance: `5000`
3. Submit

**Expected Result**:
- ❌ Error message: "Trip distance must be between 1 and 2 000 km"
- ❌ No reading created

**Alternative Inputs**:
- Distance: `2001` → Error
- Distance: `10000` → Error

---

### ✅ Scenario 7: Swedish Number Formatting (Input)

**Objective**: Verify Swedish-formatted input is parsed correctly.

**Steps**:
1. Navigate to trip entry form
2. Enter:
   - Distance: `1 234` (with space separator)
3. Submit

**Expected Result**:
- ✅ Distance parsed as `1234` km
- ✅ Reading created with odometer incremented by 1234
- ✅ No validation error

---

### ✅ Scenario 8: Swedish Number Formatting (Display)

**Objective**: Verify distances displayed with space separator.

**Steps**:
1. Create trip with distance `1234`
2. View reading list

**Expected Result**:
- ✅ Distance displayed as `1 234 km` (with space)
- ✅ Odometer displayed as `10 545` (example, with space)
- ✅ Consistent with existing Swedish locale settings

---

### ✅ Scenario 9: Edit Trip-Generated Reading

**Objective**: Verify trip-generated readings are editable.

**Steps**:
1. Create a trip (distance: `45`)
2. Locate the created reading in the list
3. Click "Edit" on the trip-generated reading
4. Change:
   - Odometer: `10600`
   - Note: `Updated note` (remove "TRIP: " prefix)
5. Save

**Expected Result**:
- ✅ Reading updated successfully
- ✅ Note now = `"Updated note"` (no longer trip-generated)
- ✅ Odometer = `10600`
- ✅ No distinction from manual reading after edit

---

### ✅ Scenario 10: Delete Trip-Generated Reading

**Objective**: Verify trip-generated readings are deletable.

**Steps**:
1. Create a trip (distance: `45`)
2. Locate the created reading
3. Click "Delete"
4. Confirm deletion

**Expected Result**:
- ✅ Reading removed from list
- ✅ Weekly chart updated (reading no longer shown)
- ✅ Subsequent trips calculate from previous reading (skipping deleted one)

---

### ✅ Scenario 11: Unauthenticated Trip Creation

**Objective**: Verify authentication is required.

**Steps**:
1. Log out (if logged in)
2. Attempt to access trip entry form OR
3. Make direct API call without auth:
   ```bash
   curl -X POST http://localhost:3000/api/trips \
     -H "Content-Type: application/json" \
     -d '{"distance": 45}'
   ```

**Expected Result**:
- ❌ 401 Unauthorized response
- ❌ Error message: "Authentication required"
- ❌ Trip not created

---

### ✅ Scenario 12: Weekly Chart Displays Trip Readings

**Objective**: Verify trip-generated readings appear in weekly chart on correct dates.

**Steps**:
1. Create trip for today (distance: `50`)
2. Create backdated trip for 3 days ago (distance: `80`)
3. Navigate to weekly chart view

**Expected Result**:
- ✅ Chart shows 50 km on today's date
- ✅ Chart shows 80 km on date from 3 days ago
- ✅ Both readings plotted by their timestamp, not entry time

---

### ✅ Scenario 13: Multiple Trips on Same Day

**Objective**: Verify multiple trips on same day accumulate correctly.

**Steps**:
1. Create trip: distance `30`, timestamp: today 09:00
2. Create trip: distance `45`, timestamp: today 14:00
3. Create trip: distance `25`, timestamp: today 18:00

**Expected Result**:
- ✅ Three separate readings created
- ✅ Odometers increment: +30, +45, +25
- ✅ All three visible in reading list
- ✅ Weekly chart aggregates all three on today's date

---

### ✅ Scenario 14: Note Too Long (Validation)

**Objective**: Verify note length validation.

**Steps**:
1. Navigate to trip entry form
2. Enter:
   - Distance: `45`
   - Note: `{201+ character string}`
3. Submit

**Expected Result**:
- ❌ Error: "Note exceeds maximum length (200 characters)"
- ❌ No reading created

---

### ✅ Scenario 15: Visual Distinction in Reading List

**Objective**: Verify trip-generated vs. manual readings are visually distinct.

**Steps**:
1. Create manual reading (via existing form): odometer `10500`, note `Manual entry`
2. Create trip: distance `45`, note `To office`
3. View reading list side-by-side

**Expected Result**:
- ✅ Manual reading shows note: `"Manual entry"` (no prefix)
- ✅ Trip reading shows note: `"TRIP: To office"` (with prefix)
- ✅ Visually distinguishable (e.g., icon, badge, or text styling)

---

## Performance Validation

### Dashboard Load Time

**Steps**:
1. Create 100+ readings (mix manual and trip-generated)
2. Navigate to dashboard
3. Measure load time (browser DevTools Network tab)

**Expected Result**:
- ✅ Dashboard loads < 2 seconds (3G simulation)
- ✅ Chart renders < 1 second

### Trip Creation Latency

**Steps**:
1. Submit trip via form
2. Measure time from submit to success message (DevTools)

**Expected Result**:
- ✅ P95 latency < 200ms
- ✅ No UI freeze during submission

---

## Mobile Testing

### Responsive UI

**Steps**:
1. Open DevTools
2. Enable device simulation (iPhone 12 / Pixel 5)
3. Navigate to trip entry form
4. Test all scenarios above

**Expected Result**:
- ✅ Form fields sized appropriately
- ✅ Touch targets ≥ 44px
- ✅ Date/time picker mobile-friendly
- ✅ Error messages readable on small screen
- ✅ Weekly chart scrollable/zoomable on mobile

---

## Regression Testing

### Existing Functionality (Should Not Break)

1. **Manual Reading Entry**:
   - ✅ Still works as before
   - ✅ No "TRIP: " prefix unless manually added

2. **Reading List**:
   - ✅ Displays all readings (manual + trip)
   - ✅ Sorting by timestamp works

3. **Weekly Chart**:
   - ✅ Displays all readings correctly
   - ✅ No visual bugs with trip-generated readings

4. **Authentication**:
   - ✅ Login/logout still works
   - ✅ Protected routes remain protected

5. **Swedish Locale**:
   - ✅ All numbers formatted with space separator
   - ✅ Dates formatted YYYY-MM-DD

---

## Deployment Validation (Production)

### Pre-Deployment Checklist

1. ✅ All quickstart scenarios passed locally
2. ✅ Build completes without errors: `npm run build`
3. ✅ No TypeScript errors
4. ✅ No console errors in browser
5. ✅ Mobile testing complete

### Deployment Steps

```bash
# Manual deployment via Vercel CLI
vercel --prod
```

### Post-Deployment Testing

1. Access production URL
2. Run Scenarios 1, 2, 3, 8, 12 (core functionality)
3. Verify mobile responsiveness on real device
4. Check Redis data integrity

---

## Rollback Plan

If critical issues found in production:

1. **Immediate**: Revert to previous Vercel deployment:
   ```bash
   vercel rollback
   ```

2. **Data**: Trip-generated readings stored as regular readings (no migration needed)

3. **Fallback**: Users can still create manual readings if trip form broken

---

## Known Limitations

1. **Chronological Ordering**: Backdated trips may create odometer sequence that looks wrong if sorted by timestamp (e.g., trip dated before first reading shows higher odometer)
2. **No Trip History**: Once converted to reading, trip data (distance) not retrievable separately
3. **Note Prefix Removal**: Editing trip-generated reading can remove "TRIP: " prefix, making it indistinguishable from manual reading

---

## Support Resources

- **Feature Spec**: `specs/001-i-want-to/spec.md`
- **Data Model**: `specs/001-i-want-to/data-model.md`
- **API Contract**: `specs/001-i-want-to/contracts/POST-trips.md`
- **Constitution**: `.specify/memory/constitution.md`

---

## Test Completion Checklist

Before marking feature complete:

- [ ] All ✅ scenarios pass
- [ ] All ❌ scenarios fail as expected
- [ ] Performance validation complete
- [ ] Mobile testing complete
- [ ] Regression testing complete
- [ ] Production deployment successful
- [ ] Post-deployment smoke tests pass

---

**Last Updated**: 2025-10-05
**Status**: Ready for Testing
