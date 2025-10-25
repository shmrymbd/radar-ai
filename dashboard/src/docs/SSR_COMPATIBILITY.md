# SSR Compatibility Guide

## Overview
This document outlines the SSR (Server-Side Rendering) compatibility requirements and guidelines for the radar device selection system in Next.js 15.

## Key Principles

### 1. Client-Side Only APIs
The following APIs should only be used on the client-side to prevent hydration mismatches:
- `localStorage` / `sessionStorage`
- `window` object properties
- `Math.random()` for dynamic content
- `new Date()` for time-based content
- Browser-specific APIs

### 2. Hydration Safety
- Use `suppressHydrationWarning` only when necessary
- Ensure server and client render the same initial content
- Use client-side state management for dynamic content
- Implement proper fallbacks for SSR scenarios

### 3. Component Patterns

#### Client-Only Rendering
```tsx
'use client';

import { useState, useEffect } from 'react';

export default function ClientOnlyComponent() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div>Loading...</div>; // SSR fallback
  }

  return <div>Client-only content</div>;
}
```

#### SSR-Safe State Management
```tsx
'use client';

import { useState, useEffect } from 'react';

export default function SSR SafeComponent() {
  const [data, setData] = useState(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Only run client-side logic here
    if (typeof window !== 'undefined') {
      // Safe to use localStorage, window, etc.
    }
  }, []);

  return (
    <div>
      {isClient ? <DynamicContent /> : <SSRFallback />}
    </div>
  );
}
```

## Implementation Guidelines

### Device Context
- Initialize with static defaults for SSR
- Use `isClient` flag to control client-side logic
- Add proper guards for `localStorage` access
- Move environment variable access to client-side only

### Time Display
- Use client-only rendering for real-time updates
- Provide SSR fallback with static content
- Implement proper hydration handling

### Health Monitoring
- Move `Math.random()` logic to client-side only
- Add proper client-side guards
- Implement SSR-safe initialization

### Error Boundaries
- Add error boundaries for device switching
- Implement proper fallback mechanisms
- Handle hydration errors gracefully

## Testing Requirements

### Hydration Tests
- Test server/client rendering consistency
- Verify no hydration mismatches
- Test device switching without errors
- Validate SSR fallback mechanisms

### Performance Tests
- Measure hydration safety impact
- Test client-side rendering performance
- Validate memory usage with SSR

## Common Pitfalls

### 1. Direct localStorage Access
❌ **Wrong:**
```tsx
const data = localStorage.getItem('key');
```

✅ **Correct:**
```tsx
useEffect(() => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem('key');
  }
}, []);
```

### 2. Math.random() in SSR
❌ **Wrong:**
```tsx
const randomValue = Math.random();
```

✅ **Correct:**
```tsx
useEffect(() => {
  if (isClient) {
    const randomValue = Math.random();
  }
}, [isClient]);
```

### 3. Date Objects in SSR
❌ **Wrong:**
```tsx
const time = new Date().toLocaleTimeString();
```

✅ **Correct:**
```tsx
const [time, setTime] = useState('');

useEffect(() => {
  if (isClient) {
    setTime(new Date().toLocaleTimeString());
  }
}, [isClient]);
```

## Migration Checklist

- [ ] Add `isClient` state to components using client-side APIs
- [ ] Move `localStorage` access to client-side only
- [ ] Replace direct `Math.random()` usage with client-side logic
- [ ] Implement SSR fallbacks for dynamic content
- [ ] Add error boundaries for device switching
- [ ] Create hydration tests
- [ ] Validate SSR compatibility

## Resources

- [Next.js SSR Documentation](https://nextjs.org/docs/pages/building-your-application/rendering/server-side-rendering)
- [React Hydration Guide](https://react.dev/reference/react-dom/client/hydrateRoot)
- [SSR Best Practices](https://nextjs.org/docs/pages/building-your-application/rendering/server-side-rendering)
