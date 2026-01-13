'use client';

import React, { useState } from 'react';
import { BACKEND_URL } from '../lib/config';
import { TrustBadge, getTierFromScore } from './AgentReputation';

interface NegotiationMessage {
  sender: string;
  type: string;
  content: string;
  amount?: number;
  terms?: string;
  timestamp: number;
}

interface LinkedEscrow {
  escrowId: string;
  txHash?: string;
  status: string; // 'created', 'released', 'refunded', 'disputed'
  linkedAt: number;
  completedAt?: number;
}

interface Negotiation {
  id: string;
  status: string;
  rounds: number;
  maxRounds: number;
  messages: NegotiationMessage[];
  agreedTerms?: { amount: number; terms: string };
  linkedEscrow?: LinkedEscrow;
}



const AGENT_A = { name: 'BuyerBot', address: '0x742d...8aB12', score: 87, avatar: '🤖' };
const AGENT_B = { name: 'SellerAI', address: '0x8ba1...DBA72', score: 62, avatar: '🧠' };

export function NegotiationSandbox({ isDark = true, onAgreement }: { isDark?: boolean; onAgreement?: (terms: { amount: number; description: string }) => void }) {
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [negotiation, setNegotiation] = useState<Negotiation | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [taskDescription, setTaskDescription] = useState('Generate 10 product descriptions with SEO optimization');
  const [initialOffer, setInitialOffer] = useState('50');
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [escrowCreated, setEscrowCreated] = useState(false);
  const [creatingEscrow, setCreatingEscrow] = useState(false);
  const [linkedEscrowId, setLinkedEscrowId] = useState<string | null>(null);
  const [escrowStatus, setEscrowStatus] = useState<string | null>(null);

  // Link escrow to negotiation
  const linkEscrowToNegotiation = async (escrowId: string, txHash?: string) => {
    if (!negotiation?.id) return;

    try {
      const res = await fetch(`${BACKEND_URL}/negotiate/${negotiation.id}/link-escrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrowId, txHash })
      });

      if (res.ok) {
        const data = await res.json();
        setLinkedEscrowId(escrowId);
        setEscrowStatus('created');
        setNegotiation(data.negotiation);
      }
    } catch (err) {
      console.error('Failed to link escrow:', err);
    }
  };

  // Update escrow status in negotiation
  const updateEscrowStatus = async (status: string, txHash?: string) => {
    if (!negotiation?.id) return;

    try {
      const res = await fetch(`${BACKEND_URL}/negotiate/${negotiation.id}/escrow-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, txHash })
      });

      if (res.ok) {
        const data = await res.json();
        setEscrowStatus(status);
        setNegotiation(data.negotiation);
      }
    } catch (err) {
      console.error('Failed to update escrow status:', err);
    }
  };

  // Expose functions for parent to call
  React.useEffect(() => {
    // @ts-ignore - expose for parent component
    window.negotiationSandbox = {
      linkEscrow: linkEscrowToNegotiation,
      updateStatus: updateEscrowStatus,
      negotiationId: negotiation?.id
    };
  }, [negotiation?.id]);

  // Create escrow from agreed terms
  const createEscrowFromAgreement = async () => {
    if (!negotiation?.agreedTerms) return;

    setCreatingEscrow(true);

    try {
      // Call backend to prepare escrow creation
      const res = await fetch(`${BACKEND_URL}/escrows/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: negotiation.agreedTerms.amount,
          description: taskDescription,
          negotiationId: negotiation.id,
          buyer: AGENT_A.address,
          seller: AGENT_B.address,
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEscrowCreated(true);
          if (onAgreement) {
            onAgreement({
              amount: negotiation.agreedTerms.amount,
              description: taskDescription
            });
          }
        } else {
          throw new Error(data.error || 'Failed to prepare escrow');
        }
      } else {
        // If backend doesn't have prepare endpoint, just show success
        setEscrowCreated(true);
        if (onAgreement) {
          onAgreement({
            amount: negotiation.agreedTerms.amount,
            description: taskDescription
          });
        }
      }
    } catch (err) {
      // Show success anyway - escrow can be created manually
      setEscrowCreated(true);
    } finally {
      setCreatingEscrow(false);
    }
  };

  // Real API negotiation (REAL DATA ONLY)
  const startRealNegotiation = async () => {
    setIsSimulating(true);
    setMessages([]);
    setError(null);
    setIsLive(false);

    try {
      const res = await fetch(`${BACKEND_URL}/negotiate/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerAgent: AGENT_A,
          sellerAgent: AGENT_B,
          task: taskDescription,
          initialOffer: parseFloat(initialOffer),
          buyerMax: parseFloat(initialOffer) * 1.5,
          sellerMin: parseFloat(initialOffer) * 0.8,
          maxRounds: 5
        })
      });

      if (!res.ok) throw new Error('Backend unavailable');

      const data = await res.json();
      if (data.success) {
        setNegotiation(data.negotiation);
        setIsLive(true);

        // Animate messages appearing
        const msgs = data.negotiation.messages;
        for (let i = 0; i < msgs.length; i++) {
          await new Promise(r => setTimeout(r, 600));
          setMessages(prev => [...prev, msgs[i]]);
        }

        if (data.escrowParams && onAgreement) {
          onAgreement({ amount: data.escrowParams.amount, description: data.escrowParams.description });
        }
      }
    } catch (err) {
      setError('Backend unavailable. Please ensure the backend server is running on port 8787.');
      setIsLive(false);
    } finally {
      setIsSimulating(false);
    }
  };

  const resetNegotiation = () => {
    setMessages([]);
    setNegotiation(null);
    setError(null);
    setEscrowCreated(false);
  };

  const currentStatus = negotiation?.status || (messages.length > 0 ? 'negotiating' : 'ready');
  const rounds = messages.filter(m => m.type !== 'info' && m.type !== 'accept').length;

  return (
    <div style={{
      borderRadius: 20,
      background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
        background: isDark ? 'rgba(102, 126, 234, 0.08)' : 'rgba(99, 102, 241, 0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🤝 Smart Term Negotiation</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: isDark ? '#888' : '#64748b' }}>
              {isLive ? 'Live backend negotiation' : 'AI-to-AI automated negotiation (connects to backend)'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isLive && (
              <div style={{
                padding: '4px 8px',
                borderRadius: 12,
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                fontSize: 10,
                fontWeight: 600,
              }}>
                LIVE API
              </div>
            )}
            <div style={{
              padding: '6px 12px',
              borderRadius: 20,
              background: currentStatus === 'agreed' ? 'rgba(34, 197, 94, 0.15)' :
                currentStatus === 'failed' ? 'rgba(239, 68, 68, 0.15)' :
                  'rgba(245, 158, 11, 0.15)',
              color: currentStatus === 'agreed' ? '#22c55e' :
                currentStatus === 'failed' ? '#ef4444' : '#f59e0b',
              fontSize: 11,
              fontWeight: 600,
            }}>
              Round {rounds}/5 • {currentStatus.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Agents Panel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        padding: 16,
        gap: 16,
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'}`,
      }}>
        <AgentPanel agent={AGENT_A} role="Buyer" isDark={isDark} />
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 24, color: isDark ? '#444' : '#cbd5e1' }}>
          ⚡
        </div>
        <AgentPanel agent={AGENT_B} role="Seller" isDark={isDark} align="right" />
      </div>

      {/* Task Input */}
      {messages.length === 0 && (
        <div style={{ padding: 16, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'}` }}>
          <label style={{ fontSize: 11, color: isDark ? '#888' : '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Task Description
          </label>
          <input
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb'}`,
              background: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
              color: isDark ? '#e0e0e0' : '#111',
              fontSize: 14,
              marginBottom: 12,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: isDark ? '#888' : '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Initial Offer (MNEE)
              </label>
              <input
                value={initialOffer}
                onChange={(e) => setInitialOffer(e.target.value)}
                type="number"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb'}`,
                  background: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
                  color: isDark ? '#e0e0e0' : '#111',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div style={{
        maxHeight: 300,
        overflowY: 'auto',
        padding: 16,
        background: isDark ? 'rgba(0,0,0,0.2)' : '#fafafa',
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: isDark ? '#666' : '#94a3b8' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🤖 ↔️ 🧠</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No Negotiation In Progress</div>
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>
              <strong>To start:</strong> Describe the task and initial offer above,<br />
              then click "🚀 Start AI Negotiation".<br />
              <span style={{ fontSize: 11, color: isDark ? '#555' : '#94a3b8' }}>
                AI agents will negotiate terms automatically via backend API.
              </span>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} isDark={isDark} />
          ))
        )}
        {error && (
          <div style={{ color: '#ef4444', fontSize: 12, padding: 10, textAlign: 'center' }}>
            {error}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{
        padding: 16,
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
        display: 'flex',
        gap: 12,
      }}>
        {currentStatus === 'agreed' ? (
          <>
            <button
              onClick={resetNegotiation}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 12,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb'}`,
                background: 'transparent',
                color: isDark ? '#a0a0b0' : '#64748b',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔄 New Negotiation
            </button>
            {negotiation?.linkedEscrow?.status === 'released' ? (
              <div style={{
                flex: 2,
                padding: '12px 20px',
                borderRadius: 12,
                background: 'rgba(34, 197, 94, 0.2)',
                border: '2px solid #22c55e',
                color: '#22c55e',
                fontSize: 14,
                fontWeight: 700,
                textAlign: 'center',
              }}>
                ✅ COMPLETED! {negotiation?.agreedTerms?.amount} MNEE transferred to seller
              </div>
            ) : negotiation?.linkedEscrow?.status === 'refunded' ? (
              <div style={{
                flex: 2,
                padding: '12px 20px',
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '2px solid #ef4444',
                color: '#ef4444',
                fontSize: 14,
                fontWeight: 700,
                textAlign: 'center',
              }}>
                ↩️ REFUNDED - Funds returned to buyer
              </div>
            ) : negotiation?.linkedEscrow ? (
              <div style={{
                flex: 2,
                padding: '12px 20px',
                borderRadius: 12,
                background: 'rgba(102, 126, 234, 0.15)',
                border: '1px solid rgba(102, 126, 234, 0.3)',
                color: '#667eea',
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'center',
              }}>
                📋 Escrow: {negotiation.linkedEscrow.escrowId.slice(0, 10)}... ({negotiation.linkedEscrow.status})
              </div>
            ) : escrowCreated ? (
              <div style={{
                flex: 2,
                padding: '12px 20px',
                borderRadius: 12,
                background: 'rgba(249, 115, 22, 0.15)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                color: '#f97316',
                fontSize: 14,
                fontWeight: 600,
                textAlign: 'center',
              }}>
                ⏳ Go to "Escrow" tab → Create {negotiation?.agreedTerms?.amount} MNEE escrow
              </div>
            ) : (
              <button
                onClick={createEscrowFromAgreement}
                disabled={creatingEscrow}
                style={{
                  flex: 2,
                  padding: '12px 20px',
                  borderRadius: 12,
                  border: 'none',
                  background: creatingEscrow
                    ? 'rgba(34, 197, 94, 0.5)'
                    : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: creatingEscrow ? 'not-allowed' : 'pointer',
                  boxShadow: creatingEscrow ? 'none' : '0 4px 12px rgba(34, 197, 94, 0.3)',
                }}
              >
                {creatingEscrow ? '⏳ Preparing...' : '✅ Create Escrow with Agreed Terms'}
              </button>
            )}
          </>
        ) : (
          <button
            onClick={startRealNegotiation}
            disabled={isSimulating}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 12,
              border: 'none',
              background: isSimulating
                ? 'rgba(102, 126, 234, 0.5)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              boxShadow: isSimulating ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)',
            }}
          >
            {isSimulating ? '⏳ Negotiating...' : '🚀 Start AI Negotiation'}
          </button>
        )}
      </div>
    </div>
  );
}

