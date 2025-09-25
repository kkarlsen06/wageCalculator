# Next.js Frontend Migration Plan

## Executive Summary
This document outlines the step-by-step plan to rebuild the wage calculator frontend from the ground up using Next.js, React, and the existing CSS architecture. The goal is to create a stable, maintainable application by methodically migrating functionality from the existing Vanilla JS application.

## Status Snapshot
- **Phase 1 – Foundation:** ✅ Complete – env validation, Supabase clients, global stores, and API layer scaffolding landed.
- **Phase 2 – Authentication Flow:** ⏳ Not started – blocked by the pre-phase checklist below.
- **Phase 3 – Core Pages:** ⏳ Not started.
- **Phases 4–11:** ⏳ Not started.

## Current State Assessment

### ✅ Completed
- Next.js 15.5.4 project setup with React 19
- CSS Modules architecture (~19,500 lines successfully migrated)
- 30+ reusable React components with TypeScript
- Design system with theme support (dark/light modes)
- Material Design-inspired component library

### ❌ Needs Implementation
- Core application pages and routing
- Supabase authentication integration
- API routes for backend communication
- State management solution
- Business logic migration (wage calculations)
- PWA functionality

## Migration Strategy: Build from Ground Up

### Phase 1: Foundation (Week 1)
**Goal:** Establish core infrastructure and authentication

### Pre-Phase 2 Checklist
- [ ] Replace the placeholder Supabase anon key in `.env.local` with a real value before running against Supabase.
- [ ] Resolve the `react-hooks/rules-of-hooks` lint error in `src/components/material-layer/index.tsx` so `npm run lint` passes.
- [ ] Decide on handling the remaining hook dependency warnings (fix or document) to keep lint output actionable.

