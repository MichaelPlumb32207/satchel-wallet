import { NETWORK, TEST_NETWORK } from '@scure/btc-signer';

export type NetworkId = 'mainnet' | 'testnet4';

type BtcNetwork = typeof NETWORK;

export interface NetworkConfig {
  id: NetworkId;
  label: string;
  /** Display unit for amounts, e.g. BTC vs tBTC. */
  unit: string;
  apiBase: string;
  explorerBase: string;
  /** BIP44 coin type: 0 mainnet, 1 testnet. */
  coinType: 0 | 1;
  /** Address prefixes etc. for @scure/btc-signer. Testnet4 shares testnet3's prefixes. */
  btc: BtcNetwork;
  /** Practice mode: free coins, amber theming, learning-friendly copy. */
  isPractice: boolean;
  /**
   * When set, the receive screen shows a "Get practice coins" button linking here.
   * Deliberately null in v1 — designed hook for the faucet feature.
   */
  faucetUrl: string | null;
}

export const NETWORKS: Record<NetworkId, NetworkConfig> = {
  mainnet: {
    id: 'mainnet',
    label: 'Bitcoin',
    unit: 'BTC',
    apiBase: 'https://mempool.space/api',
    explorerBase: 'https://mempool.space',
    coinType: 0,
    btc: NETWORK,
    isPractice: false,
    faucetUrl: null,
  },
  testnet4: {
    id: 'testnet4',
    label: 'Practice (testnet4)',
    unit: 'tBTC',
    apiBase: 'https://mempool.space/testnet4/api',
    explorerBase: 'https://mempool.space/testnet4',
    coinType: 1,
    btc: TEST_NETWORK,
    isPractice: true,
    faucetUrl: null,
  },
};

export const DEFAULT_NETWORK: NetworkId = 'mainnet';

export function getNetwork(id: NetworkId): NetworkConfig {
  return NETWORKS[id];
}
