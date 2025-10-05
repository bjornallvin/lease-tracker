
# Implementation Plan: Trip Tracking with Automatic Meter Readings

**Branch**: `001-i-want-to` | **Date**: 2025-10-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/Users/bjorn.allvin/code/lease-tracker/specs/001-i-want-to/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Users can record vehicle trips by entering distance traveled. Each trip creates TWO meter readings: a start reading showing the odometer before the trip, and an end reading showing the odometer after adding the trip distance. Users can optionally specify start and end times (default: end=now, start=now-1min). This two-reading approach ensures the weekly usage chart accurately displays kilometers on the correct dates, particularly for backdated or multi-day trips. Trip-generated readings are distinguished by empty notes on start readings and "TRIP: {note}" prefix on end readings.

## Technical Context
**Language/Version**: TypeScript (strict mode), Next.js 15, React 19
**Primary Dependencies**: Next.js App Router, React, Tailwind CSS, date-fns, Upstash Redis SDK, Chart.js, react-chartjs-2, lucide-react (icons)
**Storage**: Upstash Redis (KV storage with JSON serialization)
**Testing**: Manual validation via quickstart scenarios (constitution mandates manual testing, no automated test suite)
**Target Platform**: Web (Vercel deployment), PWA-enabled for mobile installation
**Project Type**: Web application (Next.js full-stack)
**Performance Goals**: Dashboard load <2s on 3G mobile, chart render <1s for 100+ data points (per constitution)
**Constraints**: Swedish locale formatting mandatory, authentication on write operations, mobile-first responsive design, manual deployment only
**Scale/Scope**: Single-user or small team, <1000 readings per year expected, 3 main pages (dashboard, weekly, history)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Swedish Locale Compliance**:
- [x] All number displays use space as thousands separator (FR-015: trip distances use Swedish formatting)
- [x] All dates use YYYY-MM-DD format (existing requirement maintained)
- [x] No hardcoded comma separators or US date formats (Swedish locale in formatters)

**Authentication Security**:
- [x] Write operations (POST/PUT/DELETE) require auth check (FR-011: trip creation requires authentication)
- [x] Read operations (GET) remain public (no changes to read endpoints)
- [x] Environment variables documented if new auth needed (using existing ADMIN_PASSWORD and AUTH_TOKEN)

**Mobile-First Design**:
- [x] New UI components are responsive (TripEntryForm must be mobile-responsive per spec)
- [x] Touch targets meet mobile standards (44px min) (form inputs specified as mobile-friendly)
- [x] Charts/visualizations tested on mobile viewports (weekly chart must display trip data correctly)

**Data Integrity**:
- [x] Timestamp tracking included for new data entities (FR-002: both start and end readings have timestamps)
- [x] No cascading deletes without explicit user confirmation (FR-013: start/end readings deletable independently)
- [x] Data validation before persistence (FR-006, FR-007, FR-009: time validation, distance validation)

**Deployment Simplicity**:
- [x] No automated dev server startup in scripts (no changes to deployment workflow)
- [x] Manual Vercel deployment process maintained (no CI/CD changes)
- [x] New environment variables documented (no new env vars required)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
app/                          # Next.js App Router
├── api/
│   ├── trips/
│   │   └── route.ts         # NEW: POST /api/trips endpoint
│   ├── readings/
│   │   └── route.ts         # EXISTING: readings CRUD
│   └── lease/
│       └── route.ts         # EXISTING: lease config
├── components/
│   ├── TripEntryForm.tsx    # NEW: trip entry UI
│   ├── ReadingForm.tsx      # EXISTING: manual reading form
│   ├── MileageTracker.tsx   # MODIFIED: integrate trip form
│   ├── ReadingHistory.tsx   # MODIFIED: show trip badges
│   ├── WeeklyChart.tsx      # VERIFIED: timestamp-based display
│   ├── Modal.tsx            # EXISTING: reusable modal
│   └── Navigation.tsx       # EXISTING: navigation bar
├── contexts/
│   └── AuthContext.tsx      # EXISTING: auth state
├── page.tsx                 # EXISTING: dashboard page
├── weekly/
│   └── page.tsx            # EXISTING: weekly view page
└── history/
    └── page.tsx            # EXISTING: history page

lib/                          # Utilities & types
├── types.ts                 # MODIFIED: add TripInput type, update Reading
├── utils.ts                 # EXISTING: calculations
├── formatters.ts            # NEW: Swedish number formatting
├── redis.ts                 # EXISTING: Redis client
└── auth.ts                  # EXISTING: auth helpers

.specify/                     # Feature specifications
└── [See Documentation structure above]
```

**Structure Decision**: Next.js App Router architecture (full-stack web). API routes colocated in `app/api/`, React components in `app/components/`, shared utilities in `lib/`. No separate frontend/backend split—Next.js handles both. This matches the existing project structure and constitutional requirement for deployment simplicity.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - Updated research.md with two-reading model
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/POST-trips.md, quickstart.md exist (need updates for two-reading model)
- [x] Phase 2: Task planning approach described (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (all 5 principles compliant)
- [x] Post-Design Constitution Check: PASS (no violations introduced)
- [x] All NEEDS CLARIFICATION resolved (10 clarification questions answered)
- [x] Complexity deviations documented (None - no constitutional violations)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
