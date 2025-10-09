# Quickstart: Hidden Readings for Better Graphs

## Purpose
This document provides manual test scenarios to validate the hidden readings feature. Execute these scenarios in order after implementation to verify correct behavior.

## Prerequisites
- Application running locally or deployed to Vercel
- Redis database configured and accessible
- Admin authentication credentials available
- Browser dev tools open for inspecting network requests

## Setup
1. Clear existing readings (optional - for clean test state):
   - Navigate to application
   - Delete all readings except lease start
   - Verify only one reading remains

2. Verify baseline:
   - Navigate to main dashboard
   - Confirm chart renders correctly
   - Navigate to reading history
   - Confirm list shows existing readings

## Test Scenarios

### Scenario 1: First Reading Creates Zero-Mileage Anchor

**Objective**: Verify anchor creation with mileage=0 when no previous reading exists

**Steps**:
1. Clear all readings (start with empty database)
2. Add first reading:
   - Date: 2025-10-08
   - Time: 14:30
   - Mileage: 100 km
   - Note: "First reading"
3. Click "Add Reading" (authenticate if prompted)

**Expected Results**:
- ✅ Success message displayed
- ✅ Reading appears in reading list (mileage: 100)
- ✅ Navigate to Network tab → inspect readings response
- ✅ Response contains 2 readings:
  - User reading: `{ date: "2025-10-08", time: "14:30", mileage: 100, hidden: false, isSystemGenerated: false }`
  - Anchor reading: `{ date: "2025-10-08", time: "00:01", mileage: 0, hidden: true, isSystemGenerated: true }`
- ✅ Reading list shows only 1 reading (anchor hidden by default)
- ✅ Weekly chart shows reading in correct date bucket

---

### Scenario 2: Second Reading on New Date Creates Anchor with Previous Mileage

**Objective**: Verify anchor uses previous reading's mileage value

**Steps**:
1. Starting from Scenario 1 state (one reading: 2025-10-08, 100 km)
2. Add second reading:
   - Date: 2025-10-12
   - Time: 16:00
   - Mileage: 350 km
   - Note: "Weekend trip"
3. Click "Add Reading"

**Expected Results**:
- ✅ Success message displayed
- ✅ Reading list shows 2 visible readings (100 km and 350 km)
- ✅ Inspect Network → Response contains 4 readings total:
  - 2025-10-08 anchor (mileage: 0)
  - 2025-10-08 user reading (mileage: 100)
  - **2025-10-12 anchor (mileage: 100)** ← Uses previous reading's mileage
  - 2025-10-12 user reading (mileage: 350)
- ✅ Weekly chart shows both readings in correct date buckets
- ✅ Chart does NOT show anchor readings as data points

---

### Scenario 3: Second Reading on Same Date Does NOT Create Anchor

**Objective**: Verify no duplicate anchors created for same date

**Steps**:
1. Starting from Scenario 2 state
2. Add third reading on existing date:
   - Date: 2025-10-12 (same as previous)
   - Time: 20:00
   - Mileage: 380 km
   - Note: "Evening reading"
3. Click "Add Reading"

**Expected Results**:
- ✅ Success message displayed
- ✅ Reading list shows 3 visible readings (100, 350, 380)
- ✅ Inspect Network → Response contains 5 readings total:
  - 2025-10-08 anchor + user reading
  - 2025-10-12 anchor + 2 user readings (NO second anchor for 2025-10-12)
- ✅ Verify 2025-10-12 has exactly ONE anchor (time: 00:01)
- ✅ Weekly chart shows all readings correctly

---

### Scenario 4: Retroactive Reading Updates Next Anchor

**Objective**: Verify adding reading between existing dates updates future anchor

**Steps**:
1. Starting from Scenario 3 state:
   - 2025-10-08: 100 km
   - 2025-10-12 anchor: 100 km ← Should update to 250 km
   - 2025-10-12: 350 km, 380 km
2. Add retroactive reading:
   - Date: 2025-10-10
   - Time: 12:00
   - Mileage: 250 km
   - Note: "Midweek reading"
3. Click "Add Reading"

