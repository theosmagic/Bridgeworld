import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectKitProvider } from 'connectkit';
import { useState } from 'react';

import { type State, WagmiProvider } from 'wagmi';
import { getConfig } from '~/lib/wagmi';

export const Web3Provider = ({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState: State | undefined;
}) => {
  const [config] = useState(() => getConfig());
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
