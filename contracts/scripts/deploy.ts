import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Network:", network.name);

  let tokenAddress: string;

  // For localhost/hardhat, deploy a mock token and mint to deployer
  if (network.name === "localhost" || network.name === "hardhat") {
    console.log("\n--- Local deployment: deploying MockERC20 (MNEE Local) ---");
    
    const Mock = await ethers.getContractFactory("MockERC20");
    const mockToken = await Mock.deploy("MNEE (Local)", "MNEE");
    await mockToken.waitForDeployment();
    tokenAddress = await mockToken.getAddress();
    
    console.log("MockERC20 deployed to:", tokenAddress);
    
    // Mint 100,000 MNEE to deployer for testing
    const mintAmount = ethers.parseUnits("100000", 18);
    await mockToken.mint(deployer.address, mintAmount);
    console.log(`Minted ${ethers.formatUnits(mintAmount, 18)} MNEE to ${deployer.address}`);
    
    // Also mint to Hardhat default accounts for testing convenience
    const signers = await ethers.getSigners();
    for (let i = 1; i < Math.min(signers.length, 5); i++) {
      await mockToken.mint(signers[i].address, mintAmount);
      console.log(`Minted ${ethers.formatUnits(mintAmount, 18)} MNEE to ${signers[i].address}`);
    }
  } else {
    // For mainnet/other networks, use the configured MNEE token address
    tokenAddress = process.env.MNEE_TOKEN || "";
    if (!tokenAddress) throw new Error("MNEE_TOKEN missing in env for non-local deployment");
    console.log("Using existing MNEE token:", tokenAddress);
  }

  // Deploy escrow contract
  console.log("\n--- Deploying MNEEEscrow ---");
  const Escrow = await ethers.getContractFactory("MNEEEscrow");
  const escrow = await Escrow.deploy(tokenAddress);
  await escrow.waitForDeployment();

  const escrowAddress = await escrow.getAddress();
  console.log("MNEEEscrow deployed to:", escrowAddress);

  // Print summary for easy copy-paste to .env files
  console.log("\n========================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log("\nAdd these to your .env files:\n");
  console.log(`NEXT_PUBLIC_MNEE_TOKEN=${tokenAddress}`);
  console.log(`NEXT_PUBLIC_ESCROW_ADDRESS=${escrowAddress}`);
  console.log(`ESCROW_ADDRESS=${escrowAddress}`);
  console.log("");
  
  if (network.name === "localhost" || network.name === "hardhat") {
    console.log("For local testing, use these in app/.env.local:");
    console.log(`NEXT_PUBLIC_CHAIN_ID=31337`);
    console.log(`NEXT_PUBLIC_MNEE_TOKEN=${tokenAddress}`);
    console.log(`NEXT_PUBLIC_ESCROW_ADDRESS=${escrowAddress}`);
    console.log(`NEXT_PUBLIC_BACKEND_URL=http://localhost:8787`);
    console.log("");
    console.log("And in backend/.env:");
    console.log(`RPC_URL=http://127.0.0.1:8545`);
    console.log(`ESCROW_ADDRESS=${escrowAddress}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
