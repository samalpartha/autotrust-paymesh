import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import { z } from 'zod';
import OpenAI from 'openai';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import { SYSTEM_CONTEXT, KNOWLEDGE_BASE, buildContextForQuery, getQuickAnswer } from './knowledge-base.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const Env = z.object({
  RPC_URL: z.string().min(1),
  ESCROW_ADDRESS: z.string().min(1),
  PORT: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().optional(),
});

const env = Env.parse(process.env);
const PORT = Number(env.PORT || 8787);

// AI clients (Groq preferred for speed, OpenAI as fallback)
const groq = env.GROQ_API_KEY ? new OpenAI({
  apiKey: env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
}) : null;
const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
const AI_ENABLED = !!(groq || openai);
const AI_PROVIDER = groq ? 'Groq Llama 3.3' : openai ? 'OpenAI GPT-4' : 'Rule-based';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ============================================================================
// SWAGGER API DOCUMENTATION
// ============================================================================
const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin-bottom: 30px }
    .swagger-ui .info .title { color: #6366f1; font-size: 2.5em }
    .swagger-ui .info .description { font-size: 1.1em; line-height: 1.6 }
    .swagger-ui .opblock-tag { font-size: 1.3em; border-bottom: 2px solid #6366f1 }
    .swagger-ui .opblock.opblock-get { background: rgba(97, 175, 254, 0.1); border-color: #61affe }
    .swagger-ui .opblock.opblock-post { background: rgba(73, 204, 144, 0.1); border-color: #49cc90 }
  `,
  customSiteTitle: 'AutoTrust Paymesh API',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

// Redirect /docs to /api-docs for convenience
app.get('/docs', (req, res) => res.redirect('/api-docs'));


// Also serve the raw OpenAPI spec as JSON
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

const provider = new ethers.JsonRpcProvider(env.RPC_URL);

// ============================================================================
// CONTRACT SETUP
// ============================================================================

const ABI = [
  "event EscrowCreated(bytes32 indexed escrowId,address indexed payer,address indexed payee,address arbiter,uint256 amount,uint64 deadline,bytes32 metadataHash)",
  "event EscrowReleased(bytes32 indexed escrowId,address indexed to,uint256 amount,uint256 remaining)",
  "event EscrowRefunded(bytes32 indexed escrowId,address indexed to,uint256 amount)",
  "event EscrowDisputed(bytes32 indexed escrowId,address indexed disputedBy,uint64 disputedAt)",
  "event DisputeResolved(bytes32 indexed escrowId,address indexed resolvedBy,bool releasedToPayee,uint256 amount)",
  "function escrows(bytes32) view returns (address payer,address payee,address arbiter,uint256 amount,uint256 releasedAmount,uint64 deadline,bytes32 metadataHash,uint8 status,bool disputeActive)",
  "function release(bytes32 escrowId)",
  "function refund(bytes32 escrowId)"
];

const escrow = new ethers.Contract(env.ESCROW_ADDRESS, ABI, provider);

// ============================================================================
// IN-MEMORY STORES
// ============================================================================

const events = [];
const MAX_EVENTS = 1000;
const escrowMetadata = new Map();
const agentDecisions = [];
const copilotHistory = [];
const webhookLogs = [];

// ============================================================================
// NEW: NEGOTIATION STORAGE (Real Backend State)
// ============================================================================
const negotiations = new Map();
const negotiationHistory = [];

// ============================================================================
// NEW: AGENT REPUTATION REGISTRY (Real Backend State)
// ============================================================================
const agentRegistry = new Map();
const reputationHistory = [];

// ============================================================================
// NEW: STREAMING PAYMENTS (Real Backend State)
// ============================================================================
const activeStreams = new Map();
const streamHistory = [];
const streamingWallets = new Map(); // Track wallet balances for streaming: address -> balance

// Initialize or get streaming wallet balance (starts at 100 MNEE for demo)
function getStreamingWalletBalance(address) {
  if (!streamingWallets.has(address)) {
    streamingWallets.set(address, 100); // Initial balance
  }
  return streamingWallets.get(address);
}

function deductFromStreamingWallet(address, amount) {
  const current = getStreamingWalletBalance(address);
  const newBalance = Math.max(0, current - amount);
  streamingWallets.set(address, newBalance);
  return newBalance;
}

function refundToStreamingWallet(address, amount) {
  const current = getStreamingWalletBalance(address);
  streamingWallets.set(address, current + amount);
  return streamingWallets.get(address);
}

// ============================================================================
// NEW: CHAINED ESCROWS (Real Backend State)
// ============================================================================
const chainedEscrows = new Map(); // escrowId -> { parentId, childIds }

// ============================================================================
// NEW: DISPUTE ARBITRATION (Real Backend State)
// ============================================================================
const disputeEvidence = new Map(); // escrowId -> { claimant: [], respondent: [], aiAnalysis }
const arbitrationHistory = [];

// Policy documents for RAG context
const policyDocuments = [
  {
    id: "policy-release",
    title: "Release Policy",
    content: "Release funds when: (1) Service has been delivered and confirmed by evidence, (2) Arbiter or automated system approves based on delivery proof, (3) No active disputes with valid claims. For high-value escrows (>10000 MNEE), require additional verification such as signed delivery confirmation or multiple evidence submissions."
  },
  {
    id: "policy-refund",
    title: "Refund Policy",
    content: "Refund funds when: (1) Service was not delivered by the deadline and no extension was agreed, (2) Quality dispute with substantial evidence showing non-conformance, (3) Mutual agreement between payer and payee, (4) Fraud indicators detected. Arbiter can expedite refunds for urgent consumer protection cases."
  },
  {
    id: "policy-risk",
    title: "Risk Assessment Framework",
    content: "High risk indicators require human review: (1) First-time participants with no transaction history, (2) Amount exceeds 50000 MNEE, (3) Deadline less than 24 hours from creation, (4) Multiple disputes involving same addresses, (5) Mismatched evidence or conflicting claims, (6) Velocity anomalies suggesting fraud patterns."
  },
  {
    id: "policy-agents",
    title: "Multi-Agent Decision Protocol",
    content: "Three AI agents collaborate on each decision: COMPLIANCE_AGENT evaluates regulatory and fraud risk, OPERATIONS_AGENT assesses delivery status and customer satisfaction, ARBITER_AGENT synthesizes inputs and makes final recommendation. Consensus across agents increases confidence. Disagreement triggers escalation to human arbiter."
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function pushEvent(e) {
  events.unshift(e);
  if (events.length > MAX_EVENTS) events.pop();
  triggerWebhooks(e);
}

function getEscrowMeta(escrowId) {
  if (!escrowMetadata.has(escrowId)) {
    escrowMetadata.set(escrowId, {
      notes: [],
      evidence: [],
      voiceTranscripts: [],
      agentDecisions: [],
      timeline: [],
      serviceDescription: '',
      deliverables: []
    });
  }
  return escrowMetadata.get(escrowId);
}

function addToTimeline(escrowId, entry) {
  const meta = getEscrowMeta(escrowId);
  meta.timeline.push({ ...entry, timestamp: Date.now() });
}

async function triggerWebhooks(event) {
  if (env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🔔 *${event.type}*\nEscrow: \`${event.escrowId?.slice(0, 18)}...\`\nAmount: ${ethers.formatUnits(BigInt(event.amount || 0), 18)} MNEE`
        })
      });
      webhookLogs.push({ target: 'slack', event: event.type, status: 'sent', ts: Date.now() });
    } catch (err) {
      webhookLogs.push({ target: 'slack', event: event.type, status: 'failed', error: String(err), ts: Date.now() });
    }
  }
  webhookLogs.push({ target: 'internal', event: event.type, ts: Date.now() });
  if (webhookLogs.length > 200) webhookLogs.shift();
}

// ============================================================================
// REAL AI AGENT SYSTEM (OpenAI-Powered)
// ============================================================================

const AGENT_SYSTEM_PROMPT = `You are an AI escrow arbiter for AutoTrust Paymesh, an MNEE stablecoin escrow system.

Your role is to analyze escrow transactions and recommend actions: RELEASE (pay the service provider), REFUND (return funds to payer), or HOLD (request more information).

DECISION FRAMEWORK:
1. RELEASE: When evidence shows service was delivered as agreed
2. REFUND: When deadline passed without delivery, or fraud/quality issues proven
3. HOLD: When evidence is insufficient or conflicting

Always provide:
- A clear ACTION (RELEASE, REFUND, or HOLD)
- CONFIDENCE score (0.0-1.0)
- RATIONALE explaining your decision
- RISK_FLAGS if any concerns exist

Be decisive. Real money is at stake. Protect both buyers and sellers fairly.`;