**Expected Results**:
- ✅ Success message displayed
- ✅ Reading list shows 4 visible readings (100, 250, 350, 380)
- ✅ Inspect Network → Response contains 7 readings total:
  - 2025-10-08 anchor (mileage: 0) + user reading (100)
  - **2025-10-10 anchor (mileage: 100)** ← New anchor created
  - 2025-10-10 user reading (mileage: 250)
  - **2025-10-12 anchor (mileage: 250)** ← Updated from 100 to 250!
  - 2025-10-12 user readings (350, 380)
- ✅ Verify 2025-10-12 anchor updated correctly
- ✅ Weekly chart shows all readings in correct buckets

---

### Scenario 5: Filter Toggle Shows/Hides Hidden Readings

**Objective**: Verify filter UI controls visibility of anchor readings

**Steps**:
1. Starting from Scenario 4 state (4 visible + 3 hidden anchors)
2. Navigate to Reading History page
3. Verify default state: Only 4 visible readings shown
4. Locate filter toggle button (likely near top of list)
5. Click "Show Hidden" button

**Expected Results**:
- ✅ Button text changes to "Hide Hidden"
- ✅ Reading list now shows 7 readings (4 user + 3 anchors)
- ✅ Anchor readings visually distinguished:
  - Gray/muted background color
  - "Hidden" or "System" badge/label
  - Time shows "00:01"
  - Note is empty
- ✅ Anchors sorted correctly (first on their date, before user readings)

6. Click "Hide Hidden" button

**Expected Results**:
- ✅ Button text changes to "Show Hidden"
- ✅ Reading list returns to 4 visible readings
- ✅ Anchor readings removed from view

---

### Scenario 6: Charts Exclude Hidden Readings

**Objective**: Verify hidden readings don't appear in charts

**Steps**:
1. Starting from Scenario 4 state
2. Navigate to main dashboard (MileageChart)
3. Inspect chart data points

**Expected Results**:
- ✅ Chart shows exactly 4 data points (100, 250, 350, 380)
- ✅ NO data points at mileage 0, 100 (anchors), or 250 (anchor)
- ✅ Chart tooltip on hover shows only user readings

4. Navigate to Weekly Chart page
5. Inspect weekly aggregation

**Expected Results**:
- ✅ Week containing 2025-10-08: Shows 100 km reading
- ✅ Week containing 2025-10-10: Shows 250 km reading
- ✅ Week containing 2025-10-12: Shows 350 and 380 km readings
- ✅ NO anchor readings visible in weekly bars
- ✅ Date bucketing is correct (readings on right dates)

---

### Scenario 7: Trip Entry Creates Anchors for Both Start and End

**Objective**: Verify trip creation triggers anchor logic for both generated readings

**Steps**:
1. Clear all readings (reset to empty state)
2. Add trip:
   - Distance: 50 km
   - Start: 2025-10-08 at 10:00
   - End: 2025-10-08 at 11:30
   - Note: "Test trip"
3. Submit trip form

**Expected Results**:
- ✅ Success message displayed
- ✅ Reading list shows 2 visible readings:
  - Start: 2025-10-08 10:00, mileage 0
  - End: 2025-10-08 11:30, mileage 50, note "TRIP: Test trip"
- ✅ Inspect Network → Response contains 3 readings:
  - **Anchor (00:01, mileage: 0)** ← Created for start reading only
  - Start reading (10:00, mileage: 0)
  - End reading (11:30, mileage: 50)
- ✅ Only ONE anchor created (date already had reading after start added)

---

### Scenario 8: Multi-Day Trip Creates Anchors for Each Date

**Objective**: Verify trip spanning multiple dates creates anchor per date

**Steps**:
1. Starting from Scenario 7 state (readings on 2025-10-08)
2. Add multi-day trip:
   - Distance: 100 km
   - Start: 2025-10-10 at 23:00
   - End: 2025-10-11 at 01:00
   - Note: "Overnight trip"
3. Submit trip form

**Expected Results**:
- ✅ Reading list shows 4 visible readings total
- ✅ Inspect Network → Response contains 7 readings:
  - 2025-10-08: anchor + 2 trip readings (start/end)
  - **2025-10-10: anchor (mileage: 50)** + start reading (23:00, mileage: 50)
  - **2025-10-11: anchor (mileage: 50)** + end reading (01:00, mileage: 150)
