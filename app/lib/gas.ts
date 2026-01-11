/**
 * Infura Gas API Integration
 * @see https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/
 * @see https://ethereum.org/developers/docs/gas/
 */

const INFURA_API_KEY = "6f5c968a7b2f4d808d99f7ad8a258d65";
const GAS_API_URL = `https://gas.api.infura.io/v3/${INFURA_API_KEY}`;
const ETH_RPC_URL = `https://mainnet.infura.io/v3/${INFURA_API_KEY}`;

export interface GasPrices {
  low: {
    suggestedMaxPriorityFeePerGas: string;
    suggestedMaxFeePerGas: string;
    minWaitTimeEstimate: number;
    maxWaitTimeEstimate: number;
  };
  medium: {
    suggestedMaxPriorityFeePerGas: string;
    suggestedMaxFeePerGas: string;
    minWaitTimeEstimate: number;
    maxWaitTimeEstimate: number;
  };
  high: {
    suggestedMaxPriorityFeePerGas: string;
    suggestedMaxFeePerGas: string;
    minWaitTimeEstimate: number;
    maxWaitTimeEstimate: number;
  };
  estimatedBaseFee: string;
  networkCongestion: number;
  latestPriorityFeeRange: string[];
  historicalPriorityFeeRange: string[];
  historicalBaseFeeRange: string[];
  priorityFeeTrend: "up" | "down" | "level";
  baseFeeTrend: "up" | "down" | "level";
}

export interface SimpleGasPrice {
  gasPrice: string; // in Gwei
  maxFeePerGas: string; // in Gwei  
  maxPriorityFeePerGas: string; // in Gwei
  estimatedTime: string; // e.g. "~15 sec"
  congestion: "low" | "medium" | "high";
}

/**
 * Fetch gas prices from Infura Gas API (mainnet only)
 */
export async function fetchGasPrices(): Promise<GasPrices | null> {
  try {
    const response = await fetch(`${GAS_API_URL}/networks/1/suggestedGasFees`);
    if (!response.ok) {
      console.warn("Gas API request failed:", response.status);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn("Failed to fetch gas prices:", error);
    return null;
  }
}

/**
 * Get simple gas price using eth_gasPrice RPC method
 * Works on both mainnet and local networks
 */
export async function getSimpleGasPrice(rpcUrl?: string): Promise<string | null> {
  const url = rpcUrl || ETH_RPC_URL;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_gasPrice",
        params: [],
        id: 1,
      }),
    });
    const data = await response.json();
    if (data.result) {
      // Convert from wei to Gwei
      const gweiValue = parseInt(data.result, 16) / 1e9;
      return gweiValue.toFixed(2);
    }
    return null;
  } catch (error) {
    console.warn("Failed to get gas price:", error);
    return null;
  }
}

/**
 * Get max priority fee per gas (EIP-1559)
 */
export async function getMaxPriorityFee(rpcUrl?: string): Promise<string | null> {
  const url = rpcUrl || ETH_RPC_URL;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_maxPriorityFeePerGas",
        params: [],
        id: 1,
      }),
    });
    const data = await response.json();
    if (data.result) {
      const gweiValue = parseInt(data.result, 16) / 1e9;
      return gweiValue.toFixed(2);
    }
    return null;
  } catch (error) {
    console.warn("Failed to get max priority fee:", error);
    return null;
  }
}

/**
 * Estimate gas for a transaction
 */
export async function estimateGas(
  from: string,
  to: string,
  data: string,
  value?: string,
  rpcUrl?: string
): Promise<string | null> {
  const url = rpcUrl || ETH_RPC_URL;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_estimateGas",
        params: [{
          from,
          to,
          data,
          value: value || "0x0",
        }],
        id: 1,
      }),
    });
    const result = await response.json();
    if (result.result) {
      return parseInt(result.result, 16).toString();
    }
    return null;
  } catch (error) {
    console.warn("Failed to estimate gas:", error);
    return null;
  }
}

/**
 * Format gas price for display
 */
export function formatGasPrice(gasPrices: GasPrices | null, speed: "low" | "medium" | "high" = "medium"): SimpleGasPrice {
  if (!gasPrices) {
    return {
      gasPrice: "—",
      maxFeePerGas: "—",
      maxPriorityFeePerGas: "—",
      estimatedTime: "—",
      congestion: "medium",
    };
  }

  const tier = gasPrices[speed];
  const congestion = gasPrices.networkCongestion;
  
  let congestionLevel: "low" | "medium" | "high" = "medium";
  if (congestion < 0.3) congestionLevel = "low";
  else if (congestion > 0.7) congestionLevel = "high";

  const waitTime = tier.minWaitTimeEstimate / 1000; // Convert to seconds
  let estimatedTime = `~${Math.round(waitTime)} sec`;
  if (waitTime > 60) {
    estimatedTime = `~${Math.round(waitTime / 60)} min`;
  }

  return {
    gasPrice: parseFloat(tier.suggestedMaxFeePerGas).toFixed(1),
    maxFeePerGas: parseFloat(tier.suggestedMaxFeePerGas).toFixed(1),
    maxPriorityFeePerGas: parseFloat(tier.suggestedMaxPriorityFeePerGas).toFixed(1),
    estimatedTime,
    congestion: congestionLevel,
  };
}

/**
 * Get congestion color
 */
export function getCongestionColor(congestion: "low" | "medium" | "high"): string {
  switch (congestion) {
    case "low": return "#22c55e";
    case "medium": return "#f59e0b";
    case "high": return "#ef4444";
  }
}

/**
 * Calculate estimated transaction cost in ETH
 */
export function calculateTxCost(gasLimit: number, gasPriceGwei: number): string {
  const costWei = gasLimit * gasPriceGwei * 1e9;
  const costEth = costWei / 1e18;
  return costEth.toFixed(6);
}
