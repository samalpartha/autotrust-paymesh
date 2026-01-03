'use client';

import React from "react";
import { WagmiProvider, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { createConfig, type Chain } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

// Hardhat local chain definition
const hardhatLocal: Chain = {
  id: 31337,
  name: "Hardhat Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
};

// Determine which chain to use based on NEXT_PUBLIC_CHAIN_ID
const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1);

const chains: readonly [Chain, ...Chain[]] = chainId === 31337
  ? [hardhatLocal, mainnet]
  : [mainnet, hardhatLocal];

const config = createConfig({
  chains,
  transports: {
    [mainnet.id]: http(),
    [hardhatLocal.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export { hardhatLocal };