- ✅ Two new anchors created (one per date)
- ✅ 2025-10-10 anchor uses previous reading's mileage (50)
- ✅ 2025-10-11 anchor uses previous reading's mileage (50, from 2025-10-10 start)

---

### Scenario 9: Swedish Locale Formatting (Constitution Check)

**Objective**: Verify no formatting regressions

**Steps**:
1. Add reading with high mileage:
   - Date: 2025-10-15
   - Mileage: 12345 km
2. Verify number formatting in UI

**Expected Results**:
- ✅ Mileage displays as "12 345" (space separator, Swedish locale)
- ✅ Date displays as "2025-10-15" (YYYY-MM-DD)
- ✅ NO commas (12,345) or US date formats (10/15/2025)

---

### Scenario 10: Mobile Responsiveness (Constitution Check)

**Objective**: Verify mobile-first design compliance

**Steps**:
1. Open browser dev tools
2. Switch to mobile viewport (e.g., iPhone 12, 390x844)
3. Navigate through all pages (dashboard, history, weekly)
4. Test filter toggle button on mobile

**Expected Results**:
- ✅ Filter toggle button is touch-friendly (min 44x44 px)
- ✅ Reading list scrolls correctly on mobile
- ✅ Charts render correctly in narrow viewport
- ✅ No horizontal scrolling required
- ✅ Hidden reading indicators visible and readable on mobile

---

### Scenario 11: Authentication Required (Constitution Check)

**Objective**: Verify write operations require auth

**Steps**:
1. Log out of application (clear auth token)
2. Attempt to add reading via API:
   ```bash
   curl -X POST http://localhost:3000/api/readings \
     -H "Content-Type: application/json" \
     -d '{"date":"2025-10-20","mileage":500}'
   ```

**Expected Results**:
- ✅ Response: 401 Unauthorized
- ✅ No reading or anchor created
- ✅ Database unchanged

3. Log in
4. Retry same request with auth token

**Expected Results**:
- ✅ Response: 201 Created
- ✅ Reading and anchor created successfully

---

## Validation Checklist

After completing all scenarios, verify:

### Data Integrity
- [ ] All anchor readings have `time = "00:01"`
- [ ] All anchor readings have `hidden = true`
- [ ] All anchor readings have `isSystemGenerated = true`
- [ ] All anchor readings have empty or undefined `note`
- [ ] No duplicate anchors on same date
- [ ] Anchor mileage values match previous reading (or 0)

### UI Behavior
- [ ] Filter toggle shows/hides anchors correctly
- [ ] Anchor readings have visual indicators when shown
- [ ] Charts exclude hidden readings from visualization
- [ ] Reading list sorts correctly (anchors first on date)
- [ ] Mobile UI is touch-friendly and responsive

### Constitution Compliance
- [ ] Swedish locale formatting maintained (spaces, YYYY-MM-DD)
- [ ] Authentication required for write operations
- [ ] No new environment variables needed
- [ ] Manual deployment process unchanged

### Performance
- [ ] Dashboard loads within 2 seconds on 3G
- [ ] Chart rendering completes within 1 second
- [ ] No perceptible lag when adding readings
- [ ] Filter toggle responds immediately

---

## Troubleshooting

### Anchor Not Created
- Check if date already has readings (anchors only for first reading on date)
- Verify anchor creation logic in POST /api/readings
- Check Redis data directly to confirm anchor saved

### Anchor Not Hidden
- Verify `hidden = true` in database
- Check filter state (toggle might be showing hidden readings)
- Verify chart filtering logic excludes `hidden = true`

### Retroactive Update Failed
- Check next anchor lookup logic (finds anchor after new reading)
- Verify update saves to Redis correctly
- Confirm anchor's `isSystemGenerated = true` (only system anchors updated)

### Filter Toggle Not Working
- Verify React state management (useState)
- Check filter() function on readings array
- Confirm toggle button click handler wired correctly

---

## Cleanup

After testing:
1. Clear test readings (or keep for demo purposes)
2. Verify production environment ready
3. Deploy to Vercel using `vercel --prod`
4. Repeat validation on production (spot-check key scenarios)
