/**
 * Script types Satchel can derive addresses for (receive side).
 * v1 exposes only p2wpkh in the UI; p2tr is wired through so BIP86
 * taproot receive can be enabled later without a schema change.
 */
export type ScriptType = 'p2wpkh' | 'p2tr';

/**
 * Script types Satchel can send to (output side) — all standard types.
 */
export type OutputType = 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr' | 'unknown';

/** 0 = external (receive) chain, 1 = internal (change) chain — BIP44 convention. */
export type Chain = 0 | 1;
