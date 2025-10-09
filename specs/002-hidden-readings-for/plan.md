
# Implementation Plan: Hidden Readings for Better Graphs

**Branch**: `002-hidden-readings-for` | **Date**: 2025-10-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-hidden-readings-for/spec.md`

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
This feature implements automatic anchor reading creation to improve weekly graph visualization accuracy. When a user adds a mileage reading on a date with no existing readings, the system automatically creates a hidden "anchor" reading at 00:01 (1 minute after midnight) using the chronologically most recent reading's kilometer value (or zero if no previous reading exists). These anchor readings ensure new readings appear in the correct date buckets on weekly charts without distorting calculations. Anchor readings are marked as hidden and excluded from graphs, lists, and budget calculations by default, with an optional filter to show them when needed.

## Technical Context
**Language/Version**: TypeScript 5.9+ with Next.js 15.5+
**Primary Dependencies**: Next.js App Router, React 19, Upstash Redis, Chart.js, react-chartjs-2, Tailwind CSS
**Storage**: Upstash Redis (KV store) with JSON serialization
**Testing**: Manual functional testing (per constitution - no automated test suite required)
**Target Platform**: Vercel serverless deployment, mobile-first responsive web
**Project Type**: Web application (Next.js full-stack with API routes)
**Performance Goals**: <2s dashboard load on 3G, <1s chart rendering for 100+ readings
**Constraints**: Swedish locale (space separators, YYYY-MM-DD dates), mobile-optimized UI, auth on write operations
**Scale/Scope**: Single/small team use, ~100-500 readings over lease term, 3 main pages

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Swedish Locale Compliance**:
- [x] All number displays use space as thousands separator (no new number displays added, existing formatters will be reused)
- [x] All dates use YYYY-MM-DD format (anchor readings use existing date handling, timestamp at 00:01)
- [x] No hardcoded comma separators or US date formats (no new formatting code)

**Authentication Security**:
- [x] Write operations (POST/PUT/DELETE) require auth check (modifications to existing authenticated endpoints)
- [x] Read operations (GET) remain public (GET /api/readings remains unchanged)
- [x] Environment variables documented if new auth needed (no new auth env vars required)

**Mobile-First Design**:
- [x] New UI components are responsive (filter toggle will use existing responsive patterns)
- [x] Touch targets meet mobile standards (44px min) (filter toggle will follow existing button standards)
- [x] Charts/visualizations tested on mobile viewports (only filtering logic changes, chart rendering unchanged)

**Data Integrity**:
- [x] Timestamp tracking included for new data entities (anchor readings include createdAt timestamp from existing pattern)
- [x] No cascading deletes without explicit user confirmation (no delete operations modified)
- [x] Data validation before persistence (anchor creation validates previous reading lookup, date checks)

**Deployment Simplicity**:
- [x] No automated dev server startup in scripts (no scripts modified)
- [x] Manual Vercel deployment process maintained (deployment process unchanged)
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
app/
├── api/
│   ├── readings/
│   │   └── route.ts           # POST/GET/PUT/DELETE readings (will be modified)
│   ├── trips/
│   │   └── route.ts           # POST trips (will be modified)
│   ├── lease/
│   │   └── route.ts           # Lease config
│   └── auth/
│       └── login/
│           └── route.ts       # Auth endpoint
├── components/
│   ├── Dashboard.tsx          # Will be modified for filter toggle
│   ├── MileageChart.tsx       # Will be modified to exclude hidden readings
│   ├── WeeklyChart.tsx        # Will be modified to exclude hidden readings
│   ├── ReadingHistory.tsx     # Will be modified for filter UI and visual indicator
│   ├── ReadingForm.tsx        # Potentially modified for anchor creation
│   └── [other existing components]
├── contexts/
│   └── AuthContext.tsx        # Existing auth context
├── page.tsx                   # Main dashboard
├── layout.tsx                 # Root layout
├── history/
│   └── page.tsx              # Reading history page
└── weekly/
    └── page.tsx              # Weekly chart page

lib/
├── types.ts                   # MileageReading interface (will be extended)
├── utils.ts                   # Utility functions (will add anchor logic)
├── redis.ts                   # Redis client
├── auth.ts                    # Auth helpers
└── formatters.ts              # Swedish locale formatters
```

**Structure Decision**: Next.js App Router architecture with integrated API routes and client components. All backend logic resides in `app/api/` route handlers, frontend components in `app/components/`, shared utilities and types in `lib/`. This follows the existing Next.js 14+ App Router pattern already established in the codebase.

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

**Estimated Output**: 14 numbered, ordered tasks organized in 4 layers (foundation, API, presentation, validation)

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
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none - all constitution checks passed)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
