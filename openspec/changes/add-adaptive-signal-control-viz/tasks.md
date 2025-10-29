# Implementation Tasks

## Phase 1: Backend - Signal Control Processor (5-7 hours)

### 1.1 Create ASC Logic Evaluators
- [ ] Create `/dashboard/src/lib/signal-control-evaluator.ts`
  - [ ] Implement `evaluatePhaseLogic()` function (headway, occupancy, queue logic)
  - [ ] Implement `evaluateQueueLogic()` function (spillback, overflow detection)
  - [ ] Implement `evaluatePriorityLogic()` function (TSP, NMV, heavy vehicle)
  - [ ] Add TypeScript interfaces for all return types
  - [ ] Add configurable threshold constants with defaults

**Validation**: Unit tests for each evaluator with known scenarios

### 1.2 Create Signal Control API Route
- [ ] Create `/dashboard/src/app/api/signal-control/status/route.ts`
  - [ ] Implement GET handler with device and lane query params
  - [ ] Fetch latest radar data from Redis (0x01, 0x03, 0x04)
  - [ ] Call evaluator functions and aggregate results
  - [ ] Return structured JSON response with all ASC data
  - [ ] Add error handling and fallback data

**Validation**: API returns 200 with correct data structure

### 1.3 Add WebSocket Signal Control Updates
- [ ] Update `/dashboard/src/lib/websocket-server.ts` (or create if needed)
  - [ ] Subscribe to Redis pub/sub for radar data changes
  - [ ] Evaluate ASC logic on every update
  - [ ] Emit `signal_control_update` events when ASC state changes
  - [ ] Throttle updates to 1-second intervals

**Validation**: WebSocket emits signal control updates in real-time

---

## Phase 2: Frontend - React Components (6-8 hours)

### 2.1 Create Green Phase Duration Panel
- [ ] Create `/dashboard/src/components/signal-control/GreenPhaseDurationPanel.tsx`
  - [ ] Add headway time progress bar with threshold marker
  - [ ] Add occupancy rate circular gauge (0-100%)
  - [ ] Add queue count display with trend indicator
  - [ ] Add phase status badge (active phase, time remaining)
  - [ ] Add recommendation display (extend/gap-out/maintain with reasoning)
  - [ ] Style with Tailwind for consistency

**Validation**: Panel displays real-time headway, occupancy, queue data

### 2.2 Create Queue & Spillback Management Panel
- [ ] Create `/dashboard/src/components/signal-control/QueueSpillbackPanel.tsx`
  - [ ] Add queue length linear gauge with danger zone (red > 75m)
  - [ ] Add overflow alert banner (visible when `overflow === true`)
  - [ ] Add lead vehicle position indicator (distance from stop line)
  - [ ] Add "Call Opposing Phase" button (active when spillback imminent)
  - [ ] Add multi-lane support (show all lanes or filter by selected)
  - [ ] Style with color-coded urgency levels

**Validation**: Panel shows queue data and triggers alerts correctly

### 2.3 Create Priority & Safety Control Panel
- [ ] Create `/dashboard/src/components/signal-control/PriorityControlPanel.tsx`
  - [ ] Add Transit Signal Priority (TSP) indicator with bus icon
  - [ ] Add Pedestrian/Cyclist Recall (NMV) indicator with walker/bike icons
  - [ ] Add Heavy Vehicle Extension indicator with truck icon
  - [ ] Add active/inactive status badges for each priority type
  - [ ] Add action description (e.g., "Extend green +20s")
  - [ ] Style with distinct colors per priority type

**Validation**: Panel shows vehicle classification impact on timing

### 2.4 Create Algorithm Status Indicators
- [ ] Create `/dashboard/src/components/signal-control/AlgorithmStatusBar.tsx`
  - [ ] Add status badge component with icon, label, description
  - [ ] Create badges for: Gap-Out, Max Green, Spillback, TSP, NMV Recall
  - [ ] Add active/inactive visual states (color, opacity)
  - [ ] Add tooltips with detailed reasoning on hover
  - [ ] Layout horizontally with responsive wrapping

**Validation**: Status bar shows active ASC rules clearly

### 2.5 Create Main Adaptive Signal Control Component
- [ ] Create `/dashboard/src/components/AdaptiveSignalControl.tsx`
  - [ ] Integrate all 4 panels (Phase, Queue, Priority, Status)
  - [ ] Add WebSocket subscription for real-time updates
  - [ ] Add device context integration
  - [ ] Add lane selection dropdown (optional filter)
  - [ ] Add loading and error states
  - [ ] Use responsive grid layout (2×2 on desktop, vertical on mobile)

