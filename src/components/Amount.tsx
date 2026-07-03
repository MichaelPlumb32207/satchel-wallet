'use client';

import { formatSats, satsToBtc, satsToFiat } from '@/lib/bitcoin/units';
import { formatFiat } from '@/lib/format';
import { getNetwork } from '@/lib/networks';
import { usePrice } from '@/hooks/useWalletData';
import { useSettingsStore } from '@/stores/settings';

/**
 * Money display: honors the sats/BTC unit setting and the network's unit
 * label; optionally shows fiat underneath (mainnet only — practice coins
 * are worthless by design and pricing them would teach the wrong thing).
 */
export function Amount({
  sats,
  showFiat = false,
  signed = false,
  className = '',
}: {
  sats: bigint;
  showFiat?: boolean;
  signed?: boolean;
  className?: string;
}) {
  const unit = useSettingsStore((s) => s.unit);
  const network = useSettingsStore((s) => s.network);
  const currency = useSettingsStore((s) => s.currency);
  const config = getNetwork(network);
  const price = usePrice();

  const sign = signed && sats > 0n ? '+' : '';
  const main =
    unit === 'sats'
      ? `${sign}${formatSats(sats)} sats`
      : `${sign}${satsToBtc(sats)} ${config.unit}`;

  const fiat =
    showFiat && !config.isPractice && price !== null
      ? formatFiat(satsToFiat(sats < 0n ? -sats : sats, price), currency)
      : null;

  return (
    <span className={className}>
      <span>{main}</span>
      {fiat && <span className="ml-1.5 text-neutral-500">≈ {fiat}</span>}
    </span>
  );
}

/** Tap-to-toggle main balance figure. */
export function BalanceFigure({ sats }: { sats: bigint }) {
  const unit = useSettingsStore((s) => s.unit);
  const setUnit = useSettingsStore((s) => s.setUnit);
  const network = useSettingsStore((s) => s.network);
  const config = getNetwork(network);

  return (
    <button
      onClick={() => setUnit(unit === 'btc' ? 'sats' : 'btc')}
      title="Toggle BTC/sats"
      className="text-4xl font-bold tracking-tight transition hover:opacity-80"
    >
      {unit === 'sats' ? (
        <>
          {formatSats(sats)} <span className="text-xl text-neutral-500">sats</span>
        </>
      ) : (
        <>
          {satsToBtc(sats)} <span className="text-xl text-neutral-500">{config.unit}</span>
        </>
      )}
    </button>
  );
}
