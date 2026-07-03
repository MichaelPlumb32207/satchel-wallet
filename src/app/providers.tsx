'use client';

import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { LockGate } from '@/components/LockGate';
import { useAutoLock } from '@/hooks/useAutoLock';
import { queryPersister } from '@/lib/persister';
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
            // Persisted queries older than this are dropped on restore.
            gcTime: 24 * 60 * 60 * 1000,
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

  // Offline app shell. Registered in production only — caching fights HMR.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  useAutoLock();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister, maxAge: 24 * 60 * 60 * 1000, buster: 'v1' }}
    >
      <OfflineBanner />
      <LockGate>{children}</LockGate>
    </PersistQueryClientProvider>
  );
}

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div className="bg-amber-950 px-4 py-1.5 text-center text-xs font-medium text-amber-300">
      Offline — showing your last-known balances. Sending is unavailable.
    </div>
  );
}
