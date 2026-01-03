import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import { z } from 'zod';

const Env = z.object({
  RPC_URL: z.string().min(1),
  ESCROW_ADDRESS: z.string().min(1),
  PORT: z.string().optional(),
});

const env = Env.parse(process.env);

const PORT = Number(env.PORT || 8787);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const provider = new ethers.JsonRpcProvider(env.RPC_URL);

// ABI fragment (only the events + view we need)
const ABI = [
  "event EscrowCreated(bytes32 indexed escrowId,address indexed payer,address indexed payee,address arbiter,uint256 amount,uint64 deadline)",
  "event EscrowReleased(bytes32 indexed escrowId,address indexed to,uint256 amount)",
  "event EscrowRefunded(bytes32 indexed escrowId,address indexed to,uint256 amount)",
  "function escrows(bytes32) view returns (address payer,address payee,address arbiter,uint256 amount,uint64 deadline,uint8 status)"
];

const escrow = new ethers.Contract(env.ESCROW_ADDRESS, ABI, provider);

// In-memory store (hackathon-friendly). For production, persist to DB.
const events = [];
const MAX_EVENTS = 500;

function pushEvent(e) {
  events.unshift(e);
  if (events.length > MAX_EVENTS) events.pop();
}

// Live listeners
escrow.on("EscrowCreated", (escrowId, payer, payee, arbiter, amount, deadline, log) => {
  pushEvent({
    type: "EscrowCreated",
    escrowId,
    payer,
    payee,
    arbiter,
    amount: amount.toString(),
    deadline: Number(deadline),
    txHash: log.transactionHash,
    blockNumber: log.blockNumber,
    ts: Date.now()
  });
});

escrow.on("EscrowReleased", (escrowId, to, amount, log) => {
  pushEvent({
    type: "EscrowReleased",
    escrowId,
    to,
    amount: amount.toString(),
    txHash: log.transactionHash,
    blockNumber: log.blockNumber,
    ts: Date.now()
  });
});

escrow.on("EscrowRefunded", (escrowId, to, amount, log) => {
  pushEvent({
    type: "EscrowRefunded",
    escrowId,
    to,
    amount: amount.toString(),
    txHash: log.transactionHash,
    blockNumber: log.blockNumber,
    ts: Date.now()
  });
});

app.get('/health', (_req, res) => res.json({ ok: true, network: "ethereum", escrow: env.ESCROW_ADDRESS }));

app.get('/events', (_req, res) => res.json({ events }));

app.get('/escrow/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id.startsWith("0x") || id.length !== 66) return res.status(400).json({ error: "escrowId must be 32-byte hex (0x...)" });
    const e = await escrow.escrows(id);
    res.json({
      escrowId: id,
      payer: e.payer,
      payee: e.payee,
      arbiter: e.arbiter,
      amount: e.amount.toString(),
      deadline: Number(e.deadline),
      status: Number(e.status),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Paymesh backend running on http://localhost:${PORT}`);
  console.log(`Escrow: ${env.ESCROW_ADDRESS}`);
});
