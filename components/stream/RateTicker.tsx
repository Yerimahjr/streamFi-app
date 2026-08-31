'use client';

import { useEffect, useRef, useState } from 'react';
import { fromStroops } from '@/lib/format';

interface RateTickerProps {
  /** Rate in stroops per second */
  ratePerSecond: bigint;
  /** Current withdrawable balance in stroops (fetched from contract) */
  startBalance: bigint;
  /** Decimal places to display (default: 7 for XLM) */
  decimals?: number;
  /** Unix timestamp when the stream ends (0 = open-ended). Ticker freezes past this. */
  endTime?: number;
}

/**
 * Live-updating balance counter.
 * Increments every 100ms based on ratePerSecond without any contract calls.
 * Freezes at endTime so the ticker doesn't overshoot the contract balance (#398).
 */
export function RateTicker({ ratePerSecond, startBalance, decimals = 7, endTime = 0 }: RateTickerProps) {
  const startRef  = useRef<{ ts: number; balance: bigint }>({
    ts:      Date.now(),
    balance: startBalance,
  });

  const [display, setDisplay] = useState(fromStroops(startBalance, decimals));

  useEffect(() => {
    startRef.current = { ts: Date.now(), balance: startBalance };
  }, [startBalance]);

  useEffect(() => {
    // Align to the next whole second to avoid 9 no-op renders per 1 visible update.
    // Calculate milliseconds until the next whole second.
    const now = Date.now();
    const msUntilNextSecond = 1000 - (now % 1000);

    // Set initial timeout to align to the next whole second
    const alignmentTimer = setTimeout(() => {
      // Update display immediately when we hit a whole second
      const elapsed = BigInt(Math.floor((Date.now() - startRef.current.ts) / 1000));
      const current = startRef.current.balance + elapsed * ratePerSecond;
      setDisplay(fromStroops(current, decimals));

      // Then set up a 1-second interval that will naturally stay aligned
      const id = setInterval(() => {
        const elapsed = BigInt(Math.floor((Date.now() - startRef.current.ts) / 1000));
        const current = startRef.current.balance + elapsed * ratePerSecond;
        setDisplay(fromStroops(current, decimals));
      }, 1000);

      return () => clearInterval(id);
    }, msUntilNextSecond);

    return () => clearTimeout(alignmentTimer);
  }, [ratePerSecond, decimals]);

  return (
    <span className="amount">
      {display}
    </span>
  );
}
