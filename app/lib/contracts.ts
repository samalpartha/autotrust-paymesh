/**
 * AutoTrust Paymesh - Contract Configuration
 * 
 * References:
 * - MNEE Token: https://etherscan.io/token/0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
 * - ERC-20 Standard: https://ethereum.org/developers/docs/standards/tokens/erc-20/
 * - MNEE Swap: https://swap-user.mnee.net
 * - wagmi: https://wagmi.sh
 */

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

export const MNEE_TOKEN = process.env.NEXT_PUBLIC_MNEE_TOKEN as `0x${string}`;
export const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}`;
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8787";
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1);

// ============================================================================
// MNEE TOKEN CONSTANTS
// ============================================================================

/** MNEE Token address on Ethereum Mainnet */
export const MNEE_MAINNET_ADDRESS = "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF" as const;

/** MNEE uses 18 decimals like most ERC-20 tokens */
export const MNEE_DECIMALS = 18;

/** Official MNEE swap interface for getting tokens */
export const MNEE_SWAP_URL = "https://swap-user.mnee.net";

/** MNEE official website */
export const MNEE_WEBSITE = "https://mnee.io";

// ============================================================================
// NETWORK CONFIGURATION
// ============================================================================

export const IS_LOCAL = CHAIN_ID === 31337;
export const IS_MAINNET = CHAIN_ID === 1;

export const TOKEN_NAME = IS_LOCAL ? "MNEE (Local)" : "MNEE";
export const NETWORK_NAME = IS_LOCAL ? "GoChain Testnet" : "Ethereum Mainnet";

/** Block explorer URL (null for local network) */
export const EXPLORER_URL = IS_LOCAL ? null : "https://etherscan.io";

/** Get token page on Etherscan */
export const getTokenExplorerUrl = (address: string) =>
  EXPLORER_URL ? `${EXPLORER_URL}/token/${address}` : null;

/** Get transaction page on Etherscan */
export const getTxExplorerUrl = (txHash: string) =>
  EXPLORER_URL ? `${EXPLORER_URL}/tx/${txHash}` : null;

/** Get address page on Etherscan */
export const getAddressExplorerUrl = (address: string) =>
  EXPLORER_URL ? `${EXPLORER_URL}/address/${address}` : null;

// ============================================================================
// CHAIN CONFIGURATION FOR WAGMI
// ============================================================================

export const SUPPORTED_CHAINS = {
  1: {
    id: 1,
    name: "Ethereum",
    rpcUrls: ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth"],
    blockExplorer: "https://etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  31337: {
    id: 31337,
    name: "GoChain Testnet",
    rpcUrls: ["https://autotrust-chain-108816008638.us-central1.run.app"],
    blockExplorer: null,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
} as const;

// ============================================================================
// ERC-20 ABI (Based on OpenZeppelin implementation)
// ============================================================================

export const ERC20_ABI = [
  // Read functions
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  // Write functions
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "transferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  // Events
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "spender", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

// ============================================================================
// ESCROW CONTRACT ABI (Full v2.0 with dispute workflow)
// ============================================================================

export const ESCROW_ABI = [
  // Create escrow (with metadata)
  {
    type: "function",
    name: "createEscrow",
    stateMutability: "nonpayable",
    inputs: [
      { name: "escrowId", type: "bytes32" },
      { name: "payee", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "arbiter", type: "address" },
      { name: "deadline", type: "uint64" },
      { name: "metadataHash", type: "bytes32" },
    ],
    outputs: [],
  },
  // Create escrow (backwards compatible)
  {
    type: "function",
    name: "createEscrow",
    stateMutability: "nonpayable",
    inputs: [
      { name: "escrowId", type: "bytes32" },
      { name: "payee", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "arbiter", type: "address" },
      { name: "deadline", type: "uint64" },
    ],
    outputs: [],
  },
  // Release
  {
    type: "function",
    name: "release",
    stateMutability: "nonpayable",
    inputs: [{ name: "escrowId", type: "bytes32" }],
    outputs: [],
  },
  // Partial release
  {
    type: "function",
    name: "releasePartial",
    stateMutability: "nonpayable",
    inputs: [
      { name: "escrowId", type: "bytes32" },
      { name: "partialAmount", type: "uint256" },
    ],
    outputs: [],
  },
  // Refund
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [{ name: "escrowId", type: "bytes32" }],
    outputs: [],
  },
  // Dispute
  {
    type: "function",
    name: "dispute",
    stateMutability: "nonpayable",
    inputs: [{ name: "escrowId", type: "bytes32" }],
    outputs: [],
  },
  // Resolve dispute
  {
    type: "function",
    name: "resolveDispute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "escrowId", type: "bytes32" },
      { name: "releaseToPayee", type: "bool" },
    ],
    outputs: [],
  },
  // Extend deadline
  {
    type: "function",
    name: "extendDeadline",
    stateMutability: "nonpayable",
    inputs: [
      { name: "escrowId", type: "bytes32" },
      { name: "extension", type: "uint64" },
    ],
    outputs: [],
  },
  // View: escrows mapping
  {
    type: "function",
    name: "escrows",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [
      { name: "payer", type: "address" },
      { name: "payee", type: "address" },
      { name: "arbiter", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "released", type: "uint256" },
      { name: "deadline", type: "uint64" },
      { name: "disputedAt", type: "uint64" },
      { name: "status", type: "uint8" },
      { name: "metadataHash", type: "bytes32" },
    ],
  },
  // View: getEscrow
  {
    type: "function",
    name: "getEscrow",
    stateMutability: "view",
    inputs: [{ name: "escrowId", type: "bytes32" }],
    outputs: [
      { name: "payer", type: "address" },
      { name: "payee", type: "address" },
      { name: "arbiter", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "released", type: "uint256" },
      { name: "deadline", type: "uint64" },
      { name: "disputedAt", type: "uint64" },
      { name: "status", type: "uint8" },
      { name: "metadataHash", type: "bytes32" },
    ],
  },
  // View: isExpired
  {
    type: "function",
    name: "isExpired",
    stateMutability: "view",
    inputs: [{ name: "escrowId", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
  // View: remainingBalance
  {
    type: "function",
    name: "remainingBalance",
    stateMutability: "view",
    inputs: [{ name: "escrowId", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
  // View: token
  {
    type: "function",
    name: "token",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  // View: escrowCount
  {
    type: "function",
    name: "escrowCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  // View: totalValueLocked
  {
    type: "function",
    name: "totalValueLocked",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  // View: isAuthorizedAgent
  {
    type: "function",
    name: "isAuthorizedAgent",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  // Events
  {
    type: "event",
    name: "EscrowCreated",
    inputs: [
      { name: "escrowId", type: "bytes32", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "payee", type: "address", indexed: true },
      { name: "arbiter", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "deadline", type: "uint64", indexed: false },
      { name: "metadataHash", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EscrowReleased",
    inputs: [
      { name: "escrowId", type: "bytes32", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "remaining", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EscrowRefunded",
    inputs: [
      { name: "escrowId", type: "bytes32", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EscrowDisputed",
    inputs: [
      { name: "escrowId", type: "bytes32", indexed: true },
      { name: "disputedBy", type: "address", indexed: true },
      { name: "disputedAt", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DisputeResolved",
    inputs: [
      { name: "escrowId", type: "bytes32", indexed: true },
      { name: "resolvedBy", type: "address", indexed: true },
      { name: "releasedToPayee", type: "bool", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DeadlineExtended",
    inputs: [
      { name: "escrowId", type: "bytes32", indexed: true },
      { name: "oldDeadline", type: "uint64", indexed: false },
      { name: "newDeadline", type: "uint64", indexed: false },
    ],
  },
] as const;

// ============================================================================
// ESCROW STATUS ENUM
// ============================================================================

export const ESCROW_STATUS = {
  0: "None",
  1: "Funded",
  2: "Released",
  3: "Refunded",
  4: "Disputed",
} as const;

export const ESCROW_STATUS_COLORS = {
  0: "#6b7280", // gray
  1: "#f59e0b", // amber (funded/active)
  2: "#22c55e", // green (released/success)
  3: "#ef4444", // red (refunded)
  4: "#8b5cf6", // purple (disputed)
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/** Format MNEE amount for display (18 decimals) */
export function formatMNEE(amount: bigint | string | number): string {
  const value = typeof amount === 'bigint' ? amount : BigInt(amount);
  const formatted = Number(value) / 1e18;
  return formatted.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  });
}

/** Parse MNEE amount from string input (18 decimals) */
export function parseMNEE(amount: string): bigint {
  const cleaned = amount.replace(/,/g, '');
  const value = parseFloat(cleaned);
  if (isNaN(value)) return 0n;
  return BigInt(Math.floor(value * 1e18));
}

/** Shorten an Ethereum address for display */
export function shortAddress(address: string, chars = 4): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/** Format deadline for display */
export function formatDeadline(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  return date.toLocaleString();
}

/** Check if deadline has passed */
export function isDeadlinePassed(unixSeconds: number): boolean {
  return Date.now() > unixSeconds * 1000;
}

/** Calculate time remaining until deadline */
export function timeRemaining(unixSeconds: number): string {
  const now = Date.now();
  const deadline = unixSeconds * 1000;
  const diff = deadline - now;

  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  return `${hours}h ${minutes}m`;
}
