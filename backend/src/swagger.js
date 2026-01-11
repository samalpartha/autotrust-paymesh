/**
 * AutoTrust Paymesh API - OpenAPI/Swagger Documentation
 * Complete API specification for the AI-powered escrow system
 */

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'AutoTrust Paymesh API',
    version: '3.0.0',
    description: `
# 🚀 AutoTrust Paymesh - AI-Powered Escrow for AI Agents

The complete backend API for trustless, AI-managed MNEE stablecoin escrows.

## Features

- **🔒 Escrow Management** - Create, release, and refund escrows
- **🤖 AI Agents** - Autonomous decision-making with Groq/OpenAI
- **🧠 MeshMind** - Intelligent knowledge assistant
- **🤝 Negotiation Sandbox** - AI-to-AI term negotiation
- **🏆 Agent Reputation** - DID-based trust scoring
- **⚖️ AI Arbitration** - Automated dispute resolution
- **💸 Streaming Payments** - Pay-per-token micropayments
- **🔗 Chained Escrows** - Multi-hop payment dependencies

## Authentication

This API currently operates without authentication for local development.
For production, implement JWT or API key authentication.

## Rate Limits

No rate limits in development mode.
    `,
    contact: {
      name: 'AutoTrust Paymesh',
      url: 'https://github.com/autotrust-paymesh'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:8787',
      description: 'Local Development Server'
    }
  ],
  tags: [
    { name: 'Health', description: 'System health and status' },
    { name: 'Events', description: 'Blockchain event streaming' },
    { name: 'Escrow', description: 'Core escrow operations' },
    { name: 'Analytics', description: 'Protocol metrics and statistics' },
    { name: 'AI Agents', description: 'Autonomous AI decision system' },
    { name: 'MeshMind', description: 'Intelligent knowledge assistant' },
    { name: 'Negotiation', description: 'AI-to-AI negotiation sandbox' },
    { name: 'Agent Reputation', description: 'DID-based trust scoring' },
    { name: 'Arbitration', description: 'AI-powered dispute resolution' },
    { name: 'Streaming', description: 'Pay-per-token streaming payments' },
    { name: 'Chained Escrows', description: 'Multi-hop payment dependencies' },
    { name: 'Evidence', description: 'Evidence and voice escalation' },
    { name: 'Demo', description: 'Demo and sample data' }
  ],
  paths: {
    // ======================= HEALTH =======================
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Get system health and AI status',
        description: 'Returns server status, AI provider info, and feature list',
        operationId: 'getHealth',
        responses: {
          200: {
            description: 'System is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
                example: {
                  ok: true,
                  aiEnabled: true,
                  aiProvider: 'Groq Llama 3.3',
                  network: 'ethereum',
                  escrow: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
                  features: ['events', 'meshmind-assistant', 'ai-agent', 'streaming-payments'],
                  stats: { activeStreams: 2, registeredAgents: 5, negotiations: 3 }
                }
              }
            }
          }
        }
      }
    },

    // ======================= EVENTS =======================
    '/events': {
      get: {
        tags: ['Events'],
        summary: 'Get all blockchain events',
        description: 'Returns recent EscrowCreated, EscrowReleased, and EscrowRefunded events',
        operationId: 'getEvents',
        responses: {
          200: {
            description: 'List of events',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EventsResponse' }
              }
            }
          }
        }
      }
    },

    // ======================= ESCROW =======================
    '/escrow/{escrowId}': {
      get: {
        tags: ['Escrow'],
        summary: 'Get escrow details',
        description: 'Fetch escrow data from the smart contract including metadata',
        operationId: 'getEscrow',
        parameters: [
          {
            name: 'escrowId',
            in: 'path',
            required: true,
            description: '32-byte hex escrow ID',
            schema: { type: 'string', pattern: '^0x[a-fA-F0-9]{64}$' },
            example: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
          }
        ],
        responses: {
          200: {
            description: 'Escrow details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EscrowDetails' }
              }
            }
          },
          400: { description: 'Invalid escrow ID format' },
          500: { description: 'Contract query failed' }
        }
      }
    },

    // ======================= ANALYTICS =======================
    '/analytics': {
      get: {
        tags: ['Analytics'],
        summary: 'Get real-time protocol analytics',
        description: 'Returns TVL, volume, escrow counts, agent stats, and recent activity from blockchain',
        operationId: 'getAnalytics',
        responses: {
          200: {
            description: 'Protocol metrics',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AnalyticsResponse' },
                example: {
                  success: true,
                  isLive: true,
                  source: 'contract+events',
                  metrics: {
                    tvl: '1250.50',
                    totalVolume: '45000.00',
                    activeEscrows: 23,
                    successRate: 94.5
                  }
                }
              }
            }
          }
        }
      }
    },

    // ======================= AI AGENTS =======================
    '/agent/decision/{escrowId}': {
      post: {
        tags: ['AI Agents'],
        summary: 'Get AI agent recommendation',
        description: 'Multi-agent system analyzes escrow and returns RELEASE/REFUND/HOLD recommendation',
        operationId: 'getAgentDecision',
        parameters: [
          {
            name: 'escrowId',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          description: 'Optional context for decision',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  additionalContext: { type: 'string', description: 'Additional info for AI' },
                  voiceEscalation: { type: 'boolean', description: 'Customer escalated via voice' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'AI decision',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AgentDecision' }
              }
            }
          }
        }
      }
    },
    '/agent/execute/{escrowId}': {
      post: {
        tags: ['AI Agents'],
        summary: 'Execute AI decision on-chain',
        description: 'Execute the recommended RELEASE or REFUND action on the blockchain',
        operationId: 'executeAgentDecision',
        parameters: [
          {
            name: 'escrowId',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['action', 'signerPrivateKey'],
                properties: {
                  action: { type: 'string', enum: ['RELEASE', 'REFUND'] },
                  signerPrivateKey: { type: 'string', description: 'Private key of arbiter' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Transaction executed' },
          400: { description: 'Invalid action or missing signer' }
        }
      }
    },
    '/agent/decisions': {
      get: {
        tags: ['AI Agents'],
        summary: 'Get all AI decisions',
        description: 'Returns history of AI agent decisions',
        operationId: 'getAgentDecisions',
        responses: {
          200: {
            description: 'List of decisions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    decisions: { type: 'array', items: { $ref: '#/components/schemas/AgentDecision' } },
                    aiEnabled: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/agent/autonomous-demo': {
      post: {
        tags: ['AI Agents'],
        summary: 'Run autonomous agent demo',
        description: 'Full autonomous flow: analyze escrow, make decision, optionally execute on-chain',
        operationId: 'autonomousDemo',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['escrowId'],
                properties: {
                  escrowId: { type: 'string' },
                  serviceProof: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      description: { type: 'string' },
                      data: { type: 'object' }
                    }
                  },
                  signerPrivateKey: { type: 'string', description: 'Optional: execute if provided' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Autonomous analysis complete' }
        }
      }
    },

    // ======================= MESHMIND =======================
    '/copilot/query': {
      post: {
        tags: ['MeshMind'],
        summary: 'Ask MeshMind a question',
        description: 'Intelligent knowledge assistant powered by Groq Llama 3.3',
        operationId: 'meshMindQuery',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['query'],
                properties: {
                  query: { type: 'string', example: 'How do I create an escrow?' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'MeshMind response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MeshMindResponse' }
              }
            }
          }
        }
      }
    },
    '/copilot/suggestions': {
      get: {
        tags: ['MeshMind'],
        summary: 'Get suggested questions',
        description: 'Returns common questions to ask MeshMind',
        operationId: 'getMeshMindSuggestions',
        responses: {
          200: {
            description: 'Suggestions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    suggestions: { type: 'array', items: { type: 'string' } },
                    aiEnabled: { type: 'boolean' },
                    provider: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },

    // ======================= NEGOTIATION =======================
    '/negotiate/start': {
      post: {
        tags: ['Negotiation'],
        summary: 'Start new negotiation',
        description: 'Initialize AI-to-AI negotiation session',
        operationId: 'startNegotiation',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['buyerAgent', 'sellerAgent', 'task', 'initialOffer'],
                properties: {
                  buyerAgent: { type: 'string', example: 'BuyerBot' },
                  sellerAgent: { type: 'string', example: 'SellerAI' },
                  task: { type: 'string', example: 'Generate 10 product descriptions with SEO optimization' },
                  initialOffer: { type: 'number', example: 50 },
                  maxRounds: { type: 'integer', default: 5 }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Negotiation started',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NegotiationResponse' }
              }
            }
          }
        }
      }
    },
    '/negotiate/{id}': {
      get: {
        tags: ['Negotiation'],
        summary: 'Get negotiation status',
        operationId: 'getNegotiation',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Negotiation details' },
          404: { description: 'Negotiation not found' }
        }
      }
    },
    '/negotiate/{id}/counter': {
      post: {
        tags: ['Negotiation'],
        summary: 'Submit counter-offer',
        operationId: 'counterNegotiation',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'by'],
                properties: {
                  amount: { type: 'number' },
                  terms: { type: 'string' },
                  by: { type: 'string', enum: ['buyer', 'seller'] }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Counter submitted' }
        }
      }
    },
    '/negotiate/{id}/accept': {
      post: {
        tags: ['Negotiation'],
        summary: 'Accept current offer',
        operationId: 'acceptNegotiation',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  by: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Negotiation accepted, ready for escrow' }
        }
      }
    },
    '/negotiate/auto': {
      post: {
        tags: ['Negotiation'],
        summary: 'Auto-negotiate (AI runs full session)',
        description: 'AI automatically negotiates until agreement or timeout',
        operationId: 'autoNegotiate',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['task', 'initialOffer'],
                properties: {
                  buyerAgent: { type: 'string' },
                  sellerAgent: { type: 'string' },
                  task: { type: 'string' },
                  initialOffer: { type: 'number' },
                  buyerMax: { type: 'number' },
                  sellerMin: { type: 'number' },
                  maxRounds: { type: 'integer' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Auto-negotiation complete' }
        }
      }
    },
    '/negotiations': {
      get: {
        tags: ['Negotiation'],
        summary: 'List all negotiations',
        operationId: 'listNegotiations',
        responses: {
          200: { description: 'List of negotiations' }
        }
      }
    },

    // ======================= AGENT REPUTATION =======================
    '/agents/register': {
      post: {
        tags: ['Agent Reputation'],
        summary: 'Register new agent',
        description: 'Register an AI agent with initial reputation score',
        operationId: 'registerAgent',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['address'],
                properties: {
                  address: { type: 'string', example: '0x742d35Cc6634C0532925a3b844Bc9e7595f8aB12' },
                  name: { type: 'string', example: 'CodeBot Pro' },
                  type: { type: 'string', enum: ['ai', 'human', 'hybrid'], default: 'ai' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Agent registered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AgentProfile' }
              }
            }
          },
          400: { description: 'Agent already registered' }
        }
      }
    },
    '/agents/{address}': {
      get: {
        tags: ['Agent Reputation'],
        summary: 'Get agent profile',
        operationId: 'getAgentProfile',
        parameters: [
          { name: 'address', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Agent profile' }
        }
      }
    },
    '/agents/{address}/update': {
      post: {
        tags: ['Agent Reputation'],
        summary: 'Update agent stats',
        description: 'Update agent reputation after escrow events',
        operationId: 'updateAgentStats',
        parameters: [
          { name: 'address', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['event'],
                properties: {
                  event: {
                    type: 'string',
                    enum: ['escrow_created', 'escrow_released', 'escrow_refunded', 'dispute_raised', 'dispute_won', 'dispute_lost']
                  },
                  amount: { type: 'string' },
                  success: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Stats updated' }
        }
      }
    },
    '/agents': {
      get: {
        tags: ['Agent Reputation'],
        summary: 'Get agent leaderboard',
        description: 'Returns top agents sorted by reputation score',
        operationId: 'getAgentLeaderboard',
        responses: {
          200: {
            description: 'Leaderboard',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agents: { type: 'array', items: { $ref: '#/components/schemas/AgentProfile' } },
                    total: { type: 'integer' },
                    tiers: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    },

    // ======================= ARBITRATION =======================
    '/arbitration/{escrowId}/evidence': {
      post: {
        tags: ['Arbitration'],
        summary: 'Submit dispute evidence',
        operationId: 'submitEvidence',
        parameters: [
          { name: 'escrowId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['party', 'content'],
                properties: {
                  party: { type: 'string', enum: ['claimant', 'respondent'] },
                  evidenceType: { type: 'string', enum: ['text', 'screenshot', 'document', 'chat_log'] },
                  content: { type: 'string' },
                  attachmentUrl: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Evidence submitted' }
        }
      },
      get: {
        tags: ['Arbitration'],
        summary: 'Get dispute evidence',
        operationId: 'getEvidence',
        parameters: [
          { name: 'escrowId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Evidence list' }
        }
      }
    },
    '/arbitration/{escrowId}/analyze': {
      post: {
        tags: ['Arbitration'],
        summary: 'Run AI arbitration analysis',
        description: 'AI analyzes evidence from both parties and returns verdict',
        operationId: 'analyzeDispute',
        parameters: [
          { name: 'escrowId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: {
            description: 'AI verdict',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ArbitrationVerdict' }
              }
            }
          },
          404: { description: 'No evidence found' }
        }
      }
    },
    '/arbitration/history': {
      get: {
        tags: ['Arbitration'],
        summary: 'Get arbitration history',
        operationId: 'getArbitrationHistory',
        responses: {
          200: { description: 'Arbitration history and pending disputes' }
        }
      }
    },

    // ======================= STREAMING =======================
    '/streams/create': {
      post: {
        tags: ['Streaming'],
        summary: 'Create payment stream',
        description: 'Start streaming payments at specified rate',
        operationId: 'createStream',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sender', 'receiver', 'ratePerSecond', 'totalBudget'],
                properties: {
                  sender: { type: 'string', example: '0x742d35Cc6634C0532925a3b844Bc9e7595f8aB12' },
                  receiver: { type: 'string', example: '0x8ba1f109551bD432803012645Ac136ddd64DBA72' },
                  ratePerSecond: { type: 'number', example: 0.05 },
                  totalBudget: { type: 'number', example: 100 },
                  description: { type: 'string', example: 'LLM inference service' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Stream created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StreamResponse' }
              }
            }
          }
        }
      }
    },
    '/streams/{id}': {
      get: {
        tags: ['Streaming'],
        summary: 'Get stream status',
        description: 'Returns current streamed amount, withdrawable balance, and remaining funds',
        operationId: 'getStreamStatus',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Stream status' },
          404: { description: 'Stream not found' }
        }
      }
    },
    '/streams/{id}/withdraw': {
      post: {
        tags: ['Streaming'],
        summary: 'Withdraw from stream',
        description: 'Receiver claims accumulated funds',
        operationId: 'withdrawStream',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Withdrawal successful' },
          400: { description: 'Nothing to withdraw' }
        }
      }
    },
    '/streams/{id}/cancel': {
      post: {
        tags: ['Streaming'],
        summary: 'Cancel stream',
        description: 'Sender stops stream and reclaims remaining funds',
        operationId: 'cancelStream',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Stream cancelled' }
        }
      }
    },
    '/streams': {
      get: {
        tags: ['Streaming'],
        summary: 'List all streams',
        operationId: 'listStreams',
        responses: {
          200: { description: 'List of streams' }
        }
      }
    },

    // ======================= CHAINED ESCROWS =======================
    '/escrows/chain': {
      post: {
        tags: ['Chained Escrows'],
        summary: 'Link escrows in chain',
        description: 'Create dependency between parent and child escrow',
        operationId: 'linkEscrows',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['parentId', 'childId'],
                properties: {
                  parentId: { type: 'string' },
                  childId: { type: 'string' },
                  dependencyType: { type: 'string', enum: ['release', 'partial', 'milestone'], default: 'release' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Escrows linked' }
        }
      }
    },
    '/escrows/{escrowId}/chain': {
      get: {
        tags: ['Chained Escrows'],
        summary: 'Get escrow chain info',
        operationId: 'getEscrowChain',
        parameters: [
          { name: 'escrowId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Chain info' }
        }
      }
    },
    '/escrows/chains': {
      get: {
        tags: ['Chained Escrows'],
        summary: 'List all chains',
        operationId: 'listAllChains',
        responses: {
          200: { description: 'All escrow chains' }
        }
      }
    },

    // ======================= EVIDENCE =======================
    '/evidence/{escrowId}': {
      post: {
        tags: ['Evidence'],
        summary: 'Upload evidence',
        operationId: 'uploadEvidence',
        parameters: [
          { name: 'escrowId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  imageUrl: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  classification: { type: 'string', enum: ['delivery_confirmed', 'delivery_failed', 'quality_issue', 'other'] },
                  description: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Evidence uploaded' }
        }
      }
    },
    '/voice/escalate': {
      post: {
        tags: ['Evidence'],
        summary: 'Voice escalation',
        description: 'Submit voice transcript for priority handling',
        operationId: 'voiceEscalate',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['escrowId', 'transcript'],
                properties: {
                  escrowId: { type: 'string' },
                  transcript: { type: 'string' },
                  sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative', 'urgent'] }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Voice escalation recorded and AI decision triggered' }
        }
      }
    },
    '/timeline/{escrowId}': {
      get: {
        tags: ['Evidence'],
        summary: 'Get escrow timeline',
        operationId: 'getTimeline',
        parameters: [
          { name: 'escrowId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Timeline events' }
        }
      }
    },
    '/webhooks/logs': {
      get: {
        tags: ['Evidence'],
        summary: 'Get webhook logs',
        operationId: 'getWebhookLogs',
        responses: {
          200: { description: 'Webhook delivery logs' }
        }
      }
    },

    // ======================= DEMO =======================
    '/demo/sample-escrow': {
      get: {
        tags: ['Demo'],
        summary: 'Get sample escrow data',
        description: 'Returns sample data for demonstration without wallet connection',
        operationId: 'getSampleEscrow',
        responses: {
          200: {
            description: 'Sample data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sampleEscrow: { type: 'object' },
                    sampleDecision: { type: 'object' },
                    howItWorks: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  components: {
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          aiEnabled: { type: 'boolean' },
          aiProvider: { type: 'string' },
          network: { type: 'string' },
          escrow: { type: 'string' },
          features: { type: 'array', items: { type: 'string' } },
          stats: {
            type: 'object',
            properties: {
              activeStreams: { type: 'integer' },
              registeredAgents: { type: 'integer' },
              negotiations: { type: 'integer' },
              pendingDisputes: { type: 'integer' }
            }
          }
        }
      },
      EventsResponse: {
        type: 'object',
        properties: {
          events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['EscrowCreated', 'EscrowReleased', 'EscrowRefunded'] },
                escrowId: { type: 'string' },
                payer: { type: 'string' },
                payee: { type: 'string' },
                amount: { type: 'string' },
                txHash: { type: 'string' },
                ts: { type: 'integer' }
              }
            }
          }
        }
      },
      EscrowDetails: {
        type: 'object',
        properties: {
          escrowId: { type: 'string' },
          payer: { type: 'string' },
          payee: { type: 'string' },
          arbiter: { type: 'string' },
          amount: { type: 'string' },
          deadline: { type: 'integer' },
          status: { type: 'integer', description: '0=None, 1=Funded, 2=Released, 3=Refunded' },
          metadata: { type: 'object' }
        }
      },
      AnalyticsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          isLive: { type: 'boolean' },
          source: { type: 'string' },
          metrics: {
            type: 'object',
            properties: {
              tvl: { type: 'string' },
              totalVolume: { type: 'string' },
              activeEscrows: { type: 'integer' },
              totalEscrows: { type: 'integer' },
              totalAgents: { type: 'integer' },
              successRate: { type: 'number' },
              disputeRate: { type: 'number' }
            }
          },
          recentActivity: { type: 'array', items: { type: 'object' } }
        }
      },
      AgentDecision: {
        type: 'object',
        properties: {
          escrowId: { type: 'string' },
          timestamp: { type: 'integer' },
          aiPowered: { type: 'boolean' },
          model: { type: 'string' },
          provider: { type: 'string' },
          recommendation: { type: 'string', enum: ['RELEASE', 'REFUND', 'HOLD'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          rationale: { type: 'string' },
          riskFlags: { type: 'array', items: { type: 'string' } },
          agentAnalysis: { type: 'object' },
          executed: { type: 'boolean' }
        }
      },
      MeshMindResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          query: { type: 'string' },
          answer: { type: 'string' },
          aiPowered: { type: 'boolean' },
          provider: { type: 'string' },
          stats: { type: 'object' },
          timestamp: { type: 'integer' }
        }
      },
      NegotiationResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          negotiation: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              buyerAgent: { type: 'string' },
              sellerAgent: { type: 'string' },
              task: { type: 'string' },
              status: { type: 'string', enum: ['negotiating', 'agreed', 'timeout', 'rejected'] },
              rounds: { type: 'integer' },
              currentOffer: { type: 'object' },
              messages: { type: 'array', items: { type: 'object' } },
              agreedTerms: { type: 'object' }
            }
          },
          escrowParams: { type: 'object' }
        }
      },
      AgentProfile: {
        type: 'object',
        properties: {
          address: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          score: { type: 'integer', minimum: 0, maximum: 100 },
          tier: { type: 'string', enum: ['Unverified', 'Bronze', 'Silver', 'Gold', 'Platinum'] },
          stats: {
            type: 'object',
            properties: {
              totalEscrows: { type: 'integer' },
              successfulReleases: { type: 'integer' },
              disputesRaised: { type: 'integer' },
              totalVolume: { type: 'string' }
            }
          },
          badges: { type: 'array', items: { type: 'string' } },
          registeredAt: { type: 'integer' },
          lastActive: { type: 'integer' }
        }
      },
      ArbitrationVerdict: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          escrowId: { type: 'string' },
          analysis: {
            type: 'object',
            properties: {
              verdict: { type: 'string', enum: ['RELEASE_TO_PAYEE', 'REFUND_TO_PAYER', 'SPLIT_50_50', 'NEEDS_MORE_INFO'] },
              confidence: { type: 'number' },
              reasoning: { type: 'string' },
              claimantStrength: { type: 'number' },
              respondentStrength: { type: 'number' },
              keyFactors: { type: 'array', items: { type: 'string' } },
              aiPowered: { type: 'boolean' },
              analyzedAt: { type: 'integer' }
            }
          }
        }
      },
      StreamResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          stream: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              sender: { type: 'string' },
              receiver: { type: 'string' },
              ratePerSecond: { type: 'number' },
              totalBudget: { type: 'number' },
              status: { type: 'string', enum: ['active', 'completed', 'cancelled'] },
              withdrawn: { type: 'number' },
              elapsedSeconds: { type: 'number' },
              streamedAmount: { type: 'number' },
              withdrawable: { type: 'number' },
              remaining: { type: 'number' },
              progress: { type: 'number' }
            }
          }
        }
      }
    }
  }
};
