import { db } from './db';
import { NextRequest } from 'next/server';
import type { SecurityEvent } from '@prisma/client';

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'REGISTER_SUCCESS'
  | 'VERIFY_FAIL'
  | 'VERIFY_SUCCESS'
  | 'ROLE_SWITCH'
  | 'ROLE_SWITCH_DENIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ORCID_LINK'
  | 'ORCID_STATE_MISMATCH';

interface LogEventOptions {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export async function logSecurityEvent(
  eventType: SecurityEventType,
  options: LogEventOptions = {}
): Promise<SecurityEvent> {
  const { userId, ipAddress, userAgent, metadata } = options;

  return db.securityEvent.create({
    data: {
      userId,
      eventType,
      ipAddress,
      userAgent,
      metadata: metadata as any
    }
  });
}

export async function logSecurityEventFromRequest(
  eventType: SecurityEventType,
  request: NextRequest,
  options: Omit<LogEventOptions, 'ipAddress' | 'userAgent'> = {}
): Promise<SecurityEvent> {
  return logSecurityEvent(eventType, {
    ...options,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown',
    userAgent: request.headers.get('user-agent') || undefined
  });
}
