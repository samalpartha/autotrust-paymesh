import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.RPC_URL || "";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    localhost: { url: `http://127.0.0.1:${process.env.PORT || 8545}` },
    hardhat: {
      chainId: 31337,
    },
    cloud: {
      url: "https://autotrust-chain-108816008638.us-central1.run.app",
      chainId: 31337,
      accounts: ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"]
    },
    ...(RPC_URL && DEPLOYER_PRIVATE_KEY && DEPLOYER_PRIVATE_KEY.length === 66 ? {
      sepolia: {
        url: RPC_URL,
        accounts: [DEPLOYER_PRIVATE_KEY],
        chainId: 11155111,
      },
      mainnet: {
        url: RPC_URL,
        accounts: [DEPLOYER_PRIVATE_KEY],
        chainId: 1,
      },
    } : {}),
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
};

export default config;
