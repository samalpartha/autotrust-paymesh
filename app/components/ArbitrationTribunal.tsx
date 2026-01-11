'use client';

import React, { useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';

interface DisputeCase {
  id: string;
  escrowId: string;
  claimant: { address: string; name: string; claim: string };
  respondent: { address: string; name: string; defense: string };
  amount: number;
  evidence: { type: string; description: string; submitted_by: string }[];
  status: 'pending' | 'ai_review' | 'ai_verdict' | 'appealed' | 'dao_vote' | 'resolved' | 'not_started';
  aiVerdict?: {
    decision: 'release' | 'refund' | 'split';
    confidence: number;
    reasoning: string;
    splitRatio?: { claimant: number; respondent: number };
  };
  daoVotes?: { release: number; refund: number; split: number };
}

const EMPTY_DISPUTE: DisputeCase = {
  id: '',
  escrowId: '',
  claimant: { address: '', name: 'Claimant', claim: '' },
  respondent: { address: '', name: 'Respondent', defense: '' },
  amount: 0,
  evidence: [],
  status: 'not_started',
};

export function ArbitrationTribunal({ isDark = true }: { isDark?: boolean }) {
  const [dispute, setDispute] = useState<DisputeCase>(EMPTY_DISPUTE);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [escrowIdInput, setEscrowIdInput] = useState('');
  const [newEvidence, setNewEvidence] = useState('');
  const [claimantClaim, setClaimantClaim] = useState('');
  const [respondentDefense, setRespondentDefense] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load dispute from escrow ID
  const loadDispute = async () => {
    if (!escrowIdInput || !escrowIdInput.startsWith('0x')) {
      setError('Please enter a valid escrow ID (0x...)');
      return;
    }
    
    setError(null);
    
    try {
      // Try to get existing evidence from backend
      const res = await fetch(`${BACKEND_URL}/arbitration/${escrowIdInput}/evidence`);
      if (res.ok) {
        const data = await res.json();
        
        setDispute({
          id: `dispute-${Date.now()}`,
          escrowId: escrowIdInput,
          claimant: { address: '', name: 'Claimant', claim: claimantClaim || 'No claim provided' },
          respondent: { address: '', name: 'Respondent', defense: respondentDefense || 'No defense provided' },
          amount: 0, // Would need to fetch from escrow contract
          evidence: [
            ...(data.evidence?.claimant || []).map((e: any) => ({ type: '📝 Claimant', description: e.content, submitted_by: 'claimant' })),
            ...(data.evidence?.respondent || []).map((e: any) => ({ type: '📝 Respondent', description: e.content, submitted_by: 'respondent' })),
          ],
          status: data.evidence?.aiAnalysis ? 'ai_verdict' : 'pending',
          aiVerdict: data.evidence?.aiAnalysis ? {
            decision: data.evidence.aiAnalysis.verdict?.includes('REFUND') ? 'refund' : 
                      data.evidence.aiAnalysis.verdict?.includes('RELEASE') ? 'release' : 'split',
            confidence: data.evidence.aiAnalysis.confidence || 0.5,
            reasoning: data.evidence.aiAnalysis.reasoning || '',
            splitRatio: { claimant: 50, respondent: 50 },
          } : undefined,
        });
        setIsLive(true);
      }
    } catch (err) {
      // Start fresh dispute
      setDispute({
        id: `dispute-${Date.now()}`,
        escrowId: escrowIdInput,
        claimant: { address: '', name: 'Claimant', claim: claimantClaim || 'No claim provided' },
        respondent: { address: '', name: 'Respondent', defense: respondentDefense || 'No defense provided' },
        amount: 0,
        evidence: [],
        status: 'pending',
      });
      setIsLive(true);
    }
  };

  // Submit evidence to backend
  const submitEvidenceToBackend = async (party: 'claimant' | 'respondent', content: string) => {
    try {
      await fetch(`${BACKEND_URL}/arbitration/${dispute.escrowId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          party,
          evidenceType: 'text',
          content
        })
      });
      return true;
    } catch (err) {
      console.log('Backend unavailable');
      return false;
    }
  };

  // Run AI arbitration (REAL BACKEND ONLY)
  const runAIArbitration = async () => {
    if (!dispute.escrowId) {
      setError('Please load a dispute first');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setDispute(d => ({ ...d, status: 'ai_review' }));
    setCurrentStep(1);

    // First submit evidence to backend
    for (const ev of dispute.evidence) {
      await submitEvidenceToBackend(ev.submitted_by === 'respondent' ? 'respondent' : 'claimant', ev.description);
    }

    // Backend AI analysis
    try {
      await delay(500);
      setCurrentStep(2);
      
      const res = await fetch(`${BACKEND_URL}/arbitration/${dispute.escrowId}/analyze`, {
        method: 'POST'
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.analysis) {
          setIsLive(true);
          await delay(500);
          setCurrentStep(3);
          await delay(500);
          setCurrentStep(4);
          
          // Map backend verdict to our format
          const verdictMap: Record<string, 'release' | 'refund' | 'split'> = {
            'RELEASE_TO_PAYEE': 'release',
            'REFUND_TO_PAYER': 'refund',
            'SPLIT_50_50': 'split',
            'NEEDS_MORE_INFO': 'split'
          };
          
          setDispute(d => ({
            ...d,
            status: 'ai_verdict',
            aiVerdict: {
              decision: verdictMap[data.analysis.verdict] || 'split',
              confidence: data.analysis.confidence,
              reasoning: data.analysis.reasoning,
              splitRatio: data.analysis.verdict === 'SPLIT_50_50' 
                ? { claimant: 50, respondent: 50 } 
                : data.analysis.verdict === 'REFUND_TO_PAYER'
                  ? { claimant: 100, respondent: 0 }
                  : { claimant: 0, respondent: 100 },
            },
          }));
          setIsAnalyzing(false);
          return;
        }
      }
      throw new Error('AI analysis failed');
    } catch (err) {
      setError('Backend unavailable. Please ensure the backend server is running.');
      setDispute(d => ({ ...d, status: 'pending' }));
      setCurrentStep(0);
    }
    setIsAnalyzing(false);
  };

  const appealToDAO = () => {
    setDispute(d => ({
      ...d,
      status: 'dao_vote',
      daoVotes: { release: 0, refund: 0, split: 0 },
    }));
  };

  const simulateDAOVote = async () => {
    for (let i = 0; i < 5; i++) {
      await delay(600);
      setDispute(d => ({
        ...d,
        daoVotes: {
          release: d.daoVotes!.release + (Math.random() > 0.6 ? 1 : 0),
          refund: d.daoVotes!.refund + (Math.random() > 0.7 ? 1 : 0),
          split: d.daoVotes!.split + (Math.random() > 0.4 ? 1 : 0),
        },
      }));
    }
    setDispute(d => ({ ...d, status: 'resolved' }));
  };

  const resetDispute = () => {
    setDispute(EMPTY_DISPUTE);
    setCurrentStep(0);
    setIsLive(false);
    setEscrowIdInput('');
    setClaimantClaim('');
    setRespondentDefense('');
    setError(null);
  };

  const addEvidence = () => {
    if (!newEvidence) return;
    setDispute(d => ({
      ...d,
      evidence: [...d.evidence, { type: '📝 User', description: newEvidence, submitted_by: 'claimant' }]
    }));
    setNewEvidence('');
  };

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
        background: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>⚖️ AI Arbitration Tribunal</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: isDark ? '#888' : '#64748b' }}>
              {isLive ? 'Live AI analysis from backend' : 'Enter escrow ID to start dispute resolution'}
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
                LIVE AI
              </div>
            )}
            <StatusBadge status={dispute.status} isDark={isDark} />
          </div>
        </div>
      </div>

      {/* Escrow ID Input - Only show if no dispute loaded */}
      {dispute.status === 'not_started' ? (
        <div style={{ padding: 20 }}>
          <div style={{
            textAlign: 'center',
            padding: 30,
            color: isDark ? '#666' : '#94a3b8',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚖️</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No Active Disputes</div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              <strong>To initiate arbitration:</strong><br/>
              1. Enter an escrow ID with a dispute (from "Escrow" tab)<br/>
              2. Describe both parties' claims below<br/>
              3. Click "Load Dispute" then run AI analysis<br/>
              <span style={{ fontSize: 11, color: isDark ? '#555' : '#94a3b8' }}>
                AI analyzes evidence and provides verdicts. Appeals go to DAO voting.
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              value={escrowIdInput}
              onChange={(e) => setEscrowIdInput(e.target.value)}
              placeholder="Escrow ID (0x...)"
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb'}`,
                background: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
                color: isDark ? '#e0e0e0' : '#111',
                fontSize: 14,
              }}
            />
            <input
              value={claimantClaim}
              onChange={(e) => setClaimantClaim(e.target.value)}
              placeholder="Claimant's claim (what's the issue?)"
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb'}`,
                background: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
                color: isDark ? '#e0e0e0' : '#111',
                fontSize: 14,
              }}
            />
            <input
              value={respondentDefense}
              onChange={(e) => setRespondentDefense(e.target.value)}
              placeholder="Respondent's defense (their side)"
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb'}`,
                background: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
                color: isDark ? '#e0e0e0' : '#111',
                fontSize: 14,
              }}
            />
            <button
              onClick={loadDispute}
              style={{
                padding: '14px 20px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              }}
            >
              ⚖️ Load Dispute
            </button>
          </div>
          
          {error && (
            <div style={{ marginTop: 12, color: '#ef4444', fontSize: 12, textAlign: 'center' }}>
              {error}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Dispute Parties */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            padding: 16,
            gap: 16,
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'}`,
          }}>
            <PartyCard 
              role="Claimant" 
              name={dispute.claimant.name} 
              address={dispute.claimant.address}
              claim={dispute.claimant.claim}
              isDark={isDark}
            />
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
              <div style={{ fontSize: 28 }}>⚔️</div>
              <div style={{ 
                padding: '4px 10px',
                borderRadius: 8,
                background: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b',
                fontSize: 12,
                fontWeight: 700,
              }}>
                {dispute.amount > 0 ? `${dispute.amount} MNEE` : 'Disputed'}
              </div>
            </div>
            <PartyCard 
              role="Respondent" 
              name={dispute.respondent.name} 
              address={dispute.respondent.address}
              claim={dispute.respondent.defense}
              isDark={isDark}
              align="right"
            />
          </div>

      {/* Evidence List */}
      <div style={{ padding: 16, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'}` }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: isDark ? '#888' : '#64748b' }}>
          📁 SUBMITTED EVIDENCE ({dispute.evidence.length} items)
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {dispute.evidence.map((e, i) => (
            <div key={i} style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
              fontSize: 12,
            }}>
              {e.type} {e.description}
            </div>
          ))}
        </div>
        
        {/* Add Evidence */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newEvidence}
            onChange={(e) => setNewEvidence(e.target.value)}
            placeholder="Add evidence description..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb'}`,
              background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
              color: isDark ? '#e0e0e0' : '#111',
              fontSize: 12,
            }}
          />
          <button
            onClick={addEvidence}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0',
              color: isDark ? '#e0e0e0' : '#333',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* AI Analysis Progress */}
      {(dispute.status === 'ai_review' || dispute.status === 'ai_verdict') && (
        <div style={{ padding: 16, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: isDark ? '#888' : '#64748b' }}>
            🤖 AI JUDGE ANALYSIS {isLive && <span style={{ color: '#22c55e' }}>(LIVE)</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Reviewing Contract', 'Analyzing Evidence', 'Checking Timeline', 'Rendering Verdict'].map((step, i) => (
              <div key={i} style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 10,
                background: currentStep > i 
                  ? 'rgba(34, 197, 94, 0.15)' 
                  : currentStep === i 
                    ? 'rgba(102, 126, 234, 0.15)' 
                    : (isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb'),
                border: `1px solid ${currentStep > i 
                  ? 'rgba(34, 197, 94, 0.3)' 
                  : currentStep === i 
                    ? 'rgba(102, 126, 234, 0.3)' 
                    : 'transparent'}`,
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: currentStep >= i ? (isDark ? '#e0e0e0' : '#333') : (isDark ? '#555' : '#94a3b8'),
              }}>
                {currentStep > i ? '✓' : currentStep === i ? '⏳' : (i + 1)} {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Verdict */}
      {dispute.aiVerdict && (
        <div style={{ padding: 16, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: isDark ? '#888' : '#64748b' }}>
            ⚖️ AI VERDICT
          </div>
          <div style={{
            padding: 20,
            borderRadius: 16,
            background: isDark ? 'rgba(102, 126, 234, 0.1)' : 'rgba(99, 102, 241, 0.05)',
            border: `1px solid ${isDark ? 'rgba(102, 126, 234, 0.2)' : 'rgba(99, 102, 241, 0.15)'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: dispute.aiVerdict.decision === 'split' ? '#f59e0b' :
                         dispute.aiVerdict.decision === 'release' ? '#22c55e' : '#ef4444',
                }}>
                  {dispute.aiVerdict.decision.toUpperCase()}
                </span>
                {dispute.aiVerdict.splitRatio && (
                  <span style={{ fontSize: 14, marginLeft: 12, color: isDark ? '#888' : '#64748b' }}>
                    ({dispute.aiVerdict.splitRatio.respondent}% Seller / {dispute.aiVerdict.splitRatio.claimant}% Buyer)
                  </span>
                )}
              </div>
              <div style={{
                padding: '6px 12px',
                borderRadius: 20,
                background: 'rgba(102, 126, 234, 0.15)',
                color: '#667eea',
                fontSize: 12,
                fontWeight: 600,
              }}>
                {Math.round(dispute.aiVerdict.confidence * 100)}% Confidence
              </div>
            </div>
            <div style={{ 
              fontSize: 13, 
              lineHeight: 1.7, 
              color: isDark ? '#a0a0b0' : '#4b5563',
              whiteSpace: 'pre-line',
            }}>
              {dispute.aiVerdict.reasoning}
            </div>
          </div>
        </div>
      )}

      {/* DAO Voting */}
      {dispute.status === 'dao_vote' && dispute.daoVotes && (
        <div style={{ padding: 16, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: isDark ? '#888' : '#64748b' }}>
            🗳️ DAO JURY VOTES
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <VoteBar label="Release to Seller" votes={dispute.daoVotes.release} color="#22c55e" isDark={isDark} />
            <VoteBar label="Refund to Buyer" votes={dispute.daoVotes.refund} color="#ef4444" isDark={isDark} />
            <VoteBar label="Split 50/50" votes={dispute.daoVotes.split} color="#f59e0b" isDark={isDark} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: 16, display: 'flex', gap: 12 }}>
        {dispute.status === 'pending' && (
          <button
            onClick={runAIArbitration}
            disabled={isAnalyzing}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            }}
          >
            🤖 Run AI Arbitration (Tier 1)
          </button>
        )}
        
        {dispute.status === 'ai_verdict' && (
          <>
            <button
              onClick={resetDispute}
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
              ✅ Accept Verdict
            </button>
            <button
              onClick={appealToDAO}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⚠️ Appeal to DAO (Tier 2)
            </button>
          </>
        )}

        {dispute.status === 'dao_vote' && (
          <button
            onClick={simulateDAOVote}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🗳️ Simulate DAO Voting
          </button>
        )}

        {dispute.status === 'resolved' && (
          <button
            onClick={resetDispute}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✅ Dispute Resolved - New Dispute
          </button>
        )}

        {/* Error display */}
        {error && (
          <div style={{ 
            flex: 1, 
            padding: '12px 16px', 
            borderRadius: 12, 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: '#ef4444', 
            fontSize: 13,
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status, isDark }: { status: DisputeCase['status']; isDark: boolean }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    not_started: { bg: 'rgba(100, 116, 139, 0.15)', color: '#64748b', label: 'Not Started' },
    pending: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: 'Pending Review' },
    ai_review: { bg: 'rgba(102, 126, 234, 0.15)', color: '#667eea', label: 'AI Analyzing' },
    ai_verdict: { bg: 'rgba(102, 126, 234, 0.15)', color: '#667eea', label: 'AI Verdict Rendered' },
    appealed: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'Appealed' },
    dao_vote: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: 'DAO Voting' },
    resolved: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', label: 'Resolved' },
  };
  const c = config[status] || config.not_started;
  return (
    <div style={{
      padding: '6px 12px',
      borderRadius: 20,
      background: c.bg,
      color: c.color,
      fontSize: 11,
      fontWeight: 600,
    }}>
      {c.label}
    </div>
  );
}

function PartyCard({ role, name, address, claim, isDark, align = 'left' }: {
  role: string;
  name: string;
  address: string;
  claim: string;
  isDark: boolean;
  align?: 'left' | 'right';
}) {
  return (
    <div style={{ textAlign: align }}>
      <div style={{ fontSize: 10, color: isDark ? '#666' : '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
        {role}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{name}</div>
      <div style={{ fontSize: 11, fontFamily: 'ui-monospace', color: isDark ? '#555' : '#94a3b8', marginBottom: 8 }}>
        {address.slice(0, 8)}...{address.slice(-6)}
      </div>
      <div style={{
        padding: 10,
        borderRadius: 10,
        background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
        fontSize: 12,
        lineHeight: 1.5,
        color: isDark ? '#a0a0b0' : '#4b5563',
        textAlign: 'left',
      }}>
        "{claim}"
      </div>
    </div>
  );
}

function VoteBar({ label, votes, color, isDark }: { label: string; votes: number; color: string; isDark: boolean }) {
  return (
    <div style={{
      padding: 12,
      borderRadius: 12,
      background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{votes}</div>
      <div style={{ fontSize: 11, color: isDark ? '#888' : '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
