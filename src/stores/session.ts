import { create } from 'zustand';

/**
 * Lock-state ONLY. No key material ever enters this store (or any React
 * state) — secrets live in the keyring module closure. This store exists so
 * UI can subscribe to lock/unlock without touching the keyring.
 */
export type SessionStatus = 'locked' | 'unlocked';

interface SessionState {
  status: SessionStatus;
  /** Set by the keyring; UI must never set this directly. */
  _setStatus: (status: SessionStatus) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'locked',
  _setStatus: (status) => set({ status }),
}));
