import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_NETWORK, type NetworkId } from '@/lib/networks';

export type LockOnHide = 'immediate' | '60s' | 'never';
export type AmountUnit = 'btc' | 'sats';

interface SettingsState {
  network: NetworkId;
  /** Fiat display currency (mempool.space prices endpoint supports the majors). */
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'CHF' | 'AUD' | 'JPY';
  unit: AmountUnit;
  /** Idle minutes before auto-lock. 0 = never (discouraged). */
  autoLockMinutes: number;
  lockOnHide: LockOnHide;
  setNetwork: (network: NetworkId) => void;
  setCurrency: (currency: SettingsState['currency']) => void;
  setUnit: (unit: AmountUnit) => void;
  setAutoLockMinutes: (minutes: number) => void;
  setLockOnHide: (mode: LockOnHide) => void;
}

/**
 * Non-secret preferences only — safe in localStorage. Persistence is
 * skipped during SSR; PersistGate (in the app providers) rehydrates on
 * the client before rendering wallet UI.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      network: DEFAULT_NETWORK,
      currency: 'USD',
      unit: 'btc',
      autoLockMinutes: 5,
      lockOnHide: '60s',
      setNetwork: (network) => set({ network }),
      setCurrency: (currency) => set({ currency }),
      setUnit: (unit) => set({ unit }),
      setAutoLockMinutes: (autoLockMinutes) => set({ autoLockMinutes }),
      setLockOnHide: (lockOnHide) => set({ lockOnHide }),
    }),
    {
      name: 'satchel.settings',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
