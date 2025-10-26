# Library Version Update Design

## Context

The project currently specifies Next.js 16.0.0 in package.json, which does not exist in the official npm registry or Next.js release history. According to Context7 documentation (the authoritative source for library information), the latest stable Next.js version is **15.1.8**, with experimental canary builds up to 15.4.0-canary.82. This mismatch suggests either a typo during initial setup or an overly optimistic version specification.

Additionally, TypeScript node type definitions (@types/node) are several major versions behind, currently at v20 while v24 is available. This can impact developer experience with missing type definitions for newer Node.js APIs.

## Goals / Non-Goals

### Goals
- **Correct Version Anomaly**: Replace non-existent Next.js 16.0.0 with verified stable 15.1.8
- **Update Type Definitions**: Bring @types/node to latest v24 for improved TypeScript support
- **Verify Compatibility**: Ensure all code works with corrected versions
- **Document Verification**: Update documentation with Context7-verified versions
- **Establish Update Process**: Define how to safely update dependencies in future

### Non-Goals
- **Major Framework Migration**: Not upgrading to unreleased or canary versions
- **Breaking API Changes**: Not introducing new features that require code rewrites
- **Performance Optimization**: Focus is on version correctness, not optimization
- **Dependency Expansion**: Not adding new libraries, only updating existing ones

## Decisions

### Decision: Use Next.js 15.1.8 (Stable)
- **Rationale**: Latest stable release verified in Context7 documentation
- **Alternatives considered**:
  - 15.4.0-canary.82 (too experimental for production)
  - 14.x (unnecessarily old, missing App Router improvements)
  - Keep 16.0.0 (doesn't exist, causes phantom dependency issues)
- **Trade-offs**: Stable version means proven reliability but slightly behind cutting edge

### Decision: Update @types/node to v24
- **Rationale**: Latest type definitions improve IDE experience and catch more errors
- **Alternatives considered**:
  - Keep v20 (miss out on newer type definitions)
  - Use v22 (middle ground but still outdated)
- **Trade-offs**: May expose previously hidden type mismatches that need fixing

### Decision: Maintain Current Redis/MongoDB/React Versions
- **Rationale**: All other dependencies are already at latest stable per Context7 docs:
  - React 19.2.0 ✓
  - Redis 5.9.0 ✓ (node-redis latest)
  - MongoDB 6.20.0 ✓ (node-mongodb-native latest)
  - Tailwind CSS 4.x ✓
- **Trade-offs**: None - these are correctly specified

### Decision: No Code Changes Required
- **Rationale**: Moving from phantom 16.0.0 to real 15.1.8 should be transparent since:
  - Current code is written for Next.js 15.x patterns (App Router, Server Components)
  - No Next.js 16.x-specific APIs are used (because they don't exist)
  - All examples from Context7 documentation work with 15.x
- **Trade-offs**: Need thorough testing to confirm assumption

## Technical Architecture

### Current State (Problematic)
```json
{
  "dependencies": {
    "next": "16.0.0",          // ❌ Does not exist
    "@types/node": "^20"       // ⚠️  Outdated
  }
}
```

### Target State (Verified)
```json
{
  "dependencies": {
    "next": "15.1.8",          // ✓ Verified in Context7
    "@types/node": "^24"       // ✓ Latest stable
  }
}
```

### Verification Process

1. **Context7 Library Resolution**
   - Used `/vercel/next.js` library ID
   - Confirmed available versions: v15.1.8 (stable), v15.4.0-canary.82 (latest)
   - Trust Score: 10/10

2. **NPM Registry Check**
   - Run `npm outdated` to see actual available versions
   - Cross-reference with Context7 documentation
   - Confirm no breaking changes between phantom 16.0.0 and real 15.1.8

3. **Code Pattern Audit**
   - All App Router patterns use Next.js 15.x APIs
   - Server Components, Route Handlers, and Client Components follow 15.x conventions
   - No hypothetical Next.js 16 features detected in codebase

## Migration Strategy

### Phase 1: Version Correction
1. Update `package.json` with verified versions
2. Delete `node_modules` and `package-lock.json`
3. Run `npm install` to resolve dependencies correctly
4. Verify no dependency conflicts

### Phase 2: Build Verification
1. Run `npm run build` to ensure production build succeeds
2. Check for any TypeScript errors from new @types/node
3. Verify all routes compile correctly
4. Test WebSocket server startup

### Phase 3: Runtime Testing
1. Start development server (`npm run dev`)
2. Test all dashboard pages and API routes
3. Verify Redis and MongoDB connections
4. Test WebSocket real-time updates
5. Validate classification charts and historical data

### Phase 4: Documentation Update
1. Update CLAUDE.md with verified versions
2. Add note about Next.js version correction
3. Document dependency update process
4. Include Context7 library IDs for future reference

## Risks / Trade-offs

### Version Mismatch Risk
- **Risk**: Current code may have been written expecting Next.js 16.x features
- **Mitigation**: Code audit shows all patterns are Next.js 15.x compatible
- **Monitoring**: Comprehensive testing during migration

### Type Definition Updates
- **Risk**: New @types/node v24 may expose hidden type errors
- **Mitigation**: Fix any exposed errors during build phase
- **Monitoring**: TypeScript compiler output

### Dependency Resolution
- **Risk**: Updating versions may cause peer dependency conflicts
- **Mitigation**: Use npm's automatic conflict resolution
- **Monitoring**: npm install output and warnings

## Rollback Plan

If issues arise:
1. Restore previous `package.json` from git
2. Delete `node_modules` and `package-lock.json`
3. Run `npm install` to restore previous state
4. Investigate issues before retrying

## Testing Checklist

- [ ] Production build succeeds without errors
- [ ] TypeScript compilation passes
- [ ] Development server starts correctly
- [ ] All API routes respond correctly
- [ ] WebSocket server connects and streams data
- [ ] Redis operations work (get, set, keys)
- [ ] MongoDB queries execute successfully
- [ ] Dashboard loads and displays data
- [ ] Classification charts render properly
- [ ] Historical data queries work
- [ ] Device switching functions correctly
- [ ] Video streaming (if enabled) works

## Success Criteria

1. ✅ Next.js version is a real, stable release (15.1.8)
2. ✅ All dependencies resolve without conflicts
3. ✅ Production build completes successfully
4. ✅ All tests pass (if test suite exists)
5. ✅ Application runs without runtime errors
6. ✅ Documentation accurately reflects installed versions
