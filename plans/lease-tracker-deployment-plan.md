# Lease Mileage Tracker - Web App Deployment Plan

## Project Overview
Convert the React-based lease mileage tracker into a full-stack web application deployable on Vercel with persistent data storage and multi-user support.

## Tech Stack
- **Frontend**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Database**: Vercel Postgres or Supabase (for persistent storage)
- **Authentication**: Next-Auth.js (optional for multi-user support)
- **Deployment**: Vercel
- **Language**: TypeScript for type safety

## Project Structure
```
lease-mileage-tracker/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   ├── api/
│   │   ├── readings/
│   │   │   └── route.ts
│   │   └── lease-info/
│   │       └── route.ts
│   └── components/
│       ├── MileageTracker.tsx
│       ├── Dashboard.tsx
│       ├── MonthlyBudget.tsx
│       ├── ReadingForm.tsx
│       └── ReadingHistory.tsx
├── lib/
│   ├── db.ts
│   ├── types.ts
│   └── utils.ts
├── public/
│   └── favicon.ico
├── package.json
├── tailwind.config.js
├── next.config.js
└── README.md
```

## Core Features to Implement

### 1. Data Models
```typescript
// lib/types.ts
export interface LeaseInfo {
  id: string;
  startDate: string;
  endDate: string;
  annualLimit: number;
  totalLimit: number;
  userId?: string; // for multi-user support
}

export interface MileageReading {
  id: string;
  date: string;
  mileage: number;
  note: string;
  leaseId: string;
  createdAt: string;
}

export interface CalculatedStats {
  currentMileage: number;
  budgetedMileage: number;
  remainingBudget: number;
  currentRate: number;
  projectedTotal: number;
  isOnTrack: boolean;
  variance: number;
  percentageUsed: number;
  daysElapsed: number;
  daysRemaining: number;
}
```

### 2. Database Schema (SQL)
```sql
-- Create tables for lease tracking
CREATE TABLE lease_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  annual_limit INTEGER NOT NULL DEFAULT 15000,
  total_limit INTEGER NOT NULL,
  user_id VARCHAR(255), -- for future multi-user support
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE mileage_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES lease_info(id) ON DELETE CASCADE,
  reading_date DATE NOT NULL,
  mileage INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_mileage_readings_lease_id ON mileage_readings(lease_id);
CREATE INDEX idx_mileage_readings_date ON mileage_readings(reading_date);
```

### 3. API Routes

#### GET/POST /api/readings
- Fetch all mileage readings for a lease
- Add new mileage readings
- Validate data integrity

#### GET/PUT /api/lease-info
- Fetch lease configuration
- Update lease parameters

### 4. Component Architecture

#### Main Components:
1. **MileageTracker** - Main container component
2. **Dashboard** - Stats overview and current status
3. **ReadingForm** - Form to add new mileage readings
4. **ReadingHistory** - List of all readings with edit/delete
5. **MonthlyBudget** - Monthly breakdown visualization
6. **ProgressChart** - Visual progress indicator

### 5. Key Calculations (Business Logic)
```typescript
// lib/utils.ts
export function calculateLeaseStats(
  readings: MileageReading[],
  leaseInfo: LeaseInfo
): CalculatedStats {
  // Implementation of all the calculation logic from the React component
  // - Daily budget calculation
  // - Current usage rate
  // - Projections
  // - Variance from budget
  // - Remaining budget calculations
}

export function generateMonthlyBudgets(
  readings: MileageReading[],
  leaseInfo: LeaseInfo
): MonthlyBudgetData[] {
  // Generate month-by-month budget breakdown
}
```

## Implementation Steps

### Phase 1: Project Setup
1. **Initialize Next.js project**
   ```bash
   npx create-next-app@latest lease-mileage-tracker --typescript --tailwind --app
   cd lease-mileage-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install @vercel/postgres lucide-react date-fns
   npm install -D @types/node
   ```

3. **Configure Tailwind CSS** with custom colors matching the current design

4. **Set up environment variables**
   ```env
   POSTGRES_URL=your_postgres_connection_string
   POSTGRES_PRISMA_URL=your_postgres_prisma_url
   POSTGRES_URL_NON_POOLING=your_postgres_non_pooling_url
   ```

### Phase 2: Database & API Layer
1. **Set up Vercel Postgres database**
2. **Create database connection utility** (`lib/db.ts`)
3. **Implement API routes** for readings and lease info
4. **Add data validation** and error handling
5. **Create database initialization script**

### Phase 3: Frontend Components
1. **Convert existing React component** to Next.js components
2. **Implement data fetching** using React Server Components
3. **Add client-side state management** for real-time updates
4. **Create responsive design** for mobile devices
5. **Add loading states** and error boundaries

### Phase 4: Enhanced Features
1. **Data persistence** - readings saved to database
2. **Edit/delete functionality** for readings
3. **Export functionality** (CSV download)
4. **Backup/restore** lease data
5. **Multiple lease support** (future enhancement)

### Phase 5: Deployment & Testing
1. **Configure Vercel deployment**
2. **Set up continuous deployment** from GitHub
3. **Add error monitoring** (Vercel Analytics)
4. **Performance optimization**
5. **Mobile testing** and PWA features

## Database Seeding
Create initial data with your current lease information:
```typescript
// Initial seed data
const initialLease = {
  startDate: '2025-07-09',
  endDate: '2028-07-09',
  annualLimit: 15000,
  totalLimit: 45000
};

const initialReadings = [
  {
    date: '2025-07-09',
    mileage: 0,
    note: 'Lease start'
  },
  {
    date: '2025-09-23',
    mileage: 4593,
    note: 'Current reading'
  }
];
```

## Environment Configuration

### Development
- Local PostgreSQL or Vercel Postgres dev database
- Hot reloading for rapid development
- TypeScript strict mode

### Production (Vercel)
- Vercel Postgres production database
- Automatic deployments from main branch
- Environment variables securely stored

## Security Considerations
1. **Input validation** - Sanitize all user inputs
2. **Rate limiting** - Prevent API abuse
3. **Data validation** - Ensure mileage readings are logical
4. **Error handling** - Don't expose sensitive information
5. **HTTPS only** - Secure data transmission

## Performance Optimizations
1. **Database indexing** - Fast queries on date ranges
2. **Caching strategy** - Cache calculated statistics
3. **Image optimization** - Use Next.js Image component
4. **Bundle optimization** - Tree shaking and code splitting
5. **Server-side rendering** - Fast initial page loads

## Future Enhancements (v2.0)
1. **Multi-user support** with authentication
2. **Multiple vehicle/lease management**
3. **Photo uploads** for service records
4. **Maintenance tracking** and reminders
5. **Integration with car APIs** for automatic mileage
6. **Mobile app** (React Native)
7. **Expense tracking** for fuel and maintenance

## Testing Strategy
1. **Unit tests** for calculation functions
2. **Integration tests** for API routes
3. **E2E tests** for critical user flows
4. **Database tests** for data integrity

## Deployment Checklist
- [ ] Database tables created and seeded
- [ ] Environment variables configured
- [ ] API routes tested
- [ ] Frontend components working
- [ ] Mobile responsive design verified
- [ ] Error handling implemented
- [ ] Performance optimized
- [ ] Security measures in place
- [ ] Backup strategy defined

## Success Metrics
- Fast load times (<2 seconds)
- Accurate calculations (match current React component)
- Mobile-friendly interface
- Data persistence working correctly
- Zero-downtime deployment capability

This plan provides a comprehensive roadmap for converting your mileage tracker into a production-ready web application. The modular approach allows for incremental development and testing at each phase.