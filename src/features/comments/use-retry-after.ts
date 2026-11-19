'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ApiError } from '@/lib/api/client';

export function useRetryAfter() {
  const until = useRef(0);
  const [blocked, setBlocked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const respect = useCallback((error: unknown) => {
    if (!(error instanceof ApiError) || error.status !== 429 || !error.retryAfter) return;
    until.current = Date.now() + error.retryAfter * 1000;
    setBlocked(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setBlocked(false), error.retryAfter * 1000);
  }, []);
  const canRequest = useCallback(() => Date.now() >= until.current, []);
  return { blocked, respect, canRequest };
}
