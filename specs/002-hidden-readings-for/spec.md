# Feature Specification: Hidden Readings for Better Graphs

**Feature Branch**: `002-hidden-readings-for`
**Created**: 2025-10-07
**Status**: Draft
**Input**: User description: "Hidden readings for better graphs"

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## Clarifications

### Session 2025-10-07
- Q: When the system automatically creates a hidden anchor reading at 00:01, what kilometer value should it use? → A: Previous day's last reading value (carry forward)
- Q: When creating an automatic anchor reading at 00:01, what should happen if there is no previous day's reading (e.g., first reading ever, or gap in data)? → A: Use zero as the kilometer value
- Q: Should hidden readings be excluded from weekly over-budget calculations, or only from graph visualization? → A: Exclude from both graph AND budget calculations
- Q: What should happen when all visible readings are hidden and the graph has no data to display? → A: Show empty state message
- Q: Should the reading list have a filter option to show/hide hidden readings from view? → A: Toggle filter to show/hide hidden readings
- **Scope Priority Clarification**: The PRIMARY feature is automatic anchor reading creation when adding readings. The SECONDARY feature is that anchor readings are hidden (not shown in lists or graphs). Manual hide/unhide functionality is out of scope for this feature.
- **Previous Reading Definition**: "Previous reading" means the chronologically most recent reading before the target date, which might not be from yesterday (could be from an older date if there are gaps in data).
- **Retroactive Reading Addition**: When a reading is added, only the immediately next anchor (if one exists) needs to be checked and potentially updated. Only the closest earlier reading affects an anchor's value.

---

## User Scenarios & Testing

### Primary User Story
As a user tracking lease kilometers, when I add a reading on a date that has no other readings, the system should automatically create a hidden anchor reading at 00:01 (1 minute after midnight) using the previous day's last reading value. This ensures my new reading appears in the correct date bucket on weekly graphs, making the visualization more accurate.

The anchor readings are automatically hidden and do not appear in graphs or reading lists (unless explicitly shown via a filter), ensuring they serve their purpose as date anchors without cluttering the interface.

### Acceptance Scenarios

#### Primary Feature: Automatic Anchor Reading Creation
1. **Given** I add a reading on a date with no existing readings, **When** the system processes the new reading, **Then** it automatically creates a hidden anchor reading at 00:01 on that date using the chronologically most recent reading before that date
2. **Given** I add a reading on 2025-10-10 and the most recent prior reading is from 2025-10-05, **When** the system creates the anchor, **Then** it uses the kilometer value from the 2025-10-05 reading (not necessarily yesterday)
3. **Given** I add my very first reading (or a reading after a data gap with no previous reading), **When** the system creates the automatic anchor reading, **Then** the anchor reading uses zero as its kilometer value
4. **Given** an anchor reading has been automatically created, **When** I view the mileage chart, **Then** the anchor reading does not appear as a data point on the graph
5. **Given** an anchor reading has been automatically created, **When** I view the reading list (with default filter), **Then** the anchor reading does not appear in the list
6. **Given** I have anchor readings in the system, **When** I view weekly graphs, **Then** my actual readings appear in the correct date buckets with accurate visualization
7. **Given** an anchor exists on 2025-10-10 using a value from 2025-10-05, **When** I add a new reading on 2025-10-08, **Then** the system checks for the immediately next anchor (2025-10-10) and updates it to use the value from 2025-10-08 instead

#### Secondary Feature: Hidden Reading Visibility Control
8. **Given** I have hidden anchor readings in the system, **When** I toggle the filter to show hidden readings in the list, **Then** all anchor readings appear in the list with a visual indicator marking them as hidden
9. **Given** the filter is set to show hidden readings, **When** I toggle the filter to hide them, **Then** anchor readings disappear from the reading list view

### Edge Cases
- Automatic anchor readings carry forward the chronologically previous reading's kilometer value (not necessarily from yesterday), so they don't add any distance - they only anchor the date for visualization purposes
- If a date already has readings (including an anchor), no new anchor is created when adding another reading to that date
- When a reading is added, check if there is an anchor immediately after it chronologically. If so, that anchor may need its kilometer value updated to reference the newly added reading
- Only the immediately next anchor is affected by a new reading - subsequent anchors further in the future are not impacted
- Anchor readings are system-generated and should be distinguishable from user-entered readings

## Requirements

### Functional Requirements

#### Primary Feature: Automatic Anchor Reading Creation
- **FR-001**: System MUST automatically create a hidden anchor reading when a user adds a reading on a date with no existing readings
- **FR-002**: System MUST check if the target date already has any readings before creating an anchor (do not create duplicate anchors)
- **FR-003**: Automatic anchor readings MUST be timestamped at 00:01 (1 minute after midnight) on the target date
- **FR-004**: Automatic anchor readings MUST use the chronologically most recent reading before the target date as their kilometer value (not necessarily from yesterday), or zero if no previous reading exists
- **FR-005**: Automatic anchor readings MUST be marked as hidden by default
- **FR-006**: System MUST persist anchor readings in the database with a flag indicating they are system-generated
- **FR-007**: When a reading is added, system MUST check if there is an anchor immediately after it chronologically and update that anchor's kilometer value to reference the newly added reading if appropriate

#### Secondary Feature: Hidden Reading Handling
- **FR-008**: System MUST exclude hidden readings from all graph visualizations
- **FR-009**: System MUST exclude hidden readings from all chart metrics (daily average, trend lines, over-budget indicators) and budget calculations
- **FR-010**: System MUST exclude hidden readings from the default reading list view
- **FR-011**: System MUST provide a toggle filter in the reading list to show or hide hidden readings
- **FR-012**: When filter is enabled to show hidden readings, system MUST display a clear visual indicator on hidden readings in the reading list
- **FR-013**: System MUST persist the hidden status of readings across sessions

### Key Entities
- **Reading**: Existing entity that tracks kilometer readings. Will be extended with:
  - **hidden** (boolean): Indicates whether the reading should be excluded from graphs and lists
  - **isSystemGenerated** (boolean): Indicates whether the reading was automatically created as an anchor (vs. user-entered)

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed (blocked by NEEDS CLARIFICATION markers)

---
