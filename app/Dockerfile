FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Environment variables must be passed as build args
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_RPC_URL
ARG NEXT_PUBLIC_ESCROW_ADDRESS
ARG NEXT_PUBLIC_CHAIN_ID=31337
ARG NEXT_PUBLIC_MNEE_TOKEN

ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL
ENV NEXT_PUBLIC_ESCROW_ADDRESS=$NEXT_PUBLIC_ESCROW_ADDRESS
ENV NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID
ENV NEXT_PUBLIC_MNEE_TOKEN=$NEXT_PUBLIC_MNEE_TOKEN

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

CMD ["npm", "start"]
