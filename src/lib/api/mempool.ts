import { NETWORKS } from '@/lib/networks';
import type {
  AddressInfo,
  Prices,
  RecommendedFees,
  Tx,
  Utxo,
} from './types';

/**
 * Thin typed client for the mempool.space REST API with two protections the
 * POC lacked: a global concurrency cap (restore scans probe dozens of
 * addresses — don't hammer a free public API) and exponential backoff on
 * 429/5xx.
 */

const MAX_CONCURRENT = 2;
const MAX_RETRIES = 4;
/** Pace request starts — the public API rate-limits bursts hard. */
const MIN_SPACING_MS = 250;

let active = 0;
let lastStart = 0;
const waiters: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  while (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  active++;
  const wait = lastStart + MIN_SPACING_MS - Date.now();
  lastStart = Math.max(Date.now(), lastStart + MIN_SPACING_MS);
  if (wait > 0) await sleep(wait);
}

function releaseSlot(): void {
  active--;
  waiters.shift()?.();
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Per-attempt cap — a throttled connection can otherwise hang for minutes. */
const ATTEMPT_TIMEOUT_MS = 15_000;

async function request(url: string, init?: RequestInit): Promise<Response> {
  await acquireSlot();
  try {
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        const timeout = AbortSignal.timeout(ATTEMPT_TIMEOUT_MS);
        const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
        response = await fetch(url, { ...init, signal });
      } catch (err) {
        // Deliberate caller aborts propagate; anything else (network drop,
        // per-attempt timeout, or a rate-limit response the browser masks
        // as a CORS failure) retries with backoff.
        if (init?.signal?.aborted) {
          throw err;
        }
        if (attempt >= MAX_RETRIES) {
          throw new ApiError(`${init?.method ?? 'GET'} ${url} failed: network error`, 0);
        }
        await sleep(2000 * 2 ** attempt + Math.random() * 1000);
        continue;
      }
      if (response.ok) return response;

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt >= MAX_RETRIES) {
        throw new ApiError(
          `${init?.method ?? 'GET'} ${url} failed: ${response.status} ${await response
            .text()
            .catch(() => '')}`.trim(),
          response.status,
        );
      }
      await sleep(2000 * 2 ** attempt + Math.random() * 1000);
    }
  } finally {
    releaseSlot();
  }
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await request(url, { signal });
  return (await response.json()) as T;
}

export function getAddressInfo(
  base: string,
  address: string,
  signal?: AbortSignal,
): Promise<AddressInfo> {
  return getJson(`${base}/address/${address}`, signal);
}

export function getAddressUtxos(
  base: string,
  address: string,
  signal?: AbortSignal,
): Promise<Utxo[]> {
  return getJson(`${base}/address/${address}/utxo`, signal);
}

/** Confirmed txs, newest first, 25 per page; pass the last txid seen to page. */
export function getAddressTxsChain(
  base: string,
  address: string,
  afterTxid?: string,
  signal?: AbortSignal,
): Promise<Tx[]> {
  const suffix = afterTxid ? `/${afterTxid}` : '';
  return getJson(`${base}/address/${address}/txs/chain${suffix}`, signal);
}

export function getAddressTxsMempool(
  base: string,
  address: string,
  signal?: AbortSignal,
): Promise<Tx[]> {
  return getJson(`${base}/address/${address}/txs/mempool`, signal);
}

export function getTx(base: string, txid: string, signal?: AbortSignal): Promise<Tx> {
  return getJson(`${base}/tx/${txid}`, signal);
}

export async function getTxHex(base: string, txid: string, signal?: AbortSignal): Promise<string> {
  const response = await request(`${base}/tx/${txid}/hex`, { signal });
  return response.text();
}

export function getRecommendedFees(base: string, signal?: AbortSignal): Promise<RecommendedFees> {
  return getJson(`${base}/v1/fees/recommended`, signal);
}

/** BTC spot prices are network-independent — always served from mainnet. */
export function getPrices(signal?: AbortSignal): Promise<Prices> {
  return getJson(`${NETWORKS.mainnet.apiBase}/v1/prices`, signal);
}

export function getTipHeight(base: string, signal?: AbortSignal): Promise<number> {
  return getJson(`${base}/blocks/tip/height`, signal);
}

/** Broadcast a signed raw transaction. Returns the txid. */
export async function broadcastTx(base: string, hex: string): Promise<string> {
  const response = await request(`${base}/tx`, { method: 'POST', body: hex });
  return response.text();
}

/**
 * Future hook for live updates (mempool.space WebSocket API). Deliberately a
 * no-op in v1 — polling via TanStack Query covers it. Consumers already code
 * against this interface so WS can slot in without touching them.
 */
export function subscribeAddress(
  _base: string,
  _address: string,
  _onTx: (txid: string) => void,
): () => void {
  return () => {};
}
