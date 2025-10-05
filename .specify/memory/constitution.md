<!--
Sync Impact Report:
Version: 0.0.0 → 1.0.0
Rationale: Initial constitution creation for the Lease Mileage Tracker project

Added Principles:
- I. Swedish Locale Compliance
- II. Authentication Security
- III. Mobile-First Design
- IV. Data Integrity
- V. Deployment Simplicity

Added Sections:
- Technology Constraints
- Development Workflow

Templates Status:
- ✅ .specify/templates/plan-template.md - updated with specific constitution checks
- ✅ .specify/templates/spec-template.md - reviewed, no updates needed
- ✅ .specify/templates/tasks-template.md - reviewed, compatible with principles
- ⚠ CLAUDE.md - user-maintained file, principles already reflected

Follow-up TODOs:
- None
-->

# Lease Tracker Constitution

## Core Principles

### I. Swedish Locale Compliance
Every numerical and date display MUST use Swedish formatting conventions. Number formatting MUST use space as thousands separator (e.g., 4 790, not 4,790). Date formatting MUST use ISO format YYYY-MM-DD. Currency or distance values MUST maintain consistent locale presentation.

**Rationale**: The application serves Swedish users tracking vehicle leases with Swedish conventions. Inconsistent formatting creates confusion and reduces trust in displayed data.

### II. Authentication Security
Write operations (create, update, delete) MUST require authentication via static password and token-based API access. Read operations MUST remain public. Authentication state MUST persist in localStorage for user convenience. Environment variables `ADMIN_PASSWORD` and `AUTH_TOKEN` MUST be configured before deployment.

**Rationale**: Data integrity requires protecting modification endpoints while maintaining accessibility for viewing lease status. Static auth is sufficient for single-user or small team scenarios without complex user management overhead.

### III. Mobile-First Design
User interface components MUST be responsive and mobile-optimized. Touch targets MUST be appropriately sized. Charts and visualizations MUST be readable on mobile screens. PWA features (manifest, service worker, app icons) MUST be maintained for installable mobile experience.

**Rationale**: Lease mileage tracking is primarily a mobile use case—users record readings while traveling or at fuel stations. Desktop-first design would fail the primary user workflow.

### IV. Data Integrity
All mileage readings MUST include timestamp tracking. Deletion operations MUST be explicit (no cascading deletes without user action). Redis data structures MUST maintain referential integrity between lease config and readings. API operations MUST validate data before persistence.

**Rationale**: Lease tracking depends on accurate historical records. Data loss or corruption could result in incorrect budget calculations, potentially causing financial penalties from lease violations.

### V. Deployment Simplicity
Deployment MUST use manual Vercel CLI execution (`vercel --prod`). Development servers MUST NOT be started by automated processes—user controls all server lifecycle. Environment variables MUST be documented and configured in Vercel dashboard.

**Rationale**: Manual deployment provides control and visibility for a single-maintainer project. Automated CI/CD adds unnecessary complexity for a personal/small-team application with infrequent changes.

## Technology Constraints

**Framework**: Next.js 14+ with App Router architecture
**Language**: TypeScript with strict type checking
**Database**: Upstash Redis (KV storage with JSON)
**Styling**: Tailwind CSS with dark mode support
**Deployment**: Vercel platform only
**Charts**: Chart.js with React wrapper (react-chartjs-2)

**Prohibited**:
- Alternative databases (PostgreSQL, MongoDB, etc.) without constitution amendment
- Development server automation (npm run dev in hooks/scripts)
- Non-Swedish locale defaults
- Public write endpoints without authentication

## Development Workflow

**Testing Strategy**: Manual validation via visual inspection and functional testing. Automated test suite is not required given the application's limited scope and single-maintainer model.

**Code Review**: Direct commits to main branch are acceptable. Feature branches are optional for experimental work.

**Documentation**: All user-facing instructions in README.md. Development notes in CLAUDE.md for AI assistant context. API endpoints documented in README.

**Performance Standards**: Dashboard must load within 2 seconds on 3G mobile connection. Chart rendering must complete within 1 second for 100+ data points.

**Breaking Changes**: Changes requiring schema migration in Redis MUST include migration script or manual update procedure in commit message.

## Governance

This constitution supersedes informal development practices. All features and changes MUST comply with the five core principles. Violations require explicit justification documented in the implementation plan's Complexity Tracking section.

**Amendment Process**: Constitution changes require updating this file with incremented version, documenting rationale, and ensuring dependent templates (.specify/templates/*) remain aligned.

**Compliance Review**: Before deploying to production, verify Swedish locale in all new UI components, authentication on new write endpoints, and mobile responsiveness of new features.

**Version**: 1.0.0 | **Ratified**: 2025-10-05 | **Last Amended**: 2025-10-05
