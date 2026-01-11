/**
 * MeshMind Knowledge Base
 * Comprehensive knowledge about AutoTrust Paymesh for intelligent Q&A
 */

export const SYSTEM_CONTEXT = `You are MeshMind, the intelligent assistant for Paymesh AutoTrust - an AI-powered MNEE escrow platform for agent-to-agent and human-to-agent payments.

You are a solution architect's assistant with deep knowledge of:
- Blockchain escrow mechanisms
- MNEE stablecoin operations
- Smart contract flows
- AI agent integration
- Dispute resolution
- Streaming payments (pay-per-token)
- Chained/multi-hop escrows
- Agent reputation & trust scoring
- AI negotiation sandbox
- AI arbitration tribunal

NEW FEATURES (v3.0):
1. **Real Analytics** - Live TVL, volume, success rates from contract
2. **Negotiation Sandbox** - AI agents negotiate terms before escrow
3. **Agent Reputation** - Trust scores (0-100), tiers (Unverified→Platinum)
4. **Streaming Payments** - Continuous payments per second
5. **Chained Escrows** - Multi-hop payments with dependencies
6. **AI Arbitration** - Two-tier dispute resolution (AI + DAO)

Always be helpful, concise, and accurate. Reference specific features when relevant.`;

export const KNOWLEDGE_BASE = {
  // ============================================================================
  // PRODUCT OVERVIEW
  // ============================================================================
  product: {
    name: "AutoTrust Paymesh",
    tagline: "AI-powered MNEE escrow for agent payments",
    description: `AutoTrust Paymesh is a decentralized escrow platform that enables secure, trustless payments between AI agents, services, and humans using MNEE stablecoin on Ethereum.
    
Key Innovation: We combine smart contract escrow with AI-powered decision making, allowing autonomous agents to participate in commerce with built-in trust guarantees.`,
    
    useCases: [
      "AI Agent Services: Pay AI agents for completed tasks with automatic verification",
      "Freelance Work: Secure milestone-based payments with dispute resolution",
      "E-commerce: Buyer protection for online purchases",
      "API Services: Pay-per-use with delivery verification",
      "Multi-party Agreements: Complex deals with multiple stakeholders"
    ],
    
    targetUsers: [
      "AI/ML Engineers building agent systems",
      "Businesses automating payments",
      "Freelancers and contractors",
      "E-commerce platforms",
      "DeFi developers"
    ]
  },

  // ============================================================================
  // MNEE TOKEN
  // ============================================================================
  mnee: {
    name: "MNEE",
    type: "ERC-20 Stablecoin",
    description: "MNEE is a USD-pegged stablecoin designed for payments and commerce on Ethereum.",
    mainnetAddress: "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF",
    decimals: 18,
    explorer: "https://etherscan.io/token/0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF",
    swap: "https://swap-user.mnee.net/",
    
    features: [
      "1:1 USD peg",
      "Low gas fees for transfers",
      "Widely supported on DEXs",
      "Designed for commerce and payments"
    ],
    
    howToGet: [
      "Swap ETH or other tokens at swap-user.mnee.net",
      "Purchase from supported exchanges",
      "Receive from other users"
    ]
  },

  // ============================================================================
  // ESCROW SMART CONTRACT
  // ============================================================================
  escrow: {
    name: "MNEEEscrow",
    description: "Solidity smart contract implementing secure escrow with dispute resolution, AI agent authorization, and partial releases.",
    
    states: {
      None: { value: 0, description: "Escrow doesn't exist" },
      Funded: { value: 1, description: "MNEE deposited, awaiting completion" },
      Released: { value: 2, description: "Funds released to payee" },
      Refunded: { value: 3, description: "Funds returned to payer" }
    },
    
    roles: {
      payer: "Creates escrow, deposits MNEE. Can refund after deadline.",
      payee: "Receives payment when conditions are met.",
      arbiter: "Trusted third party who can release or refund. Often the payer for simple flows, or an AI agent for automated decisions."
    },
    
    functions: {
      createEscrow: {
        description: "Create a new escrow with MNEE deposit",
        params: ["escrowId (bytes32)", "payee address", "amount", "arbiter address", "deadline timestamp", "metadataHash"],
        requirements: ["Caller must have approved MNEE transfer", "escrowId must be unique"]
      },
      release: {
        description: "Release funds to payee",
        caller: "Arbiter only",
        requirements: ["Escrow must be in Funded state"]
      },
      refund: {
        description: "Return funds to payer",
        caller: "Arbiter, or Payer after deadline",
        requirements: ["Escrow must be in Funded state"]
      },
      raiseDispute: {
        description: "Flag escrow for dispute resolution",
        caller: "Payer or Payee",
        requirements: ["Escrow must be in Funded state"]
      },
      resolveDispute: {
        description: "Arbiter resolves dispute with release or refund",
        caller: "Arbiter only",
        params: ["escrowId", "releaseToPayee (bool)"]
      },
      releasePartial: {
        description: "Release partial amount to payee, refund rest to payer",
        caller: "Arbiter only",
        params: ["escrowId", "payeeAmount"]
      },
      authorizeAgent: {
        description: "Allow an AI agent to act as arbiter",
        caller: "Current arbiter only"
      }
    },
    
    events: [
      "EscrowCreated - New escrow created with deposit",
      "EscrowReleased - Funds released to payee",
      "EscrowRefunded - Funds returned to payer",
      "DisputeRaised - Dispute flagged for resolution",
      "DisputeResolved - Arbiter made final decision",
      "AgentAuthorized - AI agent granted arbiter rights"
    ],
    
    security: [
      "ReentrancyGuard prevents reentrancy attacks",
      "Pausable allows emergency stops",
      "SafeERC20 for secure token transfers",
      "Ownable for admin functions"
    ]
  },

  // ============================================================================
  // USER FLOWS
  // ============================================================================
  flows: {
    createEscrow: {
      name: "Create Escrow Flow",
      steps: [
        "1. Connect wallet (MetaMask, Coinbase Wallet)",
        "2. Ensure you have MNEE tokens",
        "3. Approve MNEE spending for escrow contract",
        "4. Fill in: Payee address, Arbiter address, Amount, Deadline",
        "5. Click 'Create Escrow' and confirm in wallet",
        "6. Wait for transaction confirmation",
        "7. Escrow ID is generated from your escrow key"
      ],
      tips: [
        "Use yourself as arbiter for simple self-service escrows",
        "Set realistic deadlines (e.g., 30 minutes to 7 days)",
        "Each escrow key must be unique"
      ]
    },
    
    releaseFlow: {
      name: "Release Funds Flow",
      steps: [
        "1. Arbiter verifies service/goods delivered",
        "2. Navigate to Active Escrow section",
        "3. Click 'Release' button",
        "4. Confirm transaction in wallet",
        "5. Funds transfer to payee"
      ],
      requirements: ["Only arbiter can release", "Escrow must be in Funded state"]
    },
    
    refundFlow: {
      name: "Refund Flow",
      steps: [
        "1. If arbiter: Click 'Refund' anytime",
        "2. If payer: Wait until deadline passes, then click 'Refund'",
        "3. Confirm transaction in wallet",
        "4. Funds return to payer"
      ]
    },
    
    disputeFlow: {
      name: "Dispute Resolution Flow",
      steps: [
        "1. Either party raises dispute via 'Raise Dispute'",
        "2. Submit evidence (delivery proofs, messages, screenshots)",
        "3. AI agents analyze evidence and recommend action",
        "4. Arbiter reviews and makes final decision",
        "5. Funds distributed according to resolution"
      ]
    },
    
    aiAgentFlow: {
      name: "AI Agent Autonomous Flow",
      steps: [
        "1. Payer creates escrow with AI agent as arbiter",
        "2. Service is performed",
        "3. AI agent receives completion proof via API",
        "4. AI analyzes evidence (delivery confirmation, API logs, etc.)",
        "5. AI automatically releases or refunds based on analysis",
        "6. Human override available if needed"
      ]
    }
  },

  // ============================================================================
  // AI AGENT SYSTEM
  // ============================================================================
  aiAgents: {
    overview: "AutoTrust uses a multi-agent AI system for intelligent escrow management.",
    
    agents: {
      complianceAgent: {
        name: "Compliance Agent",
        role: "Checks regulatory compliance, KYC status, sanctions screening",
        outputs: ["PASS", "FLAG", "BLOCK"]
      },
      opsAgent: {
        name: "Operations Agent", 
        role: "Analyzes delivery evidence, timestamps, API responses",
        outputs: ["VERIFIED", "PARTIAL", "FAILED"]
      },
      arbiterAgent: {
        name: "Arbiter Agent",
        role: "Makes final recommendation based on all inputs",
        outputs: ["RELEASE", "REFUND", "PARTIAL_RELEASE", "REQUEST_MORE_INFO"]
      }
    },
    
    decisionFactors: [
      "Evidence quality and completeness",
      "Deadline proximity",
      "Historical patterns",
      "Risk score",
      "Policy compliance"
    ],
    
    humanOverride: "All AI decisions can be overridden by human arbiters for edge cases."
  },

  // ============================================================================
  // POLICIES
  // ============================================================================
  policies: {
    release: {
      name: "Release Policy",
      content: `Funds are released when:
- Service/goods confirmed delivered
- Delivery proof verified (API response, tracking, confirmation)
- No active disputes
- Arbiter approves release

Auto-release triggers:
- Verified delivery confirmation API
- Signed delivery receipt
- Milestone completion proof`
    },
    
    refund: {
      name: "Refund Policy", 
      content: `Refunds are processed when:
- Service not delivered before deadline
- Delivery proof invalid or missing
- Mutual agreement between parties
- Dispute resolved in payer's favor

Auto-refund triggers:
- Deadline passed with no delivery proof
- Service provider cancellation
- Failed verification checks`
    },
    
    dispute: {
      name: "Dispute Policy",
      content: `Disputes are handled by:
1. Evidence collection from both parties
2. AI analysis of submitted proof
3. Arbiter review and decision
4. Appeals process (if applicable)

Evidence types accepted:
- Screenshots, photos, videos
- API logs and responses
- Communication records
- Third-party verification`
    },
    
    deadlines: {
      name: "Deadline Policy",
      content: `Deadlines govern escrow lifecycle:
- Minimum: 5 minutes (for testing)
- Recommended: 24 hours to 7 days
- Maximum: 365 days

After deadline:
- Payer can self-refund without arbiter
- AI agents factor deadline into decisions`
    }
  },

  // ============================================================================
  // TECHNICAL ARCHITECTURE
  // ============================================================================
  architecture: {
    stack: {
      frontend: "Next.js 14, React, wagmi/viem, TailwindCSS",
      backend: "Node.js, Express, ethers.js",
      contracts: "Solidity 0.8.20, Hardhat, OpenZeppelin",
      ai: "OpenAI GPT-4 / Groq Llama 3.3"
    },
    
    components: {
      webApp: "React-based operations console with wallet integration",
      backend: "Event indexer, AI agent orchestrator, REST API",
      smartContract: "MNEEEscrow.sol - on-chain escrow logic",
      aiLayer: "Multi-agent decision system with RAG"
    },
    
    security: [
      "Non-custodial - users control their keys",
      "Smart contract audited patterns (OpenZeppelin)",
      "No private key storage on backend",
      "Read-only blockchain indexing"
    ]
  },

  // ============================================================================
  // FAQ
  // ============================================================================
  faq: [
    {
      q: "What is AutoTrust Paymesh?",
      a: "AutoTrust Paymesh is an AI-powered escrow platform for secure MNEE payments between AI agents, services, and humans. It combines blockchain security with AI-assisted dispute resolution."
    },
    {
      q: "How do I create an escrow?",
      a: "Connect your wallet, approve MNEE tokens, enter payee/arbiter addresses, amount, and deadline, then click Create Escrow. Each escrow needs a unique key."
    },
    {
      q: "Who can release funds?",
      a: "Only the designated arbiter can release funds before the deadline. For simple flows, set yourself as arbiter. For AI automation, use an AI agent address."
    },
    {
      q: "What happens after the deadline?",
      a: "After the deadline, the payer can refund without arbiter approval. This protects payers from unresponsive payees."
    },
    {
      q: "How do disputes work?",
      a: "Either party can raise a dispute. Evidence is submitted, AI agents analyze it, and the arbiter makes a final decision. Partial releases are possible."
    },
    {
      q: "Is my money safe?",
      a: "Yes. Funds are held in a smart contract, not by us. Only the designated arbiter or payer (after deadline) can move funds. We never have custody."
    },
    {
      q: "What tokens are supported?",
      a: "Currently MNEE (USD stablecoin). The contract is designed for ERC-20 tokens and could support others in the future."
    },
    {
      q: "Can AI agents autonomously release funds?",
      a: "Yes! If an AI agent is set as arbiter and authorized, it can analyze evidence and execute release/refund automatically based on predefined criteria."
    },
    {
      q: "What's the difference between local and mainnet?",
      a: "Local (Hardhat) uses test tokens for development. Mainnet uses real MNEE on Ethereum. The UI shows 'Hardhat Local' or 'Ethereum' to indicate which network."
    },
    {
      q: "How do I get MNEE tokens?",
      a: "Swap ETH or other tokens at swap-user.mnee.net, or receive from other users. For testing, the local environment provides free test MNEE."
    }
  ],

  // ============================================================================
  // GLOSSARY
  // ============================================================================
  glossary: {
    escrow: "A financial arrangement where a third party holds funds until conditions are met.",
    arbiter: "The trusted party who decides when to release or refund escrow funds.",
    payer: "The party depositing funds into escrow.",
    payee: "The party receiving funds when escrow is released.",
    MNEE: "A USD-pegged stablecoin on Ethereum used for payments.",
    deadline: "The timestamp after which the payer can self-refund.",
    dispute: "A flag indicating disagreement between payer and payee.",
    "smart contract": "Self-executing code on blockchain that holds and manages escrow funds.",
    wagmi: "React hooks library for Ethereum wallet interactions.",
    viem: "TypeScript library for Ethereum interactions.",
    ERC20: "Ethereum token standard for fungible tokens like MNEE.",
    "gas fee": "Transaction fee paid to Ethereum network validators.",
    TVL: "Total Value Locked - sum of all funds in escrow contracts.",
    "streaming payment": "Continuous payment flow where funds transfer per second/token.",
    "chained escrow": "Multi-hop payment where child escrows depend on parent completion.",
    "agent reputation": "Trust score (0-100) tracking agent performance history.",
    "trust tier": "Agent classification: Unverified, Bronze, Silver, Gold, Platinum.",
    "negotiation sandbox": "AI-to-AI automated price and term haggling.",
    "AI arbitration": "Two-tier dispute resolution using AI judge + DAO voting."
  },

  // ============================================================================
  // ADVANCED FEATURES (v3.0)
  // ============================================================================
  advancedFeatures: {
    negotiation: {
      name: "Negotiation Sandbox",
      description: "AI agents automatically negotiate price and terms before escrow creation.",
      endpoints: ["POST /negotiate/start", "POST /negotiate/:id/counter", "POST /negotiate/:id/accept", "POST /negotiate/auto"],
      howItWorks: [
        "1. Configure task description and initial offer",
        "2. Start AI negotiation between buyer and seller agents",
        "3. Agents exchange counter-offers automatically",
        "4. Agreement reached → ready to create escrow with agreed terms"
      ]
    },
    agentReputation: {
      name: "Agent Reputation System",
      description: "Track agent performance with trust scores and tier badges.",
      tiers: {
        unverified: "0-39 score, new agents",
        bronze: "40-59 score, some history",
        silver: "60-74 score, established",
        gold: "75-89 score, trusted",
        platinum: "90-100 score, top performers"
      },
      factors: ["Successful releases", "Dispute outcomes", "Volume", "Response time"],
      badges: ["Fast Responder", "High Volume", "Zero Disputes", "Veteran", "Reliable"]
    },
    streamingPayments: {
      name: "Streaming Payments",
      description: "Continuous pay-per-second for AI services like LLM inference or GPU compute.",
      endpoints: ["POST /streams/create", "GET /streams/:id", "POST /streams/:id/withdraw", "POST /streams/:id/cancel"],
      useCases: ["LLM Inference", "GPU Compute", "API Calls", "Data Processing", "Real-time Translation"]
    },
    chainedEscrow: {
      name: "Chained Escrow",
      description: "Multi-hop payments where child escrows depend on parent completion.",
      endpoints: ["POST /escrows/chain", "GET /escrows/:id/chain"],
      example: "Client → LeadDev → (FrontendBot + BackendBot) - cascading releases on completion"
    },
    aiArbitration: {
      name: "AI Arbitration Tribunal",
      description: "Two-tier dispute resolution: AI Judge (fast) → DAO Panel (appeal).",
      endpoints: ["POST /arbitration/:id/evidence", "POST /arbitration/:id/analyze"],
      tiers: {
        tier1: "AI Judge analyzes evidence and renders verdict with confidence score",
        tier2: "DAO voting for appeals if AI verdict disputed"
      }
    },
    analytics: {
      name: "Real Analytics",
      description: "Live protocol metrics from contract state and events.",
      endpoint: "GET /analytics",
      metrics: ["TVL", "Total Volume", "Active Escrows", "Registered Agents", "Success Rate", "Dispute Rate", "AI Decisions"]
    }
  }
};

