#!/bin/sh
set -e

# Start Hardhat Node in the background
echo "Starting Hardhat Node..."
npx hardhat node --hostname 0.0.0.0 --port 8080 &
PID=$!

# Wait for the node to be ready
echo "Waiting for node to start..."
sleep 5

# Deploy contracts
echo "Deploying contracts..."
npx hardhat run scripts/deploy.ts --network localhost

# Keep the container running by waiting for the node process
wait $PID
