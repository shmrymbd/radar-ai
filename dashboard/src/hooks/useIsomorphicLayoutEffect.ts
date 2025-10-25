import { useEffect, useLayoutEffect } from 'react';

/**
 * SSR-safe version of useLayoutEffect
 * Falls back to useEffect during SSR to prevent hydration mismatches
 */
export const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
