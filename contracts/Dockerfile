FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including devDependencies (needed for Hardhat)
RUN npm install

# Copy source code
COPY . .

# Compile contracts during build to avoid runtime downloads
RUN npx hardhat compile

# Make start script executable
RUN chmod +x start.sh

# Cloud Run expects port 8080 by default
ENV PORT=8080

# Command to run
CMD ["./start.sh"]