async function runAIAgentDecision(escrowId, escrowData, meta, context = {}) {
  const amount = parseFloat(ethers.formatUnits(escrowData.amount || 0n, 18));
  const deadline = Number(escrowData.deadline);
  const isPastDeadline = Date.now() > deadline * 1000;
  const hoursRemaining = (deadline * 1000 - Date.now()) / (1000 * 60 * 60);

  // Build context for AI
  const escrowContext = {
    escrowId,
    amount: `${amount} MNEE`,
    payer: escrowData.payer,
    payee: escrowData.payee,
    arbiter: escrowData.arbiter,
    deadline: new Date(deadline * 1000).toISOString(),
    isPastDeadline,
    hoursRemaining: hoursRemaining.toFixed(1),
    status: ['NONE', 'FUNDED', 'RELEASED', 'REFUNDED'][escrowData.status],
    evidenceCount: meta.evidence.length,
    evidenceSummary: meta.evidence.map(e => e.classification || 'unclassified').join(', ') || 'none',
    voiceEscalations: meta.voiceTranscripts.length,
    serviceDescription: meta.serviceDescription || 'Not specified',
    notes: meta.notes.slice(-3).join('; ') || 'none'
  };

  // If AI is available (Groq preferred, OpenAI fallback), use real AI
  const aiClient = groq || openai;
  const modelName = groq ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

  if (AI_ENABLED && aiClient) {
    try {
      const response = await aiClient.chat.completions.create({
        model: modelName,
        messages: [
          { role: "system", content: AGENT_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analyze this escrow and provide your decision:

ESCROW DETAILS:
${JSON.stringify(escrowContext, null, 2)}

POLICIES:
${policyDocuments.map(p => `- ${p.title}: ${p.content}`).join('\n')}

${context.voiceEscalation ? 'NOTE: Customer has escalated via voice call - prioritize resolution.' : ''}
${context.additionalContext ? `ADDITIONAL CONTEXT: ${context.additionalContext}` : ''}

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "action": "RELEASE" | "REFUND" | "HOLD",
  "confidence": 0.0-1.0,
  "rationale": "explanation",
  "risk_flags": ["flag1", "flag2"],
  "agent_analysis": {
    "compliance": "assessment",
    "operations": "assessment", 
    "final_verdict": "summary"
  }
}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      let aiResult;
      const content = response.choices[0].message.content;
      // Handle potential markdown code blocks from Groq/Llama
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[1]);
      } else {
        aiResult = JSON.parse(content);
      }

      return {
        escrowId,
        timestamp: Date.now(),
        aiPowered: true,
        model: modelName,
        provider: groq ? 'Groq' : 'OpenAI',
        recommendation: aiResult.action,
        confidence: aiResult.confidence,
        rationale: aiResult.rationale,
        riskFlags: aiResult.risk_flags || [],
        agentAnalysis: aiResult.agent_analysis || {},
        context: escrowContext,
        executed: false
      };
    } catch (err) {
      console.error("AI Agent error:", err.message);
      // Fall back to rule-based
    }
  }

  // Rule-based fallback (no API key or error)
  return runRuleBasedDecision(escrowId, escrowContext, meta);
}

function runRuleBasedDecision(escrowId, ctx, meta) {
  let action = 'HOLD';
  let confidence = 0.5;
  const rationale = [];
  const riskFlags = [];

  const amount = parseFloat(ctx.amount);
  const isPastDeadline = ctx.isPastDeadline;
  const hasEvidence = meta.evidence.length > 0;
  const hasDeliveryProof = meta.evidence.some(e => e.classification === 'delivery_confirmed');

  // Risk assessment
  if (amount > 50000) riskFlags.push('high_value');
  if (amount > 10000) riskFlags.push('medium_value');
  if (parseFloat(ctx.hoursRemaining) < 24 && !isPastDeadline) riskFlags.push('urgent');
  if (meta.voiceTranscripts.length > 0) riskFlags.push('voice_escalation');
  if (!hasEvidence && amount > 1000) riskFlags.push('no_evidence');

  // Decision logic
  if (hasDeliveryProof && riskFlags.length === 0) {
    action = 'RELEASE';
    confidence = 0.9;
    rationale.push('Delivery confirmed with evidence');
  } else if (hasDeliveryProof && riskFlags.length > 0) {
    action = 'RELEASE';
    confidence = 0.7;
    rationale.push('Delivery confirmed but risk flags present');
  } else if (isPastDeadline && !hasDeliveryProof) {
    action = 'REFUND';
    confidence = 0.85;
    rationale.push('Deadline passed without delivery confirmation');
  } else if (riskFlags.includes('high_value')) {
    action = 'HOLD';
    confidence = 0.6;
    rationale.push('High-value transaction requires additional review');
  } else {
    rationale.push('Awaiting more information');
  }

  return {
    escrowId,
    timestamp: Date.now(),
    aiPowered: false,
    model: "rule-based-v1",
    recommendation: action,
    confidence,
    rationale: rationale.join('. '),
    riskFlags,
    agentAnalysis: {
      compliance: riskFlags.length > 2 ? 'high_risk' : riskFlags.length > 0 ? 'medium_risk' : 'low_risk',
      operations: isPastDeadline ? 'deadline_expired' : 'in_progress',
      final_verdict: action
    },
    context: ctx,
    executed: false
  };
}

// ============================================================================
// REAL RAG COPILOT (OpenAI-Powered)
// ============================================================================

// ============================================================================
// MESHMIND - INTELLIGENT KNOWLEDGE ASSISTANT
// ============================================================================

async function processMeshMindQuery(query) {
  // Get live stats
  const liveStats = events.reduce((acc, e) => {
    if (e.type === 'EscrowCreated') acc.created++;
    if (e.type === 'EscrowReleased') acc.released++;
    if (e.type === 'EscrowRefunded') acc.refunded++;
    return acc;
  }, { created: 0, released: 0, refunded: 0 });

  // Check for quick answer from knowledge base
  const quickAnswer = getQuickAnswer(query);
  if (quickAnswer) {
    copilotHistory.push({ query, answer: quickAnswer, aiPowered: false, timestamp: Date.now() });
    return {
      query,
      answer: quickAnswer,
      aiPowered: false,
      provider: 'Knowledge Base',
      stats: liveStats,
      timestamp: Date.now()
    };
  }

  // Build contextual knowledge
  const context = buildContextForQuery(query, liveStats);

  // Try AI providers (Groq first, then OpenAI)
  const aiClient = groq || openai;
  if (aiClient) {
    try {
      const response = await aiClient.chat.completions.create({
        model: groq ? "llama-3.3-70b-versatile" : "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `${SYSTEM_CONTEXT}

KNOWLEDGE BASE CONTEXT:
${context}

LIVE STATISTICS:
- ${liveStats.created} escrows created
- ${liveStats.released} released  
- ${liveStats.refunded} refunded
- Success rate: ${liveStats.created > 0 ? ((liveStats.released / liveStats.created) * 100).toFixed(1) : 0}%

RECENT ACTIVITY:
${events.slice(0, 5).map(e => `- ${e.type}: ${e.escrowId?.slice(0, 10)}... (${e.amount ? (Number(e.amount) / 1e18).toFixed(2) + ' MNEE' : ''})`).join('\n') || 'No recent events'}

Instructions:
- Be concise but thorough
- Use bullet points for lists
- Reference specific features when relevant
- If asked about something outside the app, politely redirect to app-related topics`
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const answer = response.choices[0].message.content;

      copilotHistory.push({ query, answer, aiPowered: true, timestamp: Date.now() });

      return {
        query,
        answer,
        aiPowered: true,
        provider: AI_PROVIDER,
        stats: liveStats,
        timestamp: Date.now()
      };
    } catch (err) {
      console.error("MeshMind AI error:", err.message);
    }
  }

  // Intelligent fallback with knowledge base
  return processMeshMindFallback(query, liveStats);
}

function processMeshMindFallback(query, stats) {
  const q = query.toLowerCase();
  let answer = '';

  // Smart pattern matching with knowledge base
  if (q.includes('what is') && (q.includes('autotrust') || q.includes('paymesh') || q.includes('this'))) {
    answer = KNOWLEDGE_BASE.product.description;
  } else if (q.includes('how') && q.includes('create')) {
    answer = `**How to Create an Escrow:**\n${KNOWLEDGE_BASE.flows.createEscrow.steps.map((s, i) => s).join('\n')}\n\n**Tips:** ${KNOWLEDGE_BASE.flows.createEscrow.tips.join(', ')}`;
  } else if (q.includes('release') && (q.includes('how') || q.includes('who'))) {
    answer = `**Release Funds:**\n${KNOWLEDGE_BASE.flows.releaseFlow.steps.join('\n')}\n\n**Note:** ${KNOWLEDGE_BASE.flows.releaseFlow.requirements.join(', ')}`;
  } else if (q.includes('refund')) {
    answer = `**Refund Policy:**\n${KNOWLEDGE_BASE.policies.refund.content}`;
  } else if (q.includes('arbiter') || q.includes('who can')) {
    answer = `**Arbiter Role:** ${KNOWLEDGE_BASE.escrow.roles.arbiter}\n\n**Key Point:** Only the arbiter can release funds. After the deadline, the payer can also refund.`;
  } else if (q.includes('dispute')) {
    answer = `**Dispute Resolution:**\n${KNOWLEDGE_BASE.flows.disputeFlow.steps.join('\n')}\n\n${KNOWLEDGE_BASE.policies.dispute.content}`;
  } else if (q.includes('ai') || q.includes('agent')) {
    const agents = KNOWLEDGE_BASE.aiAgents.agents;
    answer = `**AI Agent System:**\n${KNOWLEDGE_BASE.aiAgents.overview}\n\n**Agents:**\n- **Compliance:** ${agents.complianceAgent.role}\n- **Operations:** ${agents.opsAgent.role}\n- **Arbiter:** ${agents.arbiterAgent.role}`;
  } else if (q.includes('mnee') || q.includes('token')) {
    answer = `**MNEE Token:** ${KNOWLEDGE_BASE.mnee.description}\n\n**Get MNEE:** ${KNOWLEDGE_BASE.mnee.howToGet.join(', ')}\n\n**Swap:** ${KNOWLEDGE_BASE.mnee.swap}`;
  } else if (q.includes('summary') || q.includes('stats') || q.includes('overview')) {
    const rate = stats.created > 0 ? ((stats.released / stats.created) * 100).toFixed(1) : 0;
    answer = `**Escrow Summary:**\n- 📝 Created: ${stats.created}\n- ✅ Released: ${stats.released}\n- ↩️ Refunded: ${stats.refunded}\n- 📊 Success Rate: ${rate}%`;
  } else if (q.includes('safe') || q.includes('secure')) {
    answer = `**Security:**\n${KNOWLEDGE_BASE.architecture.security.map(s => `- ${s}`).join('\n')}\n\n**Contract Security:**\n${KNOWLEDGE_BASE.escrow.security.map(s => `- ${s}`).join('\n')}`;
  } else if (q.includes('deadline')) {
    answer = `**Deadline Policy:**\n${KNOWLEDGE_BASE.policies.deadlines.content}`;
  } else if (q.includes('help') || q.includes('can you')) {
    answer = `**I'm MeshMind, your AutoTrust assistant!** I can help with:\n\n• **Creating escrows** - "How do I create an escrow?"\n• **Releases & refunds** - "Who can release funds?"\n• **Disputes** - "How do disputes work?"\n• **AI agents** - "Tell me about AI agents"\n• **Policies** - "What's the refund policy?"\n• **MNEE token** - "How do I get MNEE?"\n• **Statistics** - "Show me escrow stats"\n• **Security** - "Is my money safe?"\n\nJust ask naturally!`;
  } else {
    answer = `I'm MeshMind, your AutoTrust knowledge assistant! 🧠\n\nI can help you understand:\n- **Escrow operations** (create, release, refund)\n- **Policies** (release, refund, disputes)\n- **AI agent system**\n- **MNEE token**\n- **Security & architecture**\n\nTry asking: "How do I create an escrow?" or "What is the refund policy?"`;
  }

  copilotHistory.push({ query, answer, aiPowered: false, timestamp: Date.now() });

  return {
    query,
    answer,
    aiPowered: false,
    provider: 'Knowledge Base',
    stats,
    timestamp: Date.now()
  };
}

// ============================================================================
// AUTONOMOUS AGENT DEMO ENDPOINT
// ============================================================================

// This simulates an AI agent autonomously evaluating and executing escrow decisions
app.post('/agent/autonomous-demo', async (req, res) => {
  try {
    const { escrowId, serviceProof, signerPrivateKey } = req.body;

    if (!escrowId) {
      return res.status(400).json({ error: "escrowId required" });
    }

    // Step 1: Fetch escrow data
    const e = await escrow.escrows(escrowId);
    const escrowData = {
      payer: e.payer,
      payee: e.payee,
      arbiter: e.arbiter,
      amount: e.amount,
      deadline: e.deadline,
      status: Number(e.status)
    };

    if (escrowData.status !== 1) {
      return res.status(400).json({ error: "Escrow is not in FUNDED state" });
    }

    // Step 2: If service proof provided, add as evidence
    const meta = getEscrowMeta(escrowId);
    if (serviceProof) {
      meta.evidence.push({
        type: 'service_proof',
        classification: serviceProof.success ? 'delivery_confirmed' : 'delivery_failed',
        description: serviceProof.description || 'Automated service verification',
        data: serviceProof.data,
        timestamp: Date.now()
      });
      addToTimeline(escrowId, { type: 'evidence_added', source: 'autonomous_agent' });
    }

    // Step 3: AI Agent makes decision
    const decision = await runAIAgentDecision(escrowId, escrowData, meta, {
      additionalContext: 'Autonomous agent evaluation triggered'
    });

    agentDecisions.unshift(decision);
    meta.agentDecisions.push(decision);
    addToTimeline(escrowId, { type: 'agent_decision', decision });

    // Step 4: If high confidence and signer provided, execute on-chain
    let execution = null;
    if (signerPrivateKey && decision.confidence >= 0.8 && decision.recommendation !== 'HOLD') {
      try {
        const wallet = new ethers.Wallet(signerPrivateKey, provider);
        const escrowWithSigner = escrow.connect(wallet);

        let tx;
        if (decision.recommendation === 'RELEASE') {
          tx = await escrowWithSigner.release(escrowId);
        } else if (decision.recommendation === 'REFUND') {
          tx = await escrowWithSigner.refund(escrowId);
        }

        if (tx) {
          await tx.wait();
          decision.executed = true;
          execution = {
            action: decision.recommendation,
            txHash: tx.hash,
            gasUsed: 'pending'
          };
          addToTimeline(escrowId, { type: 'autonomous_execution', ...execution });
        }
      } catch (execErr) {
        execution = { error: String(execErr) };
      }
    }

    res.json({
      success: true,
      message: "Autonomous agent completed analysis",
      aiPowered: decision.aiPowered,
      decision: {
        recommendation: decision.recommendation,
        confidence: decision.confidence,
        rationale: decision.rationale,
        riskFlags: decision.riskFlags
      },
      execution,
      escrowId
    });

  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ============================================================================
// EVENT POLLING (works better with Hardhat than websocket subscriptions)
// ============================================================================

let lastBlock = 0;
const seenTxHashes = new Set();

async function pollEvents() {
  try {
    const currentBlock = await provider.getBlockNumber();
    if (currentBlock <= lastBlock) return;

    const fromBlock = lastBlock === 0 ? 0 : lastBlock + 1;

    // Query EscrowCreated events
    const createdFilter = escrow.filters.EscrowCreated();
    const createdLogs = await escrow.queryFilter(createdFilter, fromBlock, currentBlock);

    for (const log of createdLogs) {
      if (seenTxHashes.has(log.transactionHash)) continue;
      seenTxHashes.add(log.transactionHash);

      const { escrowId, payer, payee, arbiter, amount, deadline, metadataHash } = log.args;
      console.log(`📥 Event: EscrowCreated - ${escrowId}`);
      pushEvent({
        type: "EscrowCreated",
        escrowId,
        payer,
        payee,
        arbiter,
        amount: amount.toString(),
        metadataHash,
        deadline: Number(deadline),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        ts: Date.now()
      });
      addToTimeline(escrowId, { type: 'chain_event', event: 'created' });
    }

    // Query EscrowReleased events
    const releasedFilter = escrow.filters.EscrowReleased();
    const releasedLogs = await escrow.queryFilter(releasedFilter, fromBlock, currentBlock);

    for (const log of releasedLogs) {
      if (seenTxHashes.has(log.transactionHash)) continue;
      seenTxHashes.add(log.transactionHash);

      const { escrowId, to, amount } = log.args;
      console.log(`📥 Event: EscrowReleased - ${escrowId}`);
      pushEvent({
        type: "EscrowReleased",
        escrowId,
        to,
        amount: amount.toString(),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        ts: Date.now()
      });
      addToTimeline(escrowId, { type: 'chain_event', event: 'released' });
    }

    // Query EscrowRefunded events
    const refundedFilter = escrow.filters.EscrowRefunded();
    const refundedLogs = await escrow.queryFilter(refundedFilter, fromBlock, currentBlock);

    for (const log of refundedLogs) {
      if (seenTxHashes.has(log.transactionHash)) continue;
      seenTxHashes.add(log.transactionHash);

      const { escrowId, to, amount } = log.args;
      console.log(`📥 Event: EscrowRefunded - ${escrowId}`);
      pushEvent({
        type: "EscrowRefunded",
        escrowId,
        to,
        amount: amount.toString(),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        ts: Date.now()
      });
      addToTimeline(escrowId, { type: 'chain_event', event: 'refunded' });
    }

    // Query EscrowDisputed events
    const disputedFilter = escrow.filters.EscrowDisputed();
    const disputedLogs = await escrow.queryFilter(disputedFilter, fromBlock, currentBlock);

    for (const log of disputedLogs) {
      if (seenTxHashes.has(log.transactionHash)) continue;
      seenTxHashes.add(log.transactionHash);

      const { escrowId, disputedBy, disputedAt } = log.args;
      console.log(`📥 Event: EscrowDisputed - ${escrowId}`);
      pushEvent({
        type: "EscrowDisputed",
        escrowId,
        disputedBy,
        disputedAt: Number(disputedAt),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        ts: Date.now()
      });
      addToTimeline(escrowId, { type: 'chain_event', event: 'disputed' });
    }

    // Query DisputeResolved events
    const resolvedFilter = escrow.filters.DisputeResolved();
    const resolvedLogs = await escrow.queryFilter(resolvedFilter, fromBlock, currentBlock);

    for (const log of resolvedLogs) {
      if (seenTxHashes.has(log.transactionHash)) continue;
      seenTxHashes.add(log.transactionHash);

      const { escrowId, resolvedBy, releasedToPayee, amount } = log.args;
      console.log(`📥 Event: DisputeResolved - ${escrowId}`);
      pushEvent({
        type: "DisputeResolved",
        escrowId,
        resolvedBy,
        releasedToPayee,
        amount: amount.toString(),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        ts: Date.now()
      });
      addToTimeline(escrowId, { type: 'chain_event', event: releasedToPayee ? 'dispute_released' : 'dispute_refunded' });
    }

    lastBlock = currentBlock;
  } catch (err) {
    // Silently ignore polling errors (connection issues, etc.)
    console.error('Event polling error:', err.message);
  }
}

// Poll every 2 seconds
setInterval(pollEvents, 2000);
// Initial poll
pollEvents();

// ============================================================================
// API ROUTES
// ============================================================================

app.get('/health', (_req, res) => res.json({
  ok: true,
  aiEnabled: AI_ENABLED,
  aiProvider: AI_PROVIDER,
  network: "ethereum",
  escrow: env.ESCROW_ADDRESS,
  features: [
    'events',
    'meshmind-assistant',
    'ai-agent',
    'autonomous-execution',
    'webhooks',
    'real-analytics',
    'negotiation-sandbox',
    'agent-reputation',
    'streaming-payments',
    'chained-escrows',
    'ai-arbitration'
  ],
  stats: {
    activeStreams: activeStreams.size,
    registeredAgents: agentRegistry.size,
    negotiations: negotiations.size,
    pendingDisputes: Array.from(disputeEvidence.values()).filter(v => v.status === 'pending').length
  }
}));

app.get('/events', (_req, res) => res.json({ events }));

// Force rescan all events from block 0
app.post('/events/rescan', async (req, res) => {
  try {
    console.log('🔄 Force rescanning all events from block 0...');

    // Reset state
    const oldCount = events.length;
    events.length = 0;
    seenTxHashes.clear();

    const currentBlock = await provider.getBlockNumber();

    // Query all event types from block 0
    const createdFilter = escrow.filters.EscrowCreated();
    const createdLogs = await escrow.queryFilter(createdFilter, 0, currentBlock);

    for (const log of createdLogs) {
      seenTxHashes.add(log.transactionHash);
      const { escrowId, payer, payee, arbiter, amount, deadline, metadataHash } = log.args;
      pushEvent({
        type: "EscrowCreated",
        escrowId,
        payer,
        payee,
        arbiter,
        amount: amount.toString(),
        metadataHash,
        deadline: Number(deadline),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        ts: Date.now() - ((currentBlock - log.blockNumber) * 12000) // Approximate timestamp
      });
    }

    const releasedFilter = escrow.filters.EscrowReleased();
    const releasedLogs = await escrow.queryFilter(releasedFilter, 0, currentBlock);

    for (const log of releasedLogs) {
      seenTxHashes.add(log.transactionHash);
      const { escrowId, to, amount } = log.args;
      pushEvent({
        type: "EscrowReleased",
        escrowId,
        to,
        amount: amount.toString(),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        ts: Date.now() - ((currentBlock - log.blockNumber) * 12000)
      });
    }

    const refundedFilter = escrow.filters.EscrowRefunded();
    const refundedLogs = await escrow.queryFilter(refundedFilter, 0, currentBlock);

    for (const log of refundedLogs) {
      seenTxHashes.add(log.transactionHash);
      const { escrowId, to, amount } = log.args;
      pushEvent({
        type: "EscrowRefunded",
        escrowId,
        to,
        amount: amount.toString(),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        ts: Date.now() - ((currentBlock - log.blockNumber) * 12000)
      });
    }

    const disputedFilter = escrow.filters.EscrowDisputed();
    const disputedLogs = await escrow.queryFilter(disputedFilter, 0, currentBlock);

    for (const log of disputedLogs) {
      seenTxHashes.add(log.transactionHash);
      const { escrowId, disputedBy, disputedAt } = log.args;
      pushEvent({
        type: "EscrowDisputed",
        escrowId,
        disputedBy,
        disputedAt: Number(disputedAt),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        ts: Date.now() - ((currentBlock - log.blockNumber) * 12000)
      });
    }

    lastBlock = currentBlock;

    console.log(`✅ Rescan complete: ${events.length} events found (was ${oldCount})`);
    res.json({
      success: true,
      message: `Rescanned ${events.length} events from block 0 to ${currentBlock}`,
      events: events.length,
      created: createdLogs.length,
      released: releasedLogs.length,
      refunded: refundedLogs.length,
      disputed: disputedLogs.length
    });
  } catch (err) {
    console.error('Rescan error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/escrow/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id.startsWith("0x") || id.length !== 66) {
      return res.status(400).json({ error: "escrowId must be 32-byte hex (0x...)" });
    }
    const e = await escrow.escrows(id);
    const meta = getEscrowMeta(id);
    res.json({
      escrowId: id,
      payer: e.payer,
      payee: e.payee,
      arbiter: e.arbiter,
      amount: e.amount.toString(),
      deadline: Number(e.deadline),
      status: Number(e.status),
      metadata: meta
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// AI Agent endpoints
app.post('/agent/decision/:escrowId', async (req, res) => {
  try {
    const { escrowId } = req.params;
    const context = req.body || {};

    const e = await escrow.escrows(escrowId);
    const escrowData = {
      payer: e.payer,
      payee: e.payee,
      arbiter: e.arbiter,
      amount: e.amount,
      deadline: e.deadline,
      status: Number(e.status)
    };

    if (escrowData.status === 0) {
      return res.status(404).json({ error: "Escrow not found" });
    }

    const meta = getEscrowMeta(escrowId);
    const decision = await runAIAgentDecision(escrowId, escrowData, meta, context);

    // Remove any existing decision for this escrow (prevent duplicates)
    const existingIndex = agentDecisions.findIndex(d => d.escrowId === escrowId);
    if (existingIndex !== -1) {
      agentDecisions.splice(existingIndex, 1);
    }

    agentDecisions.unshift(decision);
    meta.agentDecisions = [decision]; // Replace, don't append
    addToTimeline(escrowId, { type: 'agent_decision', decision });

    res.json({ success: true, decision, updated: existingIndex !== -1 });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/agent/execute/:escrowId', async (req, res) => {
  try {
    const { escrowId } = req.params;
    const { action, signerPrivateKey } = req.body;

    if (!action || !['RELEASE', 'REFUND'].includes(action)) {
      return res.status(400).json({ error: "Action must be RELEASE or REFUND" });
    }

    if (!signerPrivateKey) {
      return res.status(400).json({ error: "Signer private key required" });
    }

    const wallet = new ethers.Wallet(signerPrivateKey, provider);
    const escrowWithSigner = escrow.connect(wallet);

    let tx;
    if (action === 'RELEASE') {
      tx = await escrowWithSigner.release(escrowId);
    } else {
      tx = await escrowWithSigner.refund(escrowId);
    }

    await tx.wait();

    const decision = agentDecisions.find(d => d.escrowId === escrowId && !d.executed);
    if (decision) decision.executed = true;

    addToTimeline(escrowId, { type: 'agent_execution', action, txHash: tx.hash });

    res.json({ success: true, txHash: tx.hash, action });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/agent/decisions', (_req, res) => {
  res.json({ decisions: agentDecisions.slice(0, 50), aiEnabled: AI_ENABLED });
});

// RAG Copilot endpoints
// MeshMind - Intelligent Knowledge Assistant
app.post('/copilot/query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    const result = await processMeshMindQuery(query);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("MeshMind error:", err);
    res.status(500).json({ error: String(err) });
  }
});

app.get('/copilot/suggestions', (_req, res) => {
  res.json({
    suggestions: [
      "What is AutoTrust Paymesh?",
      "How do I create an escrow?",
      "Who can release funds?",
      "What happens after the deadline?",
      "How do disputes work?",
      "Tell me about AI agents",
      "What's the refund policy?",
      "Show escrow statistics",
      "How do I get MNEE tokens?",
      "Is my money safe?"
    ],
    aiEnabled: AI_ENABLED,
    provider: AI_PROVIDER
  });
});

// Evidence & Voice endpoints
app.post('/evidence/:escrowId', async (req, res) => {
  try {
    const { escrowId } = req.params;
    const { imageUrl, tags, classification, description } = req.body;

    const meta = getEscrowMeta(escrowId);
    const evidenceEntry = {
      imageUrl: imageUrl || null,
      tags: tags || [],
      classification: classification || 'unclassified',
      description: description || '',
      timestamp: Date.now()
    };

    meta.evidence.push(evidenceEntry);
    addToTimeline(escrowId, { type: 'evidence_uploaded', ...evidenceEntry });

    res.json({ success: true, evidence: evidenceEntry });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/voice/escalate', async (req, res) => {
  try {
    const { escrowId, transcript, sentiment } = req.body;

    if (!escrowId || !transcript) {
      return res.status(400).json({ error: "escrowId and transcript required" });
    }

    const meta = getEscrowMeta(escrowId);
    meta.voiceTranscripts.push({ transcript, sentiment: sentiment || 'neutral', timestamp: Date.now() });
    addToTimeline(escrowId, { type: 'voice_escalation', sentiment });

    // Trigger AI agent with voice context
    const e = await escrow.escrows(escrowId);
    const decision = await runAIAgentDecision(escrowId, {
      payer: e.payer,
      payee: e.payee,
      arbiter: e.arbiter,
      amount: e.amount,
      deadline: e.deadline,
      status: Number(e.status)
    }, meta, { voiceEscalation: true });

    agentDecisions.unshift(decision);

    res.json({ success: true, message: "Voice escalation recorded", decision });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/timeline/:escrowId', (req, res) => {
  const meta = getEscrowMeta(req.params.escrowId);
  res.json({ timeline: meta.timeline });
});

app.get('/webhooks/logs', (_req, res) => {
  res.json({ logs: webhookLogs.slice(-50) });
});

// Demo data endpoint for showing functionality without wallet
app.get('/demo/sample-escrow', (_req, res) => {
  res.json({
    sampleEscrow: {
      escrowId: "0x" + "a".repeat(64),
      payer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      payee: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      arbiter: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      amount: "5000000000000000000",
      deadline: Math.floor(Date.now() / 1000) + 3600,
      status: 1
    },
    sampleDecision: {
      recommendation: "RELEASE",
      confidence: 0.87,
      rationale: "Delivery confirmed with evidence. Low risk profile. Operations and compliance agents concur.",
      riskFlags: [],
      aiPowered: AI_ENABLED
    },
    howItWorks: [
      "1. Payer creates escrow with MNEE tokens",
      "2. AI agents analyze transaction risk and context",
      "3. Evidence is submitted (delivery proofs, messages)",
      "4. Multi-agent system recommends action",
      "5. Arbiter or autonomous system executes on-chain"
    ]
  });
});

// ============================================================================
// REAL ANALYTICS ENDPOINT (Connected to Contract State)
// ============================================================================

app.get('/analytics', async (_req, res) => {
  try {
    // Query real contract state
    let tvl = 0n;
    try {
      // Try to get TVL from contract
      const tvlResult = await provider.call({
        to: env.ESCROW_ADDRESS,
        data: '0x5d8e5288' // totalValueLocked() selector
      });
      if (tvlResult && tvlResult !== '0x') {
        tvl = BigInt(tvlResult);
      }
    } catch (e) {
      console.log('TVL query failed, using calculated value');
    }

    // Calculate from events if TVL query fails
    const stats = events.reduce((acc, e) => {
      if (e.type === 'EscrowCreated') {
        acc.created++;
        acc.totalVolume += BigInt(e.amount || 0);
      }
      if (e.type === 'EscrowReleased') {
        acc.released++;
        acc.releasedVolume += BigInt(e.amount || 0);
      }
      if (e.type === 'EscrowRefunded') {
        acc.refunded++;
      }
      return acc;
    }, { created: 0, released: 0, refunded: 0, totalVolume: 0n, releasedVolume: 0n });

    // Calculate active escrows and TVL from events
    const activeCount = stats.created - stats.released - stats.refunded;
    const calculatedTVL = stats.totalVolume - stats.releasedVolume;

    // Agent stats
    const uniqueAgents = new Set();
    events.forEach(e => {
      if (e.payer) uniqueAgents.add(e.payer);
      if (e.payee) uniqueAgents.add(e.payee);
      if (e.arbiter) uniqueAgents.add(e.arbiter);
    });

    // AI decisions count
    const aiDecisionCount = agentDecisions.filter(d => d.aiPowered).length;
    const ruleDecisionCount = agentDecisions.filter(d => !d.aiPowered).length;

    // Success rate
    const successRate = stats.created > 0
      ? ((stats.released / stats.created) * 100).toFixed(1)
      : '0';

    // Dispute rate
    const disputeCount = events.filter(e => e.type === 'EscrowDisputed' || e.disputeActive).length;
    const disputeRate = stats.created > 0
      ? ((disputeCount / stats.created) * 100).toFixed(1)
      : '0';

    // Average settlement time (simplified - time between created and released)
    let avgSettlementMs = 0;
    const releasedEvents = events.filter(e => e.type === 'EscrowReleased');
    if (releasedEvents.length > 0) {
      let totalTime = 0;
      releasedEvents.forEach(released => {
        const created = events.find(e => e.type === 'EscrowCreated' && e.escrowId === released.escrowId);
        if (created && released.ts && created.ts) {
          totalTime += (released.ts - created.ts);
        }
      });
      avgSettlementMs = releasedEvents.length > 0 ? totalTime / releasedEvents.length : 0;
    }
    const avgSettlementHours = (avgSettlementMs / (1000 * 60 * 60)).toFixed(1);

    res.json({
      success: true,
      isLive: true,
      source: 'contract+events',
      metrics: {
        tvl: ethers.formatUnits(tvl > 0n ? tvl : calculatedTVL, 18),
        tvlRaw: (tvl > 0n ? tvl : calculatedTVL).toString(),
        totalVolume: ethers.formatUnits(stats.totalVolume, 18),
        totalVolumeRaw: stats.totalVolume.toString(),
        activeEscrows: Math.max(0, activeCount),
        totalEscrows: stats.created,
        releasedEscrows: stats.released,
        refundedEscrows: stats.refunded,
        totalAgents: uniqueAgents.size,
        registeredAgents: agentRegistry.size,
        avgSettlementTime: avgSettlementMs > 0 ? `${avgSettlementHours} hrs` : 'N/A',
        successRate: parseFloat(successRate),
        disputeRate: parseFloat(disputeRate),
        aiDecisions: aiDecisionCount,
        ruleDecisions: ruleDecisionCount,
        totalDecisions: agentDecisions.length,
      },
      recentActivity: events.slice(0, 10).map(e => ({
        type: e.type,
        escrowId: e.escrowId?.slice(0, 10) + '...',
        amount: e.amount ? `${(Number(e.amount) / 1e18).toFixed(2)} MNEE` : null,
        timestamp: e.ts,
        timeAgo: getTimeAgo(e.ts),
      })),
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: String(err) });
  }
});

function getTimeAgo(timestamp) {
  if (!timestamp) return 'unknown';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ============================================================================
// REAL NEGOTIATION ENDPOINTS
// ============================================================================

// Start a new negotiation
app.post('/negotiate/start', async (req, res) => {
  try {
    const { buyerAgent, sellerAgent, task, initialOffer, maxRounds = 5 } = req.body;

    if (!buyerAgent || !sellerAgent || !task || !initialOffer) {
      return res.status(400).json({ error: 'buyerAgent, sellerAgent, task, and initialOffer required' });
    }

    const negotiationId = `neg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const negotiation = {
      id: negotiationId,
      buyerAgent,
      sellerAgent,
      task,
      status: 'negotiating',
      rounds: 1,
      maxRounds,
      currentOffer: {
        amount: parseFloat(initialOffer),
        terms: task,
        by: 'buyer'
      },
      messages: [
        {
          sender: 'system',
          type: 'info',
          content: `Negotiation started between ${buyerAgent.name || buyerAgent} and ${sellerAgent.name || sellerAgent}`,
          timestamp: Date.now()
        },
        {
          sender: 'buyer',
          type: 'proposal',
          content: `I need: "${task}". My budget is ${initialOffer} MNEE.`,
          amount: parseFloat(initialOffer),
          terms: task,
          timestamp: Date.now()
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    negotiations.set(negotiationId, negotiation);
    negotiationHistory.push({ type: 'started', id: negotiationId, ts: Date.now() });

    res.json({
      success: true,
      negotiation,
      message: 'Negotiation started. Use /negotiate/:id/counter to continue.'
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Get negotiation status
app.get('/negotiate/:id', (req, res) => {
  const negotiation = negotiations.get(req.params.id);
  if (!negotiation) {
    return res.status(404).json({ error: 'Negotiation not found' });
  }
  res.json({ success: true, negotiation });
});

// Submit a counter-offer (AI-powered)
app.post('/negotiate/:id/counter', async (req, res) => {
  try {
    const negotiation = negotiations.get(req.params.id);
    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }
    if (negotiation.status !== 'negotiating') {
      return res.status(400).json({ error: `Negotiation is ${negotiation.status}` });
    }

    const { amount, terms, by } = req.body;

    if (!amount || !by) {
      return res.status(400).json({ error: 'amount and by (buyer/seller) required' });
    }

    negotiation.rounds++;
    negotiation.currentOffer = { amount: parseFloat(amount), terms: terms || negotiation.task, by };
    negotiation.updatedAt = Date.now();

    negotiation.messages.push({
      sender: by,
      type: 'counter',
      content: terms || `Counter-offer: ${amount} MNEE`,
      amount: parseFloat(amount),
      terms: terms || negotiation.task,
      timestamp: Date.now()
    });

    // Check if max rounds reached
    if (negotiation.rounds >= negotiation.maxRounds) {
      negotiation.status = 'timeout';
      negotiation.messages.push({
        sender: 'system',
        type: 'info',
        content: 'Maximum rounds reached. Negotiation timed out.',
        timestamp: Date.now()
      });
    }

    negotiations.set(req.params.id, negotiation);

    res.json({ success: true, negotiation });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Accept the current offer
app.post('/negotiate/:id/accept', async (req, res) => {
  try {
    const negotiation = negotiations.get(req.params.id);
    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }
    if (negotiation.status !== 'negotiating') {
      return res.status(400).json({ error: `Negotiation is ${negotiation.status}` });
    }

    const { by } = req.body;

    negotiation.status = 'agreed';
    negotiation.updatedAt = Date.now();
    negotiation.agreedTerms = {
      amount: negotiation.currentOffer.amount,
      terms: negotiation.currentOffer.terms,
      agreedBy: by,
      agreedAt: Date.now()
    };

    negotiation.messages.push({
      sender: by || 'system',
      type: 'accept',
      content: `✅ Accepted! Terms agreed at ${negotiation.currentOffer.amount} MNEE.`,
      amount: negotiation.currentOffer.amount,
      timestamp: Date.now()
    });
    negotiation.messages.push({
      sender: 'system',
      type: 'info',
      content: `🎉 Agreement reached! Ready to create escrow for ${negotiation.currentOffer.amount} MNEE`,
      timestamp: Date.now()
    });

    negotiations.set(req.params.id, negotiation);
    negotiationHistory.push({ type: 'agreed', id: req.params.id, amount: negotiation.currentOffer.amount, ts: Date.now() });

    res.json({
      success: true,
      negotiation,
      escrowParams: {
        amount: negotiation.agreedTerms.amount,
        description: negotiation.agreedTerms.terms,
        suggestedDeadline: Math.floor(Date.now() / 1000) + (72 * 3600) // 72 hours
      }
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// AI-powered auto-negotiation (runs full negotiation)
app.post('/negotiate/auto', async (req, res) => {
  try {
    const { buyerAgent, sellerAgent, task, initialOffer, buyerMax, sellerMin, maxRounds = 5 } = req.body;

    if (!task || !initialOffer) {
      return res.status(400).json({ error: 'task and initialOffer required' });
    }

    const negotiationId = `neg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const messages = [];

    let currentOffer = parseFloat(initialOffer);
    const maxBudget = buyerMax || currentOffer * 1.5;
    const minAccept = sellerMin || currentOffer * 0.8;
    let round = 0;
    let status = 'negotiating';
    let agreedAmount = null;

    messages.push({
      sender: 'system',
      type: 'info',
      content: `🔗 AI Negotiation started`,
      timestamp: Date.now()
    });

    // Simulate negotiation rounds
    while (round < maxRounds && status === 'negotiating') {
      round++;

      if (round === 1) {
        // Buyer initial offer
        messages.push({
          sender: 'buyer',
          type: 'proposal',
          content: `I need: "${task}". My budget is ${currentOffer} MNEE.`,
          amount: currentOffer,
          timestamp: Date.now() + round
        });
      } else if (round % 2 === 0) {
        // Seller counter
        const counterAmount = Math.min(currentOffer * 1.3, maxBudget);
        currentOffer = Math.round(counterAmount * 100) / 100;
        messages.push({
          sender: 'seller',
          type: 'counter',
          content: `I can deliver for ${currentOffer} MNEE.`,
          amount: currentOffer,
          timestamp: Date.now() + round
        });
      } else {
        // Buyer counter
        const counterAmount = Math.min(currentOffer * 0.9, maxBudget);
        currentOffer = Math.round(counterAmount * 100) / 100;
        messages.push({
          sender: 'buyer',
          type: 'counter',
          content: `I can offer ${currentOffer} MNEE.`,
          amount: currentOffer,
          timestamp: Date.now() + round
        });
      }

      // Check for agreement (midpoint reached)
      const midpoint = (parseFloat(initialOffer) + maxBudget) / 2;
      if (Math.abs(currentOffer - midpoint) < midpoint * 0.1) {
        agreedAmount = Math.round(currentOffer * 100) / 100;
        status = 'agreed';
        messages.push({
          sender: 'buyer',
          type: 'accept',
          content: `✅ Accepted at ${agreedAmount} MNEE!`,
          amount: agreedAmount,
          timestamp: Date.now() + round + 1
        });
        messages.push({
          sender: 'system',
          type: 'info',
          content: `🎉 Agreement reached in ${round} rounds!`,
          timestamp: Date.now() + round + 2
        });
      }
    }

    if (status === 'negotiating') {
      status = 'timeout';
      messages.push({
        sender: 'system',
        type: 'info',
        content: 'Maximum rounds reached without agreement.',
        timestamp: Date.now()
      });
    }

    const negotiation = {
      id: negotiationId,
      buyerAgent: buyerAgent || 'BuyerBot',
      sellerAgent: sellerAgent || 'SellerAI',
      task,
      status,
      rounds: round,
      maxRounds,
      currentOffer: { amount: currentOffer, terms: task, by: round % 2 === 0 ? 'seller' : 'buyer' },
      messages,
      agreedTerms: agreedAmount ? { amount: agreedAmount, terms: task, agreedAt: Date.now() } : null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    negotiations.set(negotiationId, negotiation);

    res.json({
      success: true,
      negotiation,
      escrowParams: agreedAmount ? {
        amount: agreedAmount,
        description: task,
        suggestedDeadline: Math.floor(Date.now() / 1000) + (72 * 3600)
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// List all negotiations
app.get('/negotiations', (_req, res) => {
  const all = Array.from(negotiations.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  res.json({
    success: true,
    negotiations: all.slice(0, 50),
    total: negotiations.size,
    history: negotiationHistory.slice(-20)
  });
});

// ============================================================================
// REAL AGENT REPUTATION REGISTRY ENDPOINTS
// ============================================================================

// Register an agent
app.post('/agents/register', (req, res) => {
  try {
    const { address, name, type = 'ai' } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'address required' });
    }

    const normalizedAddress = address.toLowerCase();

    if (agentRegistry.has(normalizedAddress)) {
      return res.status(400).json({ error: 'Agent already registered' });
    }

    const agent = {
      address: normalizedAddress,
      name: name || `Agent-${normalizedAddress.slice(2, 8)}`,
      type,
      score: 50, // Start at neutral
      tier: 'Unverified',
      stats: {
        totalEscrows: 0,
        successfulReleases: 0,
        disputesRaised: 0,
        disputesWon: 0,
        disputesLost: 0,
        totalVolume: '0',
        avgResponseTime: null
      },
      badges: [],
      registeredAt: Date.now(),
      lastActive: Date.now()
    };

    agentRegistry.set(normalizedAddress, agent);
    reputationHistory.push({ type: 'registered', address: normalizedAddress, ts: Date.now() });

    res.json({ success: true, agent });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Get agent profile
app.get('/agents/:address', (req, res) => {
  const normalizedAddress = req.params.address.toLowerCase();
  const agent = agentRegistry.get(normalizedAddress);

  if (!agent) {
    // Return default stats for unregistered agents
    return res.json({
      success: true,
      registered: false,
      agent: {
        address: normalizedAddress,
        name: `Unknown-${normalizedAddress.slice(2, 8)}`,
        score: 50,
        tier: 'Unverified',
        stats: { totalEscrows: 0, successfulReleases: 0 },
        badges: []
      }
    });
  }

  res.json({ success: true, registered: true, agent });
});

// Update agent stats (called after escrow events)
app.post('/agents/:address/update', (req, res) => {
  try {
    const normalizedAddress = req.params.address.toLowerCase();
    const { event, amount, success } = req.body;

    let agent = agentRegistry.get(normalizedAddress);

    // Auto-register if not exists
    if (!agent) {
      agent = {
        address: normalizedAddress,
        name: `Agent-${normalizedAddress.slice(2, 8)}`,
        type: 'unknown',
        score: 50,
        tier: 'Unverified',
        stats: {
          totalEscrows: 0,
          successfulReleases: 0,
          disputesRaised: 0,
          disputesWon: 0,
          disputesLost: 0,
          totalVolume: '0'
        },
        badges: [],
        registeredAt: Date.now(),
        lastActive: Date.now()
      };
    }

    agent.lastActive = Date.now();

    // Update stats based on event
    switch (event) {
      case 'escrow_created':
        agent.stats.totalEscrows++;
        if (amount) {
          agent.stats.totalVolume = (BigInt(agent.stats.totalVolume) + BigInt(amount)).toString();
        }
        break;
      case 'escrow_released':
        agent.stats.successfulReleases++;
        agent.score = Math.min(100, agent.score + 2); // Increase reputation
        break;
      case 'escrow_refunded':
        if (success === false) {
          agent.score = Math.max(0, agent.score - 3); // Decrease if unfavorable
        }
        break;
      case 'dispute_raised':
        agent.stats.disputesRaised++;
        break;
      case 'dispute_won':
        agent.stats.disputesWon++;
        agent.score = Math.min(100, agent.score + 5);
        break;
      case 'dispute_lost':
        agent.stats.disputesLost++;
        agent.score = Math.max(0, agent.score - 5);
        break;
    }

    // Update tier based on score
    if (agent.score >= 90) agent.tier = 'Platinum';
    else if (agent.score >= 75) agent.tier = 'Gold';
    else if (agent.score >= 60) agent.tier = 'Silver';
    else if (agent.score >= 40) agent.tier = 'Bronze';
    else agent.tier = 'Unverified';

    // Award badges
    if (agent.stats.successfulReleases >= 10 && !agent.badges.includes('Reliable')) {
      agent.badges.push('Reliable');
    }
    if (agent.stats.totalEscrows >= 50 && !agent.badges.includes('Veteran')) {
      agent.badges.push('Veteran');
    }
    if (agent.stats.disputesWon > agent.stats.disputesLost && agent.stats.disputesWon >= 3 && !agent.badges.includes('Fair Dealer')) {
      agent.badges.push('Fair Dealer');
    }

    agentRegistry.set(normalizedAddress, agent);
    reputationHistory.push({ type: event, address: normalizedAddress, score: agent.score, ts: Date.now() });

    res.json({ success: true, agent });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Get leaderboard
app.get('/agents', (_req, res) => {
  const all = Array.from(agentRegistry.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  res.json({
    success: true,
    agents: all,
    total: agentRegistry.size,
    tiers: {
      platinum: all.filter(a => a.tier === 'Platinum').length,
      gold: all.filter(a => a.tier === 'Gold').length,
      silver: all.filter(a => a.tier === 'Silver').length,
      bronze: all.filter(a => a.tier === 'Bronze').length,
      unverified: all.filter(a => a.tier === 'Unverified').length
    }
  });
});

// ============================================================================
// REAL DISPUTE ARBITRATION ENDPOINTS
// ============================================================================

// Submit evidence for a dispute
app.post('/arbitration/:escrowId/evidence', (req, res) => {
  try {
    const { escrowId } = req.params;
    const { party, evidenceType, content, attachmentUrl } = req.body;

    if (!party || !content) {
      return res.status(400).json({ error: 'party (claimant/respondent) and content required' });
    }

    if (!disputeEvidence.has(escrowId)) {
      disputeEvidence.set(escrowId, { claimant: [], respondent: [], aiAnalysis: null, status: 'pending' });
    }

    const evidence = disputeEvidence.get(escrowId);
    const entry = {
      id: `ev-${Date.now()}`,
      type: evidenceType || 'text',
      content,
      attachmentUrl,
      submittedAt: Date.now()
    };

    if (party === 'claimant') {
      evidence.claimant.push(entry);
    } else {
      evidence.respondent.push(entry);
    }

    disputeEvidence.set(escrowId, evidence);

    res.json({ success: true, evidence, message: 'Evidence submitted' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Get dispute evidence
app.get('/arbitration/:escrowId/evidence', (req, res) => {
  const evidence = disputeEvidence.get(req.params.escrowId) || { claimant: [], respondent: [], aiAnalysis: null, status: 'not_found' };
  res.json({ success: true, escrowId: req.params.escrowId, evidence });
});

// AI-powered dispute analysis
app.post('/arbitration/:escrowId/analyze', async (req, res) => {
  try {
    const { escrowId } = req.params;
    const evidence = disputeEvidence.get(escrowId);

    if (!evidence) {
      return res.status(404).json({ error: 'No evidence found for this escrow' });
    }

    // Get escrow data
    let escrowData;
    try {
      const e = await escrow.escrows(escrowId);
      escrowData = {
        payer: e.payer,
        payee: e.payee,
        arbiter: e.arbiter,
        amount: ethers.formatUnits(e.amount, 18),
        status: ['None', 'Funded', 'Released', 'Refunded', 'Disputed'][Number(e.status)]
      };
    } catch (e) {
      escrowData = { error: 'Could not fetch escrow data' };
    }

    // AI Analysis
    const aiClient = groq || openai;
    let analysis;

    if (aiClient) {
      try {
        const response = await aiClient.chat.completions.create({
          model: groq ? "llama-3.3-70b-versatile" : "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an AI arbitration judge for AutoTrust Paymesh escrow disputes. 
Analyze the evidence from both parties fairly and provide a verdict.
Consider: strength of evidence, contractual obligations, timeline, and good faith.
Be decisive and fair.`
            },
            {
              role: "user",
              content: `DISPUTE ANALYSIS REQUEST

ESCROW DETAILS:
${JSON.stringify(escrowData, null, 2)}

CLAIMANT EVIDENCE (${evidence.claimant.length} items):
${evidence.claimant.map(e => `- ${e.type}: ${e.content}`).join('\n') || 'No evidence submitted'}

RESPONDENT EVIDENCE (${evidence.respondent.length} items):
${evidence.respondent.map(e => `- ${e.type}: ${e.content}`).join('\n') || 'No evidence submitted'}

Provide your analysis in JSON:
{
  "verdict": "RELEASE_TO_PAYEE" | "REFUND_TO_PAYER" | "SPLIT_50_50" | "NEEDS_MORE_INFO",
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation",
  "claimantStrength": 0.0-1.0,
  "respondentStrength": 0.0-1.0,
  "keyFactors": ["factor1", "factor2"]
}`
            }
          ],
          temperature: 0.3,
          max_tokens: 600
        });

        const content = response.choices[0].message.content;
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
        analysis = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(content);
        analysis.aiPowered = true;
        analysis.model = groq ? 'Groq Llama 3.3' : 'OpenAI GPT-4';
      } catch (err) {
        console.error('AI analysis error:', err.message);
      }
    }

    // Fallback rule-based analysis
    if (!analysis) {
      const claimantScore = evidence.claimant.length * 0.3;
      const respondentScore = evidence.respondent.length * 0.3;

      analysis = {
        verdict: claimantScore > respondentScore ? 'REFUND_TO_PAYER' :
          respondentScore > claimantScore ? 'RELEASE_TO_PAYEE' : 'NEEDS_MORE_INFO',
        confidence: 0.6,
        reasoning: `Rule-based analysis: Claimant submitted ${evidence.claimant.length} evidence items, Respondent submitted ${evidence.respondent.length} items.`,
        claimantStrength: Math.min(1, claimantScore),
        respondentStrength: Math.min(1, respondentScore),
        keyFactors: ['Evidence count comparison', 'No AI available for deep analysis'],
        aiPowered: false,
        model: 'rule-based'
      };
    }

    analysis.analyzedAt = Date.now();
    evidence.aiAnalysis = analysis;
    evidence.status = 'analyzed';
    disputeEvidence.set(escrowId, evidence);

    arbitrationHistory.push({ escrowId, verdict: analysis.verdict, confidence: analysis.confidence, ts: Date.now() });

    res.json({ success: true, escrowId, analysis });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Get arbitration history
app.get('/arbitration/history', (_req, res) => {
  res.json({
    success: true,
    history: arbitrationHistory.slice(-50),
    pendingDisputes: Array.from(disputeEvidence.entries())
      .filter(([_, v]) => v.status === 'pending')
      .map(([id, v]) => ({ escrowId: id, claimantEvidence: v.claimant.length, respondentEvidence: v.respondent.length }))
  });
});

// ============================================================================
// REAL STREAMING PAYMENTS ENDPOINTS
// ============================================================================

// Create a new stream
app.post('/streams/create', (req, res) => {
  try {
    const { sender, receiver, ratePerSecond, totalBudget, description } = req.body;

    if (!sender || !receiver || !ratePerSecond || !totalBudget) {
      return res.status(400).json({ error: 'sender, receiver, ratePerSecond, totalBudget required' });
    }

    // Check sender's wallet balance
    const walletBalance = getStreamingWalletBalance(sender);
    const requestedBudget = parseFloat(totalBudget);

    if (walletBalance <= 0) {
      return res.status(400).json({
        error: 'Insufficient balance',
        walletBalance: 0,
        message: 'Your streaming wallet is empty. Deposit more MNEE to continue.'
      });
    }

    // Use available balance (cap at wallet balance)
    const actualBudget = Math.min(requestedBudget, walletBalance);

    // Deduct from wallet immediately (locked in stream)
    deductFromStreamingWallet(sender, actualBudget);

    const streamId = `stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const stream = {
      id: streamId,
      sender,
      receiver,
      ratePerSecond: parseFloat(ratePerSecond),
      totalBudget: actualBudget,
      description: description || 'AI Service Stream',
      status: 'active',
      startTime: Date.now(),
      withdrawn: 0,
      lastWithdrawTime: Date.now(),
      createdAt: Date.now()
    };

    activeStreams.set(streamId, stream);
    streamHistory.push({ type: 'created', streamId, ts: Date.now() });

    const newWalletBalance = getStreamingWalletBalance(sender);

    res.json({
      success: true,
      stream,
      walletBalance: newWalletBalance,
      lockedInStream: actualBudget,
      message: `Stream created. ${actualBudget.toFixed(2)} MNEE locked. Wallet balance: ${newWalletBalance.toFixed(2)} MNEE`
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Get stream status
app.get('/streams/:id', (req, res) => {
  const stream = activeStreams.get(req.params.id);
  if (!stream) {
    return res.status(404).json({ error: 'Stream not found' });
  }

  // For cancelled streams, use the final values; for active, calculate real-time
  let streamedAmount, elapsedSeconds;

  if (stream.status === 'cancelled' || stream.status === 'completed') {
    // Use stored final values
    streamedAmount = stream.finalStreamed || stream.withdrawn || 0;
    elapsedSeconds = stream.stopTime ? (stream.stopTime - stream.startTime) / 1000 : 0;
  } else {
    // Calculate real-time for active streams
    elapsedSeconds = (Date.now() - stream.startTime) / 1000;
    streamedAmount = Math.min(elapsedSeconds * stream.ratePerSecond, stream.totalBudget);
  }

  const withdrawable = Math.max(0, streamedAmount - stream.withdrawn);
  const remaining = stream.totalBudget - streamedAmount;

  res.json({
    success: true,
    stream: {
      ...stream,
      elapsedSeconds,
      streamedAmount,
      withdrawable,
      remaining,
      progress: (streamedAmount / stream.totalBudget) * 100
    }
  });
});

// Withdraw from stream (receiver claims funds)
app.post('/streams/:id/withdraw', (req, res) => {
  try {
    const stream = activeStreams.get(req.params.id);
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    // Allow withdrawal from active OR cancelled streams (but not completed - nothing left)
    if (stream.status === 'completed') {
      return res.status(400).json({ error: 'Stream completed - all funds already withdrawn' });
    }

    // Calculate withdrawable amount - use stopTime for cancelled streams
    const endTime = stream.stopTime || Date.now();
    const elapsedSeconds = (endTime - stream.startTime) / 1000;
    const streamedAmount = Math.min(elapsedSeconds * stream.ratePerSecond, stream.totalBudget);
    const withdrawable = streamedAmount - stream.withdrawn;

    if (withdrawable <= 0) {
      return res.status(400).json({ error: 'Nothing to withdraw' });
    }

    stream.withdrawn += withdrawable;
    stream.lastWithdrawTime = Date.now();

    // Check if stream is complete
    if (stream.withdrawn >= stream.totalBudget) {
      stream.status = 'completed';
    }

    activeStreams.set(req.params.id, stream);
    streamHistory.push({ type: 'withdraw', streamId: stream.id, amount: withdrawable, ts: Date.now() });

    res.json({
      success: true,
      withdrawn: withdrawable,
      totalWithdrawn: stream.withdrawn,
      remaining: stream.totalBudget - stream.withdrawn,
      status: stream.status,
      message: `Withdrew ${withdrawable.toFixed(4)} MNEE`
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Cancel stream (sender stops)
app.post('/streams/:id/cancel', (req, res) => {
  try {
    const stream = activeStreams.get(req.params.id);
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    // Calculate final amounts
    const elapsedSeconds = (Date.now() - stream.startTime) / 1000;
    const streamedAmount = Math.min(elapsedSeconds * stream.ratePerSecond, stream.totalBudget);
    const refundable = stream.totalBudget - streamedAmount;

    // Refund unstreamed amount back to sender's wallet
    const newWalletBalance = refundToStreamingWallet(stream.sender, refundable);

    stream.status = 'cancelled';
    stream.cancelledAt = Date.now();
    stream.stopTime = Date.now(); // Record stop time for withdrawal calculations
    stream.finalStreamed = streamedAmount;
    stream.refunded = refundable;

    activeStreams.set(req.params.id, stream);
    streamHistory.push({ type: 'cancelled', streamId: stream.id, refunded: refundable, ts: Date.now() });

    res.json({
      success: true,
      stream,
      walletBalance: newWalletBalance,
      refunded: refundable,
      message: `Stream cancelled. ${streamedAmount.toFixed(2)} MNEE was streamed, ${refundable.toFixed(2)} MNEE refunded to wallet. Balance: ${newWalletBalance.toFixed(2)} MNEE`
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// List all streams
app.get('/streams', (_req, res) => {
  const all = Array.from(activeStreams.values()).sort((a, b) => b.createdAt - a.createdAt);
  res.json({
    success: true,
    streams: all.slice(0, 50),
    active: all.filter(s => s.status === 'active').length,
    completed: all.filter(s => s.status === 'completed').length,
    cancelled: all.filter(s => s.status === 'cancelled').length,
    history: streamHistory.slice(-20)
  });
});

// Get streaming wallet balance
app.get('/streams/wallet/:address', (req, res) => {
  const balance = getStreamingWalletBalance(req.params.address);
  res.json({
    success: true,
    address: req.params.address,
    balance,
    message: `Streaming wallet balance: ${balance.toFixed(2)} MNEE`
  });
});

// Deposit to streaming wallet (for testing)
app.post('/streams/wallet/:address/deposit', (req, res) => {
  const { amount } = req.body;
  const depositAmount = parseFloat(amount) || 100;
  const newBalance = refundToStreamingWallet(req.params.address, depositAmount);
  res.json({
    success: true,
    address: req.params.address,
    deposited: depositAmount,
    balance: newBalance,
    message: `Deposited ${depositAmount.toFixed(2)} MNEE. New balance: ${newBalance.toFixed(2)} MNEE`
  });
});

// RESET streaming wallet to initial state (for demo/testing)
app.post('/streams/wallet/:address/reset', (req, res) => {
  const address = req.params.address;
  const initialBalance = 100;

  // Reset wallet to initial balance
  streamingWallets.set(address, initialBalance);

  // Clear any active streams for this sender
  for (const [id, stream] of activeStreams.entries()) {
    if (stream.sender === address) {
      activeStreams.delete(id);
    }
  }

  res.json({
    success: true,
    address,
    balance: initialBalance,
    message: `Wallet reset to ${initialBalance} MNEE. All streams cleared.`
  });
});

// ============================================================================
// ESCROW PREPARATION FROM NEGOTIATION
// ============================================================================

// Store prepared escrows from negotiations
const preparedEscrows = new Map();

// Prepare escrow from negotiation agreement
app.post('/escrows/prepare', (req, res) => {
  try {
    const { amount, description, negotiationId, buyer, seller } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'amount required' });
    }

    const prepId = `prep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const prepared = {
      id: prepId,
      amount,
      description: description || 'AI Negotiated Escrow',
      negotiationId,
      buyer,
      seller,
      createdAt: Date.now(),
      status: 'ready',
    };

    preparedEscrows.set(prepId, prepared);

    res.json({
      success: true,
      preparedEscrow: prepared,
      message: `Escrow ready to create for ${amount} MNEE. Use the Escrow tab to finalize.`,
      instructions: [
        '1. Go to the Escrow tab',
        `2. Set amount to ${amount} MNEE`,
        '3. Enter payee (seller) and arbiter addresses',
        '4. Connect wallet and create escrow'
      ]
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Get prepared escrows
app.get('/escrows/prepared', (req, res) => {
  const all = Array.from(preparedEscrows.values());
  res.json({
    success: true,
    prepared: all.filter(p => p.status === 'ready'),
    total: all.length
  });
});

// Link a created escrow to a negotiation
app.post('/negotiate/:id/link-escrow', (req, res) => {
  try {
    const negotiation = negotiations.get(req.params.id);
    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    const { escrowId, txHash } = req.body;
    if (!escrowId) {
      return res.status(400).json({ error: 'escrowId required' });
    }

    negotiation.linkedEscrow = {
      escrowId,
      txHash,
      linkedAt: Date.now(),
      status: 'created'
    };
    negotiation.updatedAt = Date.now();

    negotiations.set(req.params.id, negotiation);
    negotiationHistory.push({ type: 'escrow-linked', negotiationId: req.params.id, escrowId, ts: Date.now() });

    res.json({
      success: true,
      negotiation,
      message: `Escrow ${escrowId.slice(0, 10)}... linked to negotiation`
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Update escrow status in a negotiation (called when escrow is released/refunded)
app.post('/negotiate/:id/escrow-status', (req, res) => {
  try {
    const negotiation = negotiations.get(req.params.id);
    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    const { status, txHash } = req.body;

    if (negotiation.linkedEscrow) {
      negotiation.linkedEscrow.status = status; // 'released', 'refunded', 'disputed'
      if (txHash) negotiation.linkedEscrow.completedTxHash = txHash;
      negotiation.linkedEscrow.completedAt = Date.now();
    }

    if (status === 'released') {
      negotiation.status = 'completed';
    } else if (status === 'refunded') {
      negotiation.status = 'refunded';
    }

    negotiation.updatedAt = Date.now();
    negotiations.set(req.params.id, negotiation);

    negotiationHistory.push({ type: `escrow-${status}`, negotiationId: req.params.id, ts: Date.now() });

    res.json({
      success: true,
      negotiation,
      message: `Negotiation marked as ${status}`
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ============================================================================
// CHAINED ESCROW ENDPOINTS
// ============================================================================

// Link escrows (child depends on parent)
app.post('/escrows/chain', (req, res) => {
  try {
    const { parentId, childId, dependencyType = 'release' } = req.body;

    if (!parentId || !childId) {
      return res.status(400).json({ error: 'parentId and childId required' });
    }

    // Get or create parent chain info
    if (!chainedEscrows.has(parentId)) {
      chainedEscrows.set(parentId, { parentId: null, childIds: [], dependencyType: 'root' });
    }

    // Create child chain info
    chainedEscrows.set(childId, { parentId, childIds: [], dependencyType });

    // Add child to parent's children
    const parent = chainedEscrows.get(parentId);
    if (!parent.childIds.includes(childId)) {
      parent.childIds.push(childId);
    }
    chainedEscrows.set(parentId, parent);

    res.json({
      success: true,
      chain: {
        parent: parentId,
        child: childId,
        dependencyType,
        message: `Child escrow ${childId.slice(0, 10)}... depends on parent ${parentId.slice(0, 10)}...`
      }
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Get escrow chain
app.get('/escrows/:id/chain', (req, res) => {
  const chainInfo = chainedEscrows.get(req.params.id);
  if (!chainInfo) {
    return res.json({ success: true, isChained: false, chain: null });
  }

  // Build full chain
  const buildChain = (id, depth = 0) => {
    if (depth > 10) return null; // Prevent infinite loops
    const info = chainedEscrows.get(id);
    if (!info) return { id, children: [] };
    return {
      id,
      parentId: info.parentId,
      dependencyType: info.dependencyType,
      children: info.childIds.map(cid => buildChain(cid, depth + 1))
    };
  };

  // Find root
  let root = req.params.id;
  let current = chainInfo;
  while (current.parentId) {
    root = current.parentId;
    current = chainedEscrows.get(root) || { parentId: null };
  }

  res.json({
    success: true,
    isChained: true,
    rootId: root,
    chain: buildChain(root),
    thisEscrow: chainInfo
  });
});

// Get all chains
app.get('/escrows/chains', (_req, res) => {
  // Find all root escrows (no parent)
  const roots = Array.from(chainedEscrows.entries())
    .filter(([_, v]) => !v.parentId)
    .map(([id, v]) => ({ id, children: v.childIds }));

  res.json({
    success: true,
    chains: roots,
    totalChained: chainedEscrows.size
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n🚀 AutoTrust Paymesh Backend v3.0 - FULL FEATURES`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📋 Escrow: ${env.ESCROW_ADDRESS}`);
  console.log(`\n📚 Swagger API Docs: http://localhost:${PORT}/api-docs`);
  console.log(`📄 OpenAPI Spec JSON: http://localhost:${PORT}/api-docs.json`);
  console.log(`🧠 MeshMind AI: ${AI_ENABLED ? `✅ ${AI_PROVIDER}` : '📚 Knowledge Base (add GROQ_API_KEY for AI)'}`);
  console.log(`\n📡 Core Endpoints:`);
  console.log(`   GET  /health               - Status + AI capability`);
  console.log(`   GET  /events               - All chain events`);
  console.log(`   GET  /escrow/:id           - Escrow details`);
  console.log(`   GET  /analytics            - 📊 REAL protocol metrics`);
  console.log(`\n🧠 MeshMind Knowledge Assistant:`);
  console.log(`   POST /copilot/query        - Ask anything about the app`);
  console.log(`   GET  /copilot/suggestions  - Suggested questions`);
  console.log(`\n🤖 AI Agent System:`);
  console.log(`   POST /agent/decision/:id   - Get AI recommendation`);
  console.log(`   POST /agent/execute/:id    - Execute on-chain`);
  console.log(`   POST /agent/autonomous-demo - Full autonomous flow`);
  console.log(`\n🤝 Negotiation Sandbox (NEW!):`);
  console.log(`   POST /negotiate/start      - Start AI negotiation`);
  console.log(`   POST /negotiate/:id/counter - Submit counter-offer`);
  console.log(`   POST /negotiate/:id/accept - Accept terms`);
  console.log(`   POST /negotiate/auto       - Auto-negotiate (AI)`);
  console.log(`   GET  /negotiations         - List all`);
  console.log(`\n🏆 Agent Reputation (NEW!):`);
  console.log(`   POST /agents/register      - Register agent`);
  console.log(`   GET  /agents/:address      - Get profile`);
  console.log(`   POST /agents/:address/update - Update stats`);
  console.log(`   GET  /agents               - Leaderboard`);
  console.log(`\n⚖️ AI Arbitration (NEW!):`);
  console.log(`   POST /arbitration/:id/evidence - Submit evidence`);
  console.log(`   GET  /arbitration/:id/evidence - Get evidence`);
  console.log(`   POST /arbitration/:id/analyze  - AI analysis`);
  console.log(`   GET  /arbitration/history  - Arbitration history`);
  console.log(`\n💸 Streaming Payments (NEW!):`);
  console.log(`   POST /streams/create       - Create stream`);
  console.log(`   GET  /streams/:id          - Stream status`);
  console.log(`   POST /streams/:id/withdraw - Claim funds`);
  console.log(`   POST /streams/:id/cancel   - Stop stream`);
  console.log(`   GET  /streams              - List all`);
  console.log(`\n🔗 Chained Escrows (NEW!):`);
  console.log(`   POST /escrows/chain        - Link parent/child`);
  console.log(`   GET  /escrows/:id/chain    - Get chain info`);
  console.log(`   GET  /escrows/chains       - All chains\n`);
});
