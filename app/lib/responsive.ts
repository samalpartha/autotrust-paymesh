'use client';

import { useState, useEffect } from 'react';

/**
 * Breakpoints following common device widths
 */
export const breakpoints = {
  xs: 0,      // Mobile portrait
  sm: 480,    // Mobile landscape
  md: 768,    // Tablet
  lg: 1024,   // Desktop
  xl: 1280,   // Large desktop
} as const;

type Breakpoint = keyof typeof breakpoints;

/**
 * Hook to get current breakpoint
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width < breakpoints.sm) setBreakpoint('xs');
      else if (width < breakpoints.md) setBreakpoint('sm');
      else if (width < breakpoints.lg) setBreakpoint('md');
      else if (width < breakpoints.xl) setBreakpoint('lg');
      else setBreakpoint('xl');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
}

/**
 * Hook to check if screen is mobile
 */
export function useIsMobile(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'xs' || breakpoint === 'sm';
}

/**
 * Hook to check if screen is tablet or smaller
 */
export function useIsTabletOrSmaller(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'xs' || breakpoint === 'sm' || breakpoint === 'md';
}

/**
 * Media query hook
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

/**
 * Responsive style helper - returns different values based on breakpoint
 */
export function responsive<T>(
  breakpoint: Breakpoint,
  values: Partial<Record<Breakpoint, T>> & { default: T }
): T {
  // Check breakpoints from largest to smallest
  const order: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = order.indexOf(breakpoint);
  
  for (let i = currentIndex; i < order.length; i++) {
    const bp = order[i];
    if (values[bp] !== undefined) {
      return values[bp]!;
    }
  }
  
  return values.default;
}

/**
 * Common responsive style patterns
 */
export const responsiveStyles = {
  // Container padding
  containerPadding: (bp: Breakpoint): string => responsive(bp, {
    xs: '16px',
    sm: '20px',
    md: '32px',
    lg: '48px',
    default: '48px',
  }),
  
  // Grid columns
  gridColumns: (bp: Breakpoint): number => responsive(bp, {
    xs: 1,
    sm: 1,
    md: 2,
    lg: 3,
    default: 3,
  }),
  
  // Font sizes
  heading1: (bp: Breakpoint): string => responsive(bp, {
    xs: '24px',
    sm: '28px',
    md: '36px',
    lg: '48px',
    default: '48px',
  }),
  
  heading2: (bp: Breakpoint): string => responsive(bp, {
    xs: '18px',
    sm: '20px',
    md: '24px',
    default: '24px',
  }),
  
  body: (bp: Breakpoint): string => responsive(bp, {
    xs: '14px',
    sm: '14px',
    md: '15px',
    default: '16px',
  }),
  
  // Layout
  sidebarWidth: (bp: Breakpoint): string => responsive(bp, {
    xs: '100%',
    sm: '100%',
    md: '280px',
    default: '320px',
  }),
  
  // Gaps
  gap: (bp: Breakpoint): string => responsive(bp, {
    xs: '12px',
    sm: '16px',
    md: '20px',
    default: '24px',
  }),
};

/**
 * CSS-in-JS media query generator
 */
export const mq = {
  xs: `@media (max-width: ${breakpoints.sm - 1}px)`,
  sm: `@media (min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.md - 1}px)`,
  md: `@media (min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px) and (max-width: ${breakpoints.xl - 1}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  mobile: `@media (max-width: ${breakpoints.md - 1}px)`,
  tablet: `@media (min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  desktop: `@media (min-width: ${breakpoints.lg}px)`,
};
