'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { LockGate } from '@/components/LockGate';
import { useAutoLock } from '@/hooks/useAutoLock';
import { useSettingsStore } from '@/stores/settings';
import { useWalletsStore } from '@/stores/wallets';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: 2,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  // Persisted stores skip SSR hydration; rehydrate once on the client.
  useEffect(() => {
    void useSettingsStore.persist.rehydrate();
    void useWalletsStore.persist.rehydrate();
  }, []);

  // Practice-mode theming: the accent system keys off this attribute.
  const network = useSettingsStore((s) => s.network);
  useEffect(() => {
    document.documentElement.dataset.network = network;
  }, [network]);

  useAutoLock();

  return (
    <QueryClientProvider client={queryClient}>
      <LockGate>{children}</LockGate>
    </QueryClientProvider>
  );
}