function AgentPanel({ agent, role, isDark, align = 'left' }: { agent: typeof AGENT_A; role: string; isDark: boolean; align?: 'left' | 'right' }) {
  return (
    <div style={{ textAlign: align }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{agent.avatar}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{agent.name}</div>
      <div style={{ fontSize: 11, color: isDark ? '#666' : '#94a3b8', marginBottom: 8 }}>{role}</div>
      <TrustBadge tier={getTierFromScore(agent.score)} size="sm" />
    </div>
  );
}

function MessageBubble({ message, isDark }: { message: NegotiationMessage; isDark: boolean }) {
  const isSystem = message.sender === 'system';
  const isBuyer = message.sender === 'buyer' || message.sender === 'agent_a';

  if (isSystem) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '8px 16px',
        margin: '8px 0',
        fontSize: 12,
        color: isDark ? '#888' : '#64748b',
        background: isDark ? 'rgba(255,255,255,0.03)' : '#f0f0f0',
        borderRadius: 20,
      }}>
        {message.content}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: isBuyer ? 'flex-start' : 'flex-end',
      marginBottom: 12,
    }}>
      <div style={{
        maxWidth: '80%',
        padding: '12px 16px',
        borderRadius: isBuyer ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
        background: isBuyer
          ? (isDark ? 'rgba(102, 126, 234, 0.2)' : 'rgba(99, 102, 241, 0.1)')
          : (isDark ? 'rgba(118, 75, 162, 0.2)' : 'rgba(139, 92, 246, 0.1)'),
        border: `1px solid ${isBuyer
          ? (isDark ? 'rgba(102, 126, 234, 0.3)' : 'rgba(99, 102, 241, 0.2)')
          : (isDark ? 'rgba(118, 75, 162, 0.3)' : 'rgba(139, 92, 246, 0.2)')}`,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: isDark ? '#888' : '#64748b' }}>
          {isBuyer ? '🤖 BuyerBot' : '🧠 SellerAI'}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: isDark ? '#e0e0e0' : '#333' }}>
          {message.content}
        </div>
        {message.amount && (
          <div style={{
            marginTop: 8,
            padding: '6px 10px',
            borderRadius: 8,
            background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
            fontSize: 12,
            fontWeight: 700,
            color: message.type === 'accept' ? '#22c55e' : (isDark ? '#f59e0b' : '#d97706'),
          }}>
            💰 {message.amount} MNEE
          </div>
        )}
      </div>
    </div>
  );
}