#### 1.1 Environment Configuration
- [x] Create `.env.local` with Next.js environment variables
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://id.kkarlsen.dev
  NEXT_PUBLIC_SUPABASE_ANON_KEY=[obtain from Supabase]
  NEXT_PUBLIC_API_URL=http://localhost:3001
  ```
- [x] Configure environment variable validation
- [x] Set up development vs production configs

#### 1.2 Supabase Integration
- [x] Install Supabase client libraries
  ```bash
  npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
  ```
- [x] Create Supabase client configuration (`/lib/supabase`)
- [x] Set up authentication helpers
- [x] Create auth context provider

#### 1.3 State Management Setup
- [x] Install Zustand or React Context for state management
- [x] Create global stores:
  - Auth store (user session, profile)
  - App store (theme, settings)
  - Data store (shifts, employees, calculations)
- [x] Set up persistence for offline support

#### 1.4 API Layer Foundation
- [x] Create API utilities (`/lib/api`)
- [x] Set up fetch wrappers with auth headers
- [x] Create error handling utilities
- [x] Implement request/response interceptors

### Phase 2: Authentication Flow (Week 1-2)
**Goal:** Secure user authentication and session management

#### 2.1 Login Page
- [ ] Create `/app/login/page.tsx`
- [ ] Implement login form with existing Form components
- [ ] Add Supabase email/password authentication
- [ ] Handle login errors and validation
- [ ] Add "Remember Me" functionality

#### 2.2 Authentication Middleware
- [ ] Create Next.js middleware for route protection
- [ ] Implement session validation
- [ ] Add automatic token refresh
- [ ] Handle unauthorized access redirects

#### 2.3 User Profile Management
- [ ] Create user context with profile data
- [ ] Implement logout functionality
- [ ] Add profile data fetching
- [ ] Create profile update endpoints

### Phase 3: Core Pages Structure (Week 2)
**Goal:** Build main application pages with navigation

#### 3.1 Layout Components
- [ ] Create main app layout (`/app/(authenticated)/layout.tsx`)
- [ ] Implement responsive navigation using existing Navigation component
- [ ] Add header with user profile dropdown
- [ ] Create footer component
- [ ] Set up loading states

#### 3.2 Dashboard Page
- [ ] Create `/app/(authenticated)/dashboard/page.tsx`
- [ ] Port dashboard layout from existing app
- [ ] Integrate existing Dashboard components:
  - Progress cards
  - Shift summary cards
  - Next payroll card
- [ ] Add placeholder data for testing

#### 3.3 Navigation & Routing
- [ ] Implement tab-based navigation
- [ ] Set up route prefetching
- [ ] Add breadcrumb navigation
- [ ] Create 404 and error pages

### Phase 4: Shifts Management (Week 2-3)
**Goal:** Core functionality for managing work shifts

#### 4.1 Shifts List Page
- [ ] Create `/app/(authenticated)/shifts/page.tsx`
- [ ] Build shifts table/list component
- [ ] Implement sorting and filtering
- [ ] Add pagination for large datasets
- [ ] Create empty state UI

#### 4.2 Add/Edit Shift
- [ ] Create `/app/(authenticated)/shifts/[id]/page.tsx`
- [ ] Build shift form with validation
- [ ] Implement date/time pickers
- [ ] Add break time calculation
- [ ] Create draft/save functionality

#### 4.3 Shift API Integration
- [ ] Create shift API routes:
  - `GET /api/shifts` - List shifts
  - `POST /api/shifts` - Create shift
  - `PUT /api/shifts/[id]` - Update shift
  - `DELETE /api/shifts/[id]` - Delete shift
- [ ] Implement data validation
- [ ] Add error handling

### Phase 5: Wage Calculation Engine (Week 3)
**Goal:** Port core business logic for wage calculations

#### 5.1 Calculation Logic Migration
- [ ] Port tariff system from existing app
- [ ] Migrate wage calculation algorithms
- [ ] Implement overtime calculations
- [ ] Add holiday/weekend rates
- [ ] Create tax calculation logic

#### 5.2 Calculation API
- [ ] Create `/api/calculate` endpoint
- [ ] Implement batch calculations
- [ ] Add caching for performance
- [ ] Create calculation history

#### 5.3 Real-time Updates
- [ ] Implement live calculation preview
- [ ] Add debounced updates
- [ ] Create calculation breakdown UI
- [ ] Show earnings projections

### Phase 6: Employee Management (Week 3-4)
**Goal:** Multi-employee support and management

#### 6.1 Employee Pages
- [ ] Create `/app/(authenticated)/employees/page.tsx`
- [ ] Build employee list/grid view
- [ ] Create employee detail page
- [ ] Add employee switching functionality

#### 6.2 Employee CRUD Operations
- [ ] Create employee API routes
- [ ] Implement employee creation flow
- [ ] Add avatar upload functionality
- [ ] Build employee settings management

#### 6.3 Employee Context
- [ ] Create active employee context
- [ ] Implement employee switching
- [ ] Add employee-specific calculations
- [ ] Create employee data isolation

### Phase 7: Statistics & Analytics (Week 4)
**Goal:** Data visualization and reporting

#### 7.1 Statistics Page
- [ ] Create `/app/(authenticated)/statistics/page.tsx`
- [ ] Install charting library (Chart.js or Recharts)
- [ ] Build earnings overview dashboard
- [ ] Create period comparison views

#### 7.2 Data Aggregation
- [ ] Implement data aggregation logic
- [ ] Create custom date range selectors
- [ ] Add export functionality (CSV/PDF)
- [ ] Build report templates

#### 7.3 Visualizations
- [ ] Create earnings trend charts
- [ ] Build hours worked visualizations
- [ ] Add tax breakdown charts
- [ ] Implement predictive analytics

### Phase 8: Settings & Preferences (Week 4-5)
**Goal:** User customization and app configuration

#### 8.1 Settings Page Enhancement
- [ ] Enhance `/app/(authenticated)/settings/page.tsx`
- [ ] Add theme selector with live preview
- [ ] Create notification preferences
- [ ] Build data export/import tools

#### 8.2 Subscription Management
- [ ] Integrate Stripe for payments
- [ ] Create billing dashboard
- [ ] Add plan selection UI
- [ ] Implement usage limits

### Phase 9: Progressive Web App (Week 5)
**Goal:** Mobile optimization and offline support

#### 9.1 PWA Configuration
- [ ] Create web app manifest
- [ ] Configure service worker
- [ ] Add offline page
- [ ] Implement background sync

#### 9.2 Mobile Optimizations
- [ ] Add iOS PWA meta tags
- [ ] Implement safe area insets
- [ ] Create app install prompt
- [ ] Add push notifications

#### 9.3 Offline Functionality
- [ ] Implement offline data storage
- [ ] Create sync queue for offline changes
- [ ] Add conflict resolution
- [ ] Build offline indicators

### Phase 10: Testing & Optimization (Week 5-6)
**Goal:** Ensure stability and performance

#### 10.1 Testing Implementation
- [ ] Set up Jest and React Testing Library
- [ ] Write unit tests for calculations
- [ ] Create integration tests for API routes
- [ ] Add E2E tests with Playwright

#### 10.2 Performance Optimization
- [ ] Implement code splitting
- [ ] Add lazy loading for routes
- [ ] Optimize bundle size
- [ ] Add performance monitoring

#### 10.3 Error Handling
- [ ] Create global error boundary
- [ ] Add Sentry error tracking
- [ ] Implement user feedback system
- [ ] Create fallback UI components

### Phase 11: Deployment Preparation (Week 6)
**Goal:** Production-ready deployment

#### 11.1 Build Optimization
- [ ] Configure production builds
- [ ] Set up CI/CD pipeline
- [ ] Create deployment scripts
- [ ] Add build verification

#### 11.2 Documentation
- [ ] Write API documentation
- [ ] Create user guide
- [ ] Document deployment process
- [ ] Add inline code documentation

#### 11.3 Launch Checklist
- [ ] Security audit
- [ ] Performance testing
- [ ] Cross-browser testing
- [ ] Accessibility review
- [ ] Data migration plan

## Technical Stack

### Core Dependencies to Install
```bash
# Authentication & Database
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

