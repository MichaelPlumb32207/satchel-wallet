'use client';

import { getNetwork } from '@/lib/networks';
import { useSettingsStore } from '@/stores/settings';

/**
 * The mainnet <-> practice (testnet4) switch. Used in the app header and on
 * onboarding, so a newcomer can enter Practice mode before creating a wallet.
 * The choice is global (persisted) and re-themes the whole app via the
 * data-network attribute set in Providers.
 */
export function NetworkToggle() {
  const network = useSettingsStore((s) => s.network);
  const setNetwork = useSettingsStore((s) => s.setNetwork);
  const isPractice = getNetwork(network).isPractice;
  return (
    <button
      onClick={() => setNetwork(isPractice ? 'mainnet' : 'testnet4')}
      title={isPractice ? 'Practice mode — tap for mainnet' : 'Mainnet — tap for practice mode'}
      className="rounded-full bg-accent-dim px-2.5 py-1 text-xs font-semibold text-accent transition hover:brightness-125"
    >
      {isPractice ? 'Practice' : 'Mainnet'}
    </button>
  );
}
