'use client';

/**
 * AutoTrust Paymesh - Wagmi Provider Configuration
 * 
 * References:
 * - wagmi: https://wagmi.sh
 * - MetaMask: https://metamask.io
 * - Ethereum: https://ethereum.org/developers
 */

import React from "react";
import { WagmiProvider, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { createConfig, type Chain } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected } from "wagmi/connectors"; // Only use injected
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../components/Toast";

// ============================================================================
// QUERY CLIENT CONFIGURATION
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// ============================================================================
// CHAIN DEFINITIONS
// ============================================================================

// Hardhat local chain for development
const hardhatLocal: Chain = {
  id: 31337,
  name: "Hardhat Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"] },
  },
  testnet: true,
};

// Determine which chain to use based on NEXT_PUBLIC_CHAIN_ID
const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1);
const isLocal = chainId === 31337;

// Order chains with preferred chain first
const chains: readonly [Chain, ...Chain[]] = isLocal
  ? [hardhatLocal, mainnet]
  : [mainnet, hardhatLocal];

// ============================================================================
// WAGMI CONFIG
// ============================================================================

const config = createConfig({
  chains,
  connectors: [
    // Injected wallets (MetaMask, Brave, etc.) - primary connector
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [mainnet.id]: http(
      process.env.NEXT_PUBLIC_ETH_RPC_URL || "https://mainnet.infura.io/v3/6f5c968a7b2f4d808d99f7ad8a258d65"
    ),
    [hardhatLocal.id]: http(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"),
  },
  ssr: true,
});

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </WagmiProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

// Export for use in other components
export { hardhatLocal, config };
