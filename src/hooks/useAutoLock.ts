'use client';

import { useEffect, useRef } from 'react';
import { lock } from '@/lib/vault/keyring';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/**
 * Auto-lock policy, mounted once in the app providers:
 * - idle for `autoLockMinutes` -> lock
 * - tab hidden -> lock immediately / after 60 s / never (per settings)
 * - pagehide (navigation away, app closed) -> lock immediately
 */
export function useAutoLock(): void {
  const status = useSessionStore((s) => s.status);
  const autoLockMinutes = useSettingsStore((s) => s.autoLockMinutes);
  const lockOnHide = useSettingsStore((s) => s.lockOnHide);

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== 'unlocked') return;

    const resetIdleTimer = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (autoLockMinutes > 0) {
        idleTimer.current = setTimeout(lock, autoLockMinutes * 60_000);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (lockOnHide === 'immediate') lock();
        else if (lockOnHide === '60s') hideTimer.current = setTimeout(lock, 60_000);
      } else if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };

    const onPageHide = () => lock();

    resetIdleTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetIdleTimer, { passive: true });
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetIdleTimer);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [status, autoLockMinutes, lockOnHide]);
}
