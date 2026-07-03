import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { del, get, set as idbSet } from 'idb-keyval';
import type { ScriptType } from '@/lib/bitcoin/types';
import type { NetworkId } from '@/lib/networks';

/**
 * Wallet METADATA only. Hot-wallet secrets live in the encrypted vault;
 * watch-only keys are public data and safe to store here unencrypted
 * (they reveal addresses/balances if the device is compromised, but can
 * never move funds).
 */
export interface WalletMeta {
  id: string;
  name: string;
  type: 'hot' | 'watch';
  scriptType: ScriptType;
  createdAt: number;
  /** Hot wallets: has the user passed the seed backup quiz yet? */
  backupVerified?: boolean;
  /** Watch-only: normalized account xpub/tpub (see slip132.parseWatchOnlyInput). */
  watchKey?: string;
  /** Watch-only keys are network-specific (version bytes); hot wallets work on both. */
  watchNetwork?: NetworkId;
  /**
   * Highest address index the user has manually rotated to, per network —
   * merged with the chain scan so "New address" survives a reload.
   */
  receiveIndexFloor?: Partial<Record<NetworkId, number>>;
}

interface WalletsState {
  wallets: WalletMeta[];
  activeWalletId: string | null;
  hasHydrated: boolean;
  addWallet: (wallet: WalletMeta) => void;
  removeWallet: (id: string) => void;
  renameWallet: (id: string, name: string) => void;
  setActiveWallet: (id: string) => void;
  markBackupVerified: (id: string) => void;
  bumpReceiveIndexFloor: (id: string, network: NetworkId, index: number) => void;
  _setHasHydrated: (v: boolean) => void;
}

const idbStorage = {
  getItem: (name: string) => get<string>(name).then((v) => v ?? null),
  setItem: (name: string, value: string) => idbSet(name, value),
  removeItem: (name: string) => del(name),
};

export const useWalletsStore = create<WalletsState>()(
  persist(
    (set) => ({
      wallets: [],
      activeWalletId: null,
      hasHydrated: false,
      addWallet: (wallet) =>
        set((s) => ({
          wallets: [...s.wallets, wallet],
          activeWalletId: wallet.id,
        })),
      removeWallet: (id) =>
        set((s) => {
          const wallets = s.wallets.filter((w) => w.id !== id);
          return {
            wallets,
            activeWalletId:
              s.activeWalletId === id ? (wallets[0]?.id ?? null) : s.activeWalletId,
          };
        }),
      renameWallet: (id, name) =>
        set((s) => ({
          wallets: s.wallets.map((w) => (w.id === id ? { ...w, name } : w)),
        })),
      setActiveWallet: (id) => set({ activeWalletId: id }),
      markBackupVerified: (id) =>
        set((s) => ({
          wallets: s.wallets.map((w) => (w.id === id ? { ...w, backupVerified: true } : w)),
        })),
      bumpReceiveIndexFloor: (id, network, index) =>
        set((s) => ({
          wallets: s.wallets.map((w) =>
            w.id === id
              ? {
                  ...w,
                  receiveIndexFloor: {
                    ...w.receiveIndexFloor,
                    [network]: Math.max(w.receiveIndexFloor?.[network] ?? 0, index),
                  },
                }
              : w,
          ),
        })),
      _setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'satchel.wallets',
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ wallets: s.wallets, activeWalletId: s.activeWalletId }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    },
  ),
);

/** The currently selected wallet, or null before onboarding. */
export function useActiveWallet(): WalletMeta | null {
  return useWalletsStore(
    (s) => s.wallets.find((w) => w.id === s.activeWalletId) ?? s.wallets[0] ?? null,
  );
}
