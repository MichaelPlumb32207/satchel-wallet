import { del, get, set } from 'idb-keyval';
import type {
  PersistedClient,
  Persister,
} from '@tanstack/react-query-persist-client';

/**
 * Offline cache for query data (balances, history, scan results) so the app
 * renders instantly on reload and shows last-known data offline. Also spares
 * the rate-limited public API a full re-scan on every visit.
 *
 * Query data contains bigints (sats) and Uint8Arrays (pubkeys) — plain JSON
 * drops both, so we tag them through a replacer/reviver.
 */

const KEY = 'satchel.querycache.v1';

function replacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return { __satchel: 'bigint', v: value.toString() };
  if (value instanceof Uint8Array) {
    let hex = '';
    for (const byte of value) hex += byte.toString(16).padStart(2, '0');
    return { __satchel: 'u8', v: hex };
  }
  return value;
}

function reviver(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && '__satchel' in value) {
    const tagged = value as { __satchel: string; v: string };
    if (tagged.__satchel === 'bigint') return BigInt(tagged.v);
    if (tagged.__satchel === 'u8') {
      const bytes = new Uint8Array(tagged.v.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(tagged.v.slice(i * 2, i * 2 + 2), 16);
      }
      return bytes;
    }
  }
  return value;
}

export const queryPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await set(KEY, JSON.stringify(client, replacer));
  },
  restoreClient: async () => {
    const raw = await get<string>(KEY);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw, reviver) as PersistedClient;
    } catch {
      return undefined;
    }
  },
  removeClient: async () => {
    await del(KEY);
  },
};
