/**
 * mempool.space REST API response shapes (only the fields Satchel reads).
 * All amounts are satoshis as JSON numbers — safe in doubles (max supply
 * 2.1e15 < 2^53); convert to bigint at the wallet layer when doing math.
 */

export interface AddressStats {
  funded_txo_count: number;
  funded_txo_sum: number;
  spent_txo_count: number;
  spent_txo_sum: number;
  tx_count: number;
}

export interface AddressInfo {
  address: string;
  chain_stats: AddressStats;
  mempool_stats: AddressStats;
}

export interface TxStatus {
  confirmed: boolean;
  block_height?: number;
  block_hash?: string;
  block_time?: number;
}

export interface Utxo {
  txid: string;
  vout: number;
  value: number;
  status: TxStatus;
}

export interface Vout {
  scriptpubkey: string;
  scriptpubkey_type: string;
  scriptpubkey_address?: string;
  value: number;
}

export interface Vin {
  txid: string;
  vout: number;
  is_coinbase: boolean;
  sequence: number;
  prevout: Vout | null;
}

export interface Tx {
  txid: string;
  version: number;
  locktime: number;
  vin: Vin[];
  vout: Vout[];
  size: number;
  weight: number;
  fee: number;
  status: TxStatus;
}

export interface RecommendedFees {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

/** From /v1/prices — one spot price per currency. */
export interface Prices {
  time: number;
  USD: number;
  EUR: number;
  GBP: number;
  CAD: number;
  CHF: number;
  AUD: number;
  JPY: number;
}