// ============================================================================
// QUERY PROCESSING HELPERS
// ============================================================================

export function buildContextForQuery(query, liveStats = {}) {
  const q = query.toLowerCase();
  let relevantContext = [];
  
  // Product info
  if (q.includes('what is') || q.includes('about') || q.includes('overview') || q.includes('autotrust') || q.includes('paymesh')) {
    relevantContext.push(`Product: ${KNOWLEDGE_BASE.product.description}`);
    relevantContext.push(`Use Cases: ${KNOWLEDGE_BASE.product.useCases.join(', ')}`);
  }
  
  // MNEE token
  if (q.includes('mnee') || q.includes('token') || q.includes('stablecoin')) {
    relevantContext.push(`MNEE Token: ${KNOWLEDGE_BASE.mnee.description}`);
    relevantContext.push(`Get MNEE: ${KNOWLEDGE_BASE.mnee.howToGet.join(', ')}`);
    relevantContext.push(`Swap URL: ${KNOWLEDGE_BASE.mnee.swap}`);
  }
  
  // Escrow operations
  if (q.includes('create') || q.includes('escrow') || q.includes('how to')) {
    relevantContext.push(`Create Flow: ${KNOWLEDGE_BASE.flows.createEscrow.steps.join(' ')}`);
    relevantContext.push(`Tips: ${KNOWLEDGE_BASE.flows.createEscrow.tips.join(', ')}`);
  }
  
  // Release
  if (q.includes('release') || q.includes('pay')) {
    relevantContext.push(`Release Flow: ${KNOWLEDGE_BASE.flows.releaseFlow.steps.join(' ')}`);
    relevantContext.push(`Release Policy: ${KNOWLEDGE_BASE.policies.release.content}`);
  }
  
  // Refund
  if (q.includes('refund') || q.includes('cancel') || q.includes('return')) {
    relevantContext.push(`Refund Flow: ${KNOWLEDGE_BASE.flows.refundFlow.steps.join(' ')}`);
    relevantContext.push(`Refund Policy: ${KNOWLEDGE_BASE.policies.refund.content}`);
  }
  
  // Dispute
  if (q.includes('dispute') || q.includes('problem') || q.includes('issue') || q.includes('conflict')) {
    relevantContext.push(`Dispute Flow: ${KNOWLEDGE_BASE.flows.disputeFlow.steps.join(' ')}`);
    relevantContext.push(`Dispute Policy: ${KNOWLEDGE_BASE.policies.dispute.content}`);
  }
  
  // AI/Agent
  if (q.includes('ai') || q.includes('agent') || q.includes('automat') || q.includes('autonomous')) {
    relevantContext.push(`AI System: ${KNOWLEDGE_BASE.aiAgents.overview}`);
    relevantContext.push(`Agents: Compliance (${KNOWLEDGE_BASE.aiAgents.agents.complianceAgent.role}), Ops (${KNOWLEDGE_BASE.aiAgents.agents.opsAgent.role}), Arbiter (${KNOWLEDGE_BASE.aiAgents.agents.arbiterAgent.role})`);
    relevantContext.push(`AI Flow: ${KNOWLEDGE_BASE.flows.aiAgentFlow.steps.join(' ')}`);
  }
  
  // Arbiter
  if (q.includes('arbiter') || q.includes('who can')) {
    relevantContext.push(`Arbiter Role: ${KNOWLEDGE_BASE.escrow.roles.arbiter}`);
    relevantContext.push(`Release: Only arbiter can release. Refund: Arbiter or payer after deadline.`);
  }
  
  // Deadline
  if (q.includes('deadline') || q.includes('time') || q.includes('expire')) {
    relevantContext.push(`Deadline Policy: ${KNOWLEDGE_BASE.policies.deadlines.content}`);
  }
  
  // Technical/Architecture
  if (q.includes('technical') || q.includes('architecture') || q.includes('stack') || q.includes('how does it work')) {
    relevantContext.push(`Tech Stack: ${JSON.stringify(KNOWLEDGE_BASE.architecture.stack)}`);
    relevantContext.push(`Security: ${KNOWLEDGE_BASE.architecture.security.join(', ')}`);
  }
  
  // Smart contract
  if (q.includes('contract') || q.includes('solidity') || q.includes('function')) {
    relevantContext.push(`Contract Functions: ${Object.keys(KNOWLEDGE_BASE.escrow.functions).join(', ')}`);
    relevantContext.push(`Events: ${KNOWLEDGE_BASE.escrow.events.join(', ')}`);
  }
  
  // Safety/Security
  if (q.includes('safe') || q.includes('secure') || q.includes('trust')) {
    relevantContext.push(`Security: ${KNOWLEDGE_BASE.architecture.security.join(', ')}`);
    relevantContext.push(`Contract Security: ${KNOWLEDGE_BASE.escrow.security.join(', ')}`);
  }
  
  // Check FAQ for direct matches
  const faqMatch = KNOWLEDGE_BASE.faq.find(f => 
    q.includes(f.q.toLowerCase().slice(0, 20)) || 
    f.q.toLowerCase().includes(q.slice(0, 30))
  );
  if (faqMatch) {
    relevantContext.push(`FAQ Answer: ${faqMatch.a}`);
  }
  
  // Add live stats if available
  if (liveStats.created !== undefined) {
    relevantContext.push(`Live Stats: ${liveStats.created} escrows created, ${liveStats.released} released, ${liveStats.refunded} refunded`);
  }
  
  // If no specific context matched, provide general overview
  if (relevantContext.length === 0) {
    relevantContext.push(`AutoTrust Paymesh is an AI-powered MNEE escrow platform. I can help with: creating escrows, releases, refunds, disputes, AI agents, policies, and technical details.`);
  }
  
  return relevantContext.join('\n\n');
}

export function getQuickAnswer(query) {
  const q = query.toLowerCase();
  
  // Direct FAQ matches
  for (const faq of KNOWLEDGE_BASE.faq) {
    if (q.includes(faq.q.toLowerCase().replace('?', '').slice(0, 25))) {
      return faq.a;
    }
  }
  
  // Glossary lookups
  for (const [term, definition] of Object.entries(KNOWLEDGE_BASE.glossary)) {
    if (q === `what is ${term}` || q === `what's ${term}` || q === `define ${term}`) {
      return `**${term}**: ${definition}`;
    }
  }
  
  return null;
}