# State Management
npm install zustand

# Data Visualization
npm install recharts

# Utilities
npm install date-fns
npm install zod  # for validation
npm install react-hook-form

# PWA Support
npm install next-pwa

# Development
npm install -D @testing-library/react @testing-library/jest-dom jest
```

## Success Metrics

1. **Functional Parity:** All features from existing app work in Next.js
2. **Performance:** Lighthouse score > 90 for all categories
3. **Stability:** Zero critical bugs, < 1% error rate
4. **User Experience:** Smooth transitions, responsive design
5. **Code Quality:** 80%+ test coverage, clean architecture

## Risk Mitigation

### Potential Risks
1. **Data Migration:** Ensure backward compatibility
2. **Authentication:** Test Supabase integration thoroughly
3. **Calculations:** Validate wage calculations against existing app
4. **Performance:** Monitor bundle size and optimize

### Mitigation Strategies
- Incremental migration with feature flags
- Parallel deployment for testing
- Comprehensive testing at each phase
- Regular user feedback collection

## Timeline Summary

- **Week 1:** Foundation & Authentication
- **Week 2:** Core Pages & Navigation
- **Week 3:** Shifts & Calculations
- **Week 4:** Employees & Statistics
- **Week 5:** Settings & PWA
- **Week 6:** Testing & Deployment

Total estimated time: 6 weeks for full migration

## Next Immediate Steps

1. Tackle the Pre-Phase 2 checklist (real Supabase key, lint fixes, hook dependency decisions).
2. Kick off Phase 2 by implementing the `/app/login` route with Supabase email/password auth and error handling.
3. Design the authentication middleware/session guard approach before expanding into additional authenticated pages.


## Notes

- Leverage existing CSS modules and components
- Focus on stability over features
- Test each phase thoroughly before moving forward
- Keep existing app running in parallel during migration
- Document all architectural decisions

---

*Last Updated: December 2024*
*Migration Plan Version: 1.0*