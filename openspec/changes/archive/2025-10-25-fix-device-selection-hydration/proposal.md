# Fix Device Selection Hydration Issues

## Why
The current device selection implementation has critical hydration mismatches that cause React hydration errors in production. The system uses client-side only APIs (`localStorage`, `Math.random()`, `new Date()`) during SSR, causing server-rendered content to differ from client-rendered content. This breaks the fundamental SSR/hydration contract in Next.js 15.

## What Changes
- **BREAKING**: Remove direct `localStorage` access during SSR in DeviceContext
- **BREAKING**: Replace `new Date().toLocaleTimeString()` with client-only rendering
- **BREAKING**: Move `Math.random()` health checks to client-side only
- Add proper SSR guards and client-side hydration handling
- Implement fallback mechanisms for SSR scenarios
- Add comprehensive hydration testing

## Impact
- Affected specs: dashboard (device selection requirements)
- Affected code: DeviceContext.tsx, DashboardLayout.tsx, DeviceSelector.tsx
- Breaking changes: Device context initialization, time display, health monitoring