**Validation**: Complete ASC dashboard renders and updates in real-time

---

## Phase 3: Configuration & Integration (3-4 hours)

### 3.1 Add ASC Thresholds to Lane Configuration
- [ ] Update `/dashboard/src/types/lane-config.ts`
  - [ ] Add `ASCThresholds` interface with 6 threshold fields
  - [ ] Add to `LaneConfig` interface as optional field
  - [ ] Add default threshold values constant

**Validation**: TypeScript compiles without errors

### 3.2 Update Lane Config Modal
- [ ] Update `/dashboard/src/components/LaneConfigModal.tsx`
  - [ ] Add new "Signal Control" tab after "Display" tab
  - [ ] Add threshold input fields: Max Headway, Min Occupancy, Spillback Threshold
  - [ ] Add threshold input fields: TSP Extension, Heavy Vehicle Extension, Ped Recall Delay
  - [ ] Add helper text explaining each threshold
  - [ ] Save and load thresholds from MongoDB

**Validation**: Thresholds configurable and persistent per lane

### 3.3 Integrate into Control Center
- [ ] Update `/dashboard/src/components/ControlCenter.tsx`
  - [ ] Add "Signal Control" section below current 3-panel layout
  - [ ] Embed `AdaptiveSignalControl` component
  - [ ] Add collapsible toggle (expand/collapse)
  - [ ] Adjust layout to accommodate new section

**Validation**: ASC dashboard accessible from Control Center tab

---

## Phase 4: Testing & Documentation (4-5 hours)

### 4.1 Unit Tests for ASC Logic
- [ ] Create `/dashboard/src/lib/__tests__/signal-control-evaluator.test.ts`
  - [ ] Test `evaluatePhaseLogic()` with various headway/occupancy scenarios
  - [ ] Test `evaluateQueueLogic()` with overflow and spillback cases
  - [ ] Test `evaluatePriorityLogic()` with bus, pedestrian, truck detection
  - [ ] Test threshold edge cases (exactly at threshold values)
  - [ ] Aim for 90%+ code coverage

**Validation**: All tests pass with green checkmarks

### 4.2 Integration Tests
- [ ] Create `/dashboard/src/app/api/signal-control/__tests__/status.test.ts`
  - [ ] Test API route with mock Redis data
  - [ ] Test device and lane query parameter handling
  - [ ] Test error handling (Redis unavailable, invalid data)
  - [ ] Test response structure matches TypeScript interfaces

**Validation**: API route tests pass

### 4.3 E2E Tests (Playwright)
- [ ] Create `/dashboard/__tests__/e2e/signal-control.test.ts`
  - [ ] Test Control Center navigation and ASC panel visibility
  - [ ] Test real-time updates when radar data changes
  - [ ] Test lane selection filter functionality
  - [ ] Test threshold configuration via Lane Config Modal
  - [ ] Test responsive layout on mobile/tablet/desktop

**Validation**: E2E tests pass in CI/CD pipeline

### 4.4 Documentation
- [ ] Update `/dashboard/src/docs/SIGNAL_CONTROL_ASC.md`
  - [ ] Document ASC algorithm logic with examples
  - [ ] Document threshold configuration best practices
  - [ ] Add troubleshooting guide for common issues
  - [ ] Include screenshots of all 4 panels
- [ ] Update `API_DOCUMENTATION.md` with new `/api/signal-control/status` endpoint
- [ ] Update `CLAUDE.md` with ASC feature usage

**Validation**: Documentation complete and reviewed

---

## Dependencies

- **Parallel Work**: Phase 1 (Backend) and Phase 2 (Frontend) can run in parallel
- **Sequential**: Phase 3 depends on Phase 1 & 2 completion
- **Sequential**: Phase 4 runs after Phase 3 completion

## Estimated Timeline

- **Phase 1**: 5-7 hours (Backend)
- **Phase 2**: 6-8 hours (Frontend Components)
- **Phase 3**: 3-4 hours (Configuration & Integration)
- **Phase 4**: 4-5 hours (Testing & Documentation)

**Total**: 18-24 hours (2-3 days of development)

## Success Checklist

Before marking this change as complete:

- [ ] All 4 ASC panels render correctly with real radar data
- [ ] WebSocket updates trigger panel refreshes within 1 second
- [ ] Threshold configuration saves and loads correctly
- [ ] Unit tests achieve 90%+ coverage on ASC logic
- [ ] E2E tests pass for all user workflows
- [ ] Documentation includes screenshots and troubleshooting
- [ ] No TypeScript errors or linting warnings
- [ ] Performance metrics: <100ms render time, <10% CPU usage
- [ ] Validated by traffic engineer for correctness
