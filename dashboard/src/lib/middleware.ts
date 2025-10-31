/**
 * Middleware utilities for API routes
 * Handles authentication, rate limiting, and request validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiRateLimiter, getExportRateLimiter } from './redis-rate-limiter';

/**
 * Get client identifier from request (IP address or API key)
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get API key from header
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return `key:${apiKey}`;
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() :
             request.headers.get('x-real-ip') ||
             'unknown';

  return `ip:${ip}`;
}

/**
 * Authentication middleware
 * Checks for valid API key in header or environment variable
 */
export function checkAuth(request: NextRequest): {
  authenticated: boolean;
  error?: string;
  identifier: string;
} {
  const identifier = getClientIdentifier(request);

  // If API_KEY is set in environment, require it
  const requiredApiKey = process.env.API_KEY;

  if (requiredApiKey) {
    const providedKey = request.headers.get('x-api-key') ||
                       request.headers.get('authorization')?.replace('Bearer ', '');

    if (!providedKey) {
      return {
        authenticated: false,
        error: 'Missing API key. Provide x-api-key header or Authorization: Bearer <key>',
        identifier
      };
    }

    if (providedKey !== requiredApiKey) {
      return {
        authenticated: false,
        error: 'Invalid API key',
        identifier
      };
    }
  }

  // If no API_KEY is set, allow all requests (development mode)
  // IMPORTANT: Set API_KEY in production!
  return {
    authenticated: true,
    identifier
  };
}

/**
 * Rate limiting middleware for general API routes
 */
export async function checkRateLimit(identifier: string): Promise<{
  allowed: boolean;
  response?: NextResponse;
}> {
  // Skip rate limiting if disabled in environment
  if (process.env.DISABLE_RATE_LIMITING === 'true') {
    return { allowed: true };
  }

  const limiter = getApiRateLimiter();
  const result = await limiter.isAllowed(identifier);

  if (!result.allowed) {
    const response = NextResponse.json({
      error: 'Rate limit exceeded',
      message: result.blockedUntil
        ? `Too many requests. Blocked until ${new Date(result.blockedUntil).toISOString()}`
        : 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(result.resetIn / 1000), // seconds
    }, { status: 429 });

    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetIn / 1000)));
    response.headers.set('Retry-After', String(Math.ceil(result.resetIn / 1000)));

    return { allowed: false, response };
  }

  return { allowed: true };
}

/**
 * Rate limiting middleware for export endpoints (stricter limits)
 */
export async function checkExportRateLimit(identifier: string): Promise<{
  allowed: boolean;
  response?: NextResponse;
}> {
  // Skip rate limiting if disabled in environment
  if (process.env.DISABLE_RATE_LIMITING === 'true') {
    return { allowed: true };
  }

  const limiter = getExportRateLimiter();
  const result = await limiter.isAllowed(identifier);

  if (!result.allowed) {
    const response = NextResponse.json({
      error: 'Export rate limit exceeded',
      message: result.blockedUntil
        ? `Too many export requests. Blocked until ${new Date(result.blockedUntil).toISOString()}`
        : 'Too many export requests. Please try again later.',
      retryAfter: Math.ceil(result.resetIn / 1000),
    }, { status: 429 });

    response.headers.set('X-RateLimit-Limit', '10');
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetIn / 1000)));
    response.headers.set('Retry-After', String(Math.ceil(result.resetIn / 1000)));

    return { allowed: false, response };
  }

  return { allowed: true };
}

/**
 * Combined middleware for API routes
 * Checks authentication and rate limiting
 */
export async function withApiProtection(request: NextRequest, isExport: boolean = false): Promise<{
  ok: boolean;
  response?: NextResponse;
  identifier?: string;
}> {
  // Check authentication first
  const authResult = checkAuth(request);

  if (!authResult.authenticated) {
    return {
      ok: false,
      response: NextResponse.json({
        error: 'Unauthorized',
        message: authResult.error
      }, { status: 401 })
    };
  }

  // Check rate limiting (now async)
  const rateLimitCheck = isExport
    ? await checkExportRateLimit(authResult.identifier)
    : await checkRateLimit(authResult.identifier);

  if (!rateLimitCheck.allowed) {
    return {
      ok: false,
      response: rateLimitCheck.response
    };
  }

  return {
    ok: true,
    identifier: authResult.identifier
  };
}

/**
 * Wrapper function for protected API routes
 * Usage:
 *
 * export async function GET(request: NextRequest) {
 *   const protection = await withApiProtection(request); // Now async!
 *   if (!protection.ok) return protection.response;
 *
 *   // Your API logic here
 * }
 */
